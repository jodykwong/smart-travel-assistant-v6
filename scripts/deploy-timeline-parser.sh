#!/bin/bash

# 时间线解析器生产环境部署脚本
# 支持灰度发布和自动回滚

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
ROLLOUT_PERCENTAGE="${ROLLOUT_PERCENTAGE:-5}"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_THRESHOLD_ERROR_RATE=1.0
ROLLBACK_THRESHOLD_RESPONSE_TIME=200

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 错误处理
handle_error() {
    log_error "部署失败，执行回滚..."
    rollback_deployment
    exit 1
}

trap 'handle_error' ERR

# 检查部署前置条件
check_prerequisites() {
    log_info "检查部署前置条件..."
    
    # 检查必要的工具
    command -v npm >/dev/null 2>&1 || { log_error "npm 未安装"; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl 未安装"; exit 1; }
    command -v curl >/dev/null 2>&1 || { log_error "curl 未安装"; exit 1; }
    
    # 检查环境变量
    if [[ -z "$DEPLOYMENT_ENV" ]]; then
        log_error "DEPLOYMENT_ENV 环境变量未设置"
        exit 1
    fi
    
    # 检查Kubernetes连接
    kubectl cluster-info >/dev/null 2>&1 || { log_error "无法连接到Kubernetes集群"; exit 1; }
    
    log_success "前置条件检查通过"
}

# 运行测试
run_tests() {
    log_info "运行测试套件..."
    
    cd "$PROJECT_ROOT"
    
    # 单元测试
    log_info "运行单元测试..."
    npm test -- --run src/services/parsers
    
    # 集成测试
    log_info "运行集成测试..."
    npm test -- --run src/tests/integration
    
    # 性能测试
    log_info "运行性能测试..."
    npm run test:performance
    
    log_success "所有测试通过"
}

# 构建应用
build_application() {
    log_info "构建应用..."
    
    cd "$PROJECT_ROOT"
    
    # 安装依赖
    npm ci --production=false
    
    # 运行构建
    npm run build
    
    # 验证构建结果
    if [[ ! -d ".next" ]]; then
        log_error "构建失败，.next 目录不存在"
        exit 1
    fi
    
    log_success "应用构建完成"
}

# 部署到Kubernetes
deploy_to_kubernetes() {
    log_info "部署到Kubernetes..."
    
    # 设置环境变量
    kubectl set env deployment/smart-travel-assistant \
        NEXT_PUBLIC_ENABLE_NEW_PARSER=false \
        NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE="$ROLLOUT_PERCENTAGE" \
        --namespace="$DEPLOYMENT_ENV"
    
    # 更新部署
    kubectl rollout restart deployment/smart-travel-assistant --namespace="$DEPLOYMENT_ENV"
    
    # 等待部署完成
    kubectl rollout status deployment/smart-travel-assistant --namespace="$DEPLOYMENT_ENV" --timeout=300s
    
    log_success "Kubernetes部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local endpoint="https://smart-travel-assistant.com/api/health"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "健康检查尝试 $attempt/$max_attempts..."
        
        if curl -f -s "$endpoint" >/dev/null; then
            log_success "健康检查通过"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败"
    return 1
}

# 功能验证
functional_verification() {
    log_info "执行功能验证..."
    
    # 运行E2E测试的子集
    npm run test:e2e:smoke
    
    # 验证解析器功能
    local test_endpoint="https://smart-travel-assistant.com/api/test/timeline-parser"
    local test_payload='{"content":"- **上午**\n  - 测试活动","destination":"测试城市"}'
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_payload" \
        "$test_endpoint")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "功能验证通过"
    else
        log_error "功能验证失败: $response"
        return 1
    fi
}

# 监控指标检查
check_metrics() {
    log_info "检查监控指标..."
    
    local metrics_endpoint="https://smart-travel-assistant.com/api/metrics"
    local max_wait=300  # 5分钟
    local wait_time=0
    
    while [[ $wait_time -lt $max_wait ]]; do
        local metrics=$(curl -s "$metrics_endpoint")
        
        # 检查错误率
        local error_rate=$(echo "$metrics" | grep "timeline_parse_error_rate" | awk '{print $2}')
        if [[ $(echo "$error_rate > $ROLLBACK_THRESHOLD_ERROR_RATE" | bc -l) -eq 1 ]]; then
            log_error "错误率过高: $error_rate%"
            return 1
        fi
        
        # 检查响应时间
        local response_time=$(echo "$metrics" | grep "timeline_parse_response_time_p95" | awk '{print $2}')
        if [[ $(echo "$response_time > $ROLLBACK_THRESHOLD_RESPONSE_TIME" | bc -l) -eq 1 ]]; then
            log_error "响应时间过长: ${response_time}ms"
            return 1
        fi
        
        log_info "指标正常 - 错误率: $error_rate%, 响应时间: ${response_time}ms"
        sleep 30
        ((wait_time += 30))
    done
    
    log_success "监控指标检查通过"
}

# 灰度发布
gradual_rollout() {
    log_info "开始灰度发布，当前比例: $ROLLOUT_PERCENTAGE%"
    
    # 阶段1: 5%
    if [[ "$ROLLOUT_PERCENTAGE" -ge 5 ]]; then
        log_info "阶段1: 5%用户启用新解析器"
        kubectl set env deployment/smart-travel-assistant \
            NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE=5 \
            --namespace="$DEPLOYMENT_ENV"
        
        sleep 60  # 等待1分钟
        check_metrics || return 1
        log_success "阶段1完成"
    fi
    
    # 阶段2: 25%
    if [[ "$ROLLOUT_PERCENTAGE" -ge 25 ]]; then
        log_info "阶段2: 25%用户启用新解析器"
        kubectl set env deployment/smart-travel-assistant \
            NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE=25 \
            --namespace="$DEPLOYMENT_ENV"
        
        sleep 300  # 等待5分钟
        check_metrics || return 1
        log_success "阶段2完成"
    fi
    
    # 阶段3: 50%
    if [[ "$ROLLOUT_PERCENTAGE" -ge 50 ]]; then
        log_info "阶段3: 50%用户启用新解析器"
        kubectl set env deployment/smart-travel-assistant \
            NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE=50 \
            --namespace="$DEPLOYMENT_ENV"
        
        sleep 600  # 等待10分钟
        check_metrics || return 1
        log_success "阶段3完成"
    fi
    
    # 阶段4: 100%
    if [[ "$ROLLOUT_PERCENTAGE" -ge 100 ]]; then
        log_info "阶段4: 100%用户启用新解析器"
        kubectl set env deployment/smart-travel-assistant \
            NEXT_PUBLIC_ENABLE_NEW_PARSER=true \
            NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE=100 \
            --namespace="$DEPLOYMENT_ENV"
        
        sleep 600  # 等待10分钟
        check_metrics || return 1
        log_success "阶段4完成 - 全量发布成功"
    fi
}

# 回滚部署
rollback_deployment() {
    log_warning "执行回滚操作..."
    
    # 关闭新解析器
    kubectl set env deployment/smart-travel-assistant \
        NEXT_PUBLIC_ENABLE_NEW_PARSER=false \
        NEXT_PUBLIC_PARSER_ROLLOUT_PERCENTAGE=0 \
        --namespace="$DEPLOYMENT_ENV"
    
    # 等待回滚完成
    kubectl rollout status deployment/smart-travel-assistant --namespace="$DEPLOYMENT_ENV" --timeout=300s
    
    # 验证回滚效果
    sleep 30
    health_check
    
    # 发送回滚通知
    send_notification "ROLLBACK" "时间线解析器已回滚到稳定版本"
    
    log_success "回滚完成"
}

# 发送通知
send_notification() {
    local event_type="$1"
    local message="$2"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$event_type] $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    if [[ -n "$EMAIL_NOTIFICATION_ENDPOINT" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"subject\":\"[$event_type] 时间线解析器部署\",\"message\":\"$message\"}" \
            "$EMAIL_NOTIFICATION_ENDPOINT"
    fi
}

# 主部署流程
main() {
    log_info "开始时间线解析器部署流程..."
    log_info "环境: $DEPLOYMENT_ENV"
    log_info "灰度比例: $ROLLOUT_PERCENTAGE%"
    
    # 1. 检查前置条件
    check_prerequisites
    
    # 2. 运行测试
    run_tests
    
    # 3. 构建应用
    build_application
    
    # 4. 部署到Kubernetes
    deploy_to_kubernetes
    
    # 5. 健康检查
    health_check
    
    # 6. 功能验证
    functional_verification
    
    # 7. 灰度发布
    gradual_rollout
    
    # 8. 发送成功通知
    send_notification "SUCCESS" "时间线解析器部署成功，灰度比例: $ROLLOUT_PERCENTAGE%"
    
    log_success "部署完成！"
    log_info "监控仪表板: https://monitoring.company.com/timeline-parser"
    log_info "日志查看: kubectl logs -f deployment/smart-travel-assistant -n $DEPLOYMENT_ENV"
}

# 显示帮助信息
show_help() {
    cat << EOF
时间线解析器部署脚本

用法: $0 [选项]

选项:
    -e, --env ENV           部署环境 (默认: production)
    -p, --percentage NUM    灰度发布比例 (默认: 5)
    -h, --help             显示帮助信息
    --rollback             执行回滚操作
    --health-check         仅执行健康检查
    --dry-run              模拟运行，不执行实际部署

示例:
    $0                                    # 默认部署到生产环境，5%灰度
    $0 -e staging -p 100                  # 部署到测试环境，100%发布
    $0 --rollback                         # 执行回滚
    $0 --health-check                     # 仅健康检查

环境变量:
    DEPLOYMENT_ENV                        部署环境
    ROLLOUT_PERCENTAGE                    灰度发布比例
    SLACK_WEBHOOK_URL                     Slack通知URL
    EMAIL_NOTIFICATION_ENDPOINT           邮件通知端点
EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        -p|--percentage)
            ROLLOUT_PERCENTAGE="$2"
            shift 2
            ;;
        --rollback)
            rollback_deployment
            exit 0
            ;;
        --health-check)
            health_check
            exit 0
            ;;
        --dry-run)
            log_info "模拟运行模式"
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主流程
if [[ "$DRY_RUN" == "true" ]]; then
    log_info "这是一次模拟运行，不会执行实际的部署操作"
    log_info "将要执行的操作:"
    log_info "1. 检查前置条件"
    log_info "2. 运行测试套件"
    log_info "3. 构建应用"
    log_info "4. 部署到 $DEPLOYMENT_ENV 环境"
    log_info "5. 灰度发布到 $ROLLOUT_PERCENTAGE%"
else
    main
fi
