#!/bin/bash

# 智游助手v6.2 P0任务执行脚本
# 基于首席技术架构师工作计划，执行P0优先级任务

set -e

# 设置脚本权限
chmod +x infrastructure/setup-environment.sh 2>/dev/null || true
chmod +x infrastructure/deploy-infrastructure.sh 2>/dev/null || true
chmod +x verify-setup.sh 2>/dev/null || true

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# 全局变量
START_TIME=$(date +%s)
TASK_RESULTS=()
FAILED_TASKS=()

# 记录任务结果
record_task_result() {
    local task_name="$1"
    local result="$2"
    local details="$3"
    
    TASK_RESULTS+=("$task_name:$result:$details")
    
    if [ "$result" = "FAIL" ]; then
        FAILED_TASKS+=("$task_name")
    fi
}

# 检查前置条件
check_prerequisites() {
    log_header "🔍 检查P0任务执行前置条件"
    log_header "=========================="
    echo ""
    
    # 检查脚本权限
    log_info "1️⃣ 检查脚本执行权限..."
    
    local required_scripts=(
        "infrastructure/setup-environment.sh"
        "infrastructure/deploy-infrastructure.sh"
        "verify-setup.sh"
    )
    
    local missing_permissions=()
    for script in "${required_scripts[@]}"; do
        if [[ -x "$script" ]]; then
            log_success "✅ $script 具有执行权限"
        else
            log_warning "⚠️ $script 缺少执行权限，正在设置..."
            chmod +x "$script"
            if [[ -x "$script" ]]; then
                log_success "✅ $script 权限设置成功"
            else
                log_error "❌ $script 权限设置失败"
                missing_permissions+=("$script")
            fi
        fi
    done
    
    if [[ ${#missing_permissions[@]} -eq 0 ]]; then
        record_task_result "脚本权限检查" "PASS" "所有脚本具有执行权限"
    else
        record_task_result "脚本权限检查" "FAIL" "权限设置失败: ${missing_permissions[*]}"
        return 1
    fi
    
    # 检查系统资源
    log_info "2️⃣ 检查系统资源..."
    
    # 检查内存
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [[ $available_memory -gt 4096 ]]; then
        log_success "✅ 可用内存充足: ${available_memory}MB"
    else
        log_warning "⚠️ 可用内存不足: ${available_memory}MB (建议>4GB)"
    fi
    
    # 检查磁盘空间
    local available_disk=$(df -h . | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ ${available_disk%.*} -gt 20 ]]; then
        log_success "✅ 可用磁盘空间充足: ${available_disk}"
    else
        log_warning "⚠️ 可用磁盘空间不足: ${available_disk} (建议>20GB)"
    fi
    
    record_task_result "系统资源检查" "PASS" "内存:${available_memory}MB, 磁盘:${available_disk}"
    
    echo ""
}

# P0任务1: 基础设施部署验证
execute_infrastructure_deployment() {
    log_header "🏗️ P0任务1: 基础设施部署验证"
    log_header "================================"
    echo ""
    
    local task_start_time=$(date +%s)
    
    # 步骤1: 环境准备
    log_info "步骤1: 执行环境准备脚本..."
    if ./infrastructure/setup-environment.sh; then
        log_success "✅ 环境准备完成"
        record_task_result "环境准备" "PASS" "setup-environment.sh执行成功"
    else
        log_error "❌ 环境准备失败"
        record_task_result "环境准备" "FAIL" "setup-environment.sh执行失败"
        return 1
    fi
    
    echo ""
    
    # 步骤2: 基础设施部署
    log_info "步骤2: 执行基础设施部署..."
    log_warning "注意: 基础设施部署可能需要2-4小时，请耐心等待..."
    
    # 创建部署日志文件
    local deploy_log="infrastructure_deployment_$(date +%Y%m%d_%H%M%S).log"
    
    if timeout 14400 ./infrastructure/deploy-infrastructure.sh 2>&1 | tee "$deploy_log"; then
        log_success "✅ 基础设施部署完成"
        record_task_result "基础设施部署" "PASS" "deploy-infrastructure.sh执行成功"
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            log_error "❌ 基础设施部署超时 (4小时)"
            record_task_result "基础设施部署" "FAIL" "部署超时"
        else
            log_error "❌ 基础设施部署失败 (退出码: $exit_code)"
            record_task_result "基础设施部署" "FAIL" "部署脚本执行失败"
        fi
        return 1
    fi
    
    echo ""
    
    # 步骤3: 服务可用性验证
    log_info "步骤3: 执行服务可用性验证..."
    if ./verify-setup.sh; then
        log_success "✅ 服务可用性验证通过"
        record_task_result "服务可用性验证" "PASS" "verify-setup.sh执行成功"
    else
        log_error "❌ 服务可用性验证失败"
        record_task_result "服务可用性验证" "FAIL" "verify-setup.sh执行失败"
        return 1
    fi
    
    local task_end_time=$(date +%s)
    local task_duration=$((task_end_time - task_start_time))
    
    log_success "🎉 P0任务1完成，耗时: ${task_duration}秒"
    echo ""
}

# P0任务2: CI/CD Pipeline端到端验证
execute_cicd_validation() {
    log_header "🔄 P0任务2: CI/CD Pipeline端到端验证"
    log_header "===================================="
    echo ""
    
    local task_start_time=$(date +%s)
    
    # 步骤1: 检查GitLab服务状态
    log_info "步骤1: 检查GitLab服务状态..."
    
    local gitlab_url="https://gitlab.smarttravel.local"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -k -f "$gitlab_url/users/sign_in" &>/dev/null; then
            log_success "✅ GitLab服务正常访问"
            record_task_result "GitLab服务检查" "PASS" "GitLab正常响应"
            break
        else
            log_info "GitLab服务检查 (尝试 $attempt/$max_attempts)..."
            sleep 30
            ((attempt++))
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "❌ GitLab服务不可访问"
        record_task_result "GitLab服务检查" "FAIL" "GitLab无法访问"
        return 1
    fi
    
    # 步骤2: 检查Harbor服务状态
    log_info "步骤2: 检查Harbor服务状态..."
    
    local harbor_url="https://harbor.smarttravel.local"
    if curl -k -f "$harbor_url/api/v2.0/health" &>/dev/null; then
        log_success "✅ Harbor服务正常访问"
        record_task_result "Harbor服务检查" "PASS" "Harbor正常响应"
    else
        log_error "❌ Harbor服务不可访问"
        record_task_result "Harbor服务检查" "FAIL" "Harbor无法访问"
        return 1
    fi
    
    # 步骤3: 检查K8s集群状态
    log_info "步骤3: 检查K8s集群状态..."
    
    if command -v kubectl &>/dev/null; then
        if kubectl get nodes &>/dev/null; then
            local ready_nodes=$(kubectl get nodes --no-headers | grep " Ready " | wc -l)
            local total_nodes=$(kubectl get nodes --no-headers | wc -l)
            
            if [[ $ready_nodes -eq $total_nodes ]] && [[ $total_nodes -gt 0 ]]; then
                log_success "✅ K8s集群状态正常: $ready_nodes/$total_nodes 节点就绪"
                record_task_result "K8s集群检查" "PASS" "$ready_nodes/$total_nodes 节点就绪"
            else
                log_error "❌ K8s集群状态异常: $ready_nodes/$total_nodes 节点就绪"
                record_task_result "K8s集群检查" "FAIL" "节点状态异常"
                return 1
            fi
        else
            log_error "❌ 无法连接到K8s集群"
            record_task_result "K8s集群检查" "FAIL" "kubectl连接失败"
            return 1
        fi
    else
        log_warning "⚠️ kubectl未安装，跳过K8s集群检查"
        record_task_result "K8s集群检查" "SKIP" "kubectl未安装"
    fi
    
    # 步骤4: 验证CI/CD配置文件
    log_info "步骤4: 验证CI/CD配置文件..."
    
    if [[ -f ".gitlab-ci.yml" ]]; then
        log_success "✅ GitLab CI配置文件存在"
        
        # 检查CI阶段配置
        local ci_stages=("validate" "test" "security" "build" "deploy")
        local missing_stages=()
        
        for stage in "${ci_stages[@]}"; do
            if grep -q "stage: $stage" ".gitlab-ci.yml"; then
                log_success "   └─ CI阶段存在: $stage"
            else
                log_warning "   └─ CI阶段可能缺失: $stage"
                missing_stages+=("$stage")
            fi
        done
        
        if [[ ${#missing_stages[@]} -eq 0 ]]; then
            record_task_result "CI配置验证" "PASS" "所有CI阶段配置完整"
        else
            record_task_result "CI配置验证" "WARN" "可能缺失阶段: ${missing_stages[*]}"
        fi
    else
        log_error "❌ GitLab CI配置文件缺失"
        record_task_result "CI配置验证" "FAIL" ".gitlab-ci.yml文件不存在"
        return 1
    fi
    
    local task_end_time=$(date +%s)
    local task_duration=$((task_end_time - task_start_time))
    
    log_success "🎉 P0任务2完成，耗时: ${task_duration}秒"
    echo ""
}

# P0任务3: 监控告警系统验证
execute_monitoring_validation() {
    log_header "📊 P0任务3: 监控告警系统验证"
    log_header "==============================="
    echo ""
    
    local task_start_time=$(date +%s)
    
    # 步骤1: 检查现有监控系统
    log_info "步骤1: 检查现有监控系统..."
    
    # 检查Prometheus
    if curl -f http://localhost:9090/api/v1/query?query=up &>/dev/null; then
        log_success "✅ 现有Prometheus服务正常"
        record_task_result "现有Prometheus" "PASS" "Prometheus API响应正常"
    else
        log_warning "⚠️ 现有Prometheus服务不可访问"
        record_task_result "现有Prometheus" "WARN" "Prometheus API无响应"
    fi
    
    # 检查Grafana
    if curl -f http://localhost:3002/api/health &>/dev/null; then
        log_success "✅ 现有Grafana服务正常"
        record_task_result "现有Grafana" "PASS" "Grafana API响应正常"
    else
        log_warning "⚠️ 现有Grafana服务不可访问"
        record_task_result "现有Grafana" "WARN" "Grafana API无响应"
    fi
    
    # 步骤2: 检查监控组件文件
    log_info "步骤2: 检查监控组件文件..."
    
    local monitoring_components=(
        "src/lib/monitoring/MetricsRegistry.ts"
        "src/lib/monitoring/MetricsCollector.ts"
        "src/lib/monitoring/ErrorHandler.ts"
    )
    
    local missing_components=()
    for component in "${monitoring_components[@]}"; do
        if [[ -f "$component" ]]; then
            log_success "✅ 监控组件存在: $(basename $component)"
        else
            log_error "❌ 监控组件缺失: $component"
            missing_components+=("$component")
        fi
    done
    
    if [[ ${#missing_components[@]} -eq 0 ]]; then
        record_task_result "监控组件检查" "PASS" "所有监控组件存在"
    else
        record_task_result "监控组件检查" "FAIL" "缺失组件: ${missing_components[*]}"
    fi
    
    # 步骤3: 检查K8s监控配置
    log_info "步骤3: 检查K8s监控配置..."
    
    if [[ -f "infrastructure/monitoring/prometheus-k8s-config.yaml" ]]; then
        log_success "✅ K8s监控配置文件存在"
        
        # 检查配置内容
        if grep -q "kubernetes-pods\|kubernetes-nodes" "infrastructure/monitoring/prometheus-k8s-config.yaml"; then
            log_success "   └─ K8s服务发现配置完整"
            record_task_result "K8s监控配置" "PASS" "配置文件完整"
        else
            log_warning "   └─ K8s服务发现配置可能不完整"
            record_task_result "K8s监控配置" "WARN" "配置可能不完整"
        fi
    else
        log_error "❌ K8s监控配置文件缺失"
        record_task_result "K8s监控配置" "FAIL" "配置文件不存在"
    fi
    
    local task_end_time=$(date +%s)
    local task_duration=$((task_end_time - task_start_time))
    
    log_success "🎉 P0任务3完成，耗时: ${task_duration}秒"
    echo ""
}

# 生成P0任务执行报告
generate_p0_report() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    log_header "📋 P0任务执行报告"
    log_header "=================="
    echo ""
    
    log_info "执行总时间: ${total_duration}秒 ($(($total_duration / 60))分钟)"
    log_info "任务总数: ${#TASK_RESULTS[@]}"
    log_info "失败任务数: ${#FAILED_TASKS[@]}"
    echo ""
    
    # 按类别显示结果
    log_header "📊 任务执行结果:"
    echo ""
    
    local pass_count=0
    local fail_count=0
    local warn_count=0
    local skip_count=0
    
    for result in "${TASK_RESULTS[@]}"; do
        IFS=':' read -r task_name status details <<< "$result"
        
        case $status in
            "PASS")
                log_success "✅ $task_name: $details"
                ((pass_count++))
                ;;
            "FAIL")
                log_error "❌ $task_name: $details"
                ((fail_count++))
                ;;
            "WARN")
                log_warning "⚠️ $task_name: $details"
                ((warn_count++))
                ;;
            "SKIP")
                log_info "⏭️ $task_name: $details"
                ((skip_count++))
                ;;
        esac
    done
    
    echo ""
    log_header "📈 执行统计:"
    echo "   通过: $pass_count"
    echo "   失败: $fail_count"
    echo "   警告: $warn_count"
    echo "   跳过: $skip_count"
    echo ""
    
    # 总体评估
    if [[ $fail_count -eq 0 ]]; then
        if [[ $warn_count -eq 0 ]]; then
            log_success "🎉 所有P0任务执行成功！可以开始P1任务。"
        else
            log_warning "⚠️ P0任务基本完成，但有 $warn_count 个警告需要关注。"
        fi
    else
        log_error "❌ 发现 $fail_count 个关键问题需要解决后再继续。"
    fi
    
    # 下一步建议
    echo ""
    log_header "🚀 下一步建议:"
    
    if [[ $fail_count -eq 0 ]]; then
        echo "1. 开始执行P1任务：性能基准测试和运维体系建立"
        echo "2. 监控系统运行状态，确保稳定性"
        echo "3. 准备生产环境上线计划"
    else
        echo "1. 解决上述失败的任务"
        echo "2. 重新运行P0任务验证"
        echo "3. 确认所有问题解决后再进行下一步"
    fi
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 P0任务执行"
    echo "=========================="
    echo "基于首席技术架构师工作计划执行P0优先级任务"
    echo ""
    
    # 检查前置条件
    if ! check_prerequisites; then
        log_error "❌ 前置条件检查失败，无法继续执行"
        exit 1
    fi
    
    # 执行P0任务
    log_info "开始执行P0任务，预计耗时3-5小时..."
    echo ""
    
    # 任务1: 基础设施部署验证
    if ! execute_infrastructure_deployment; then
        log_error "❌ P0任务1失败，停止后续任务执行"
        generate_p0_report
        exit 1
    fi
    
    # 任务2: CI/CD Pipeline端到端验证
    if ! execute_cicd_validation; then
        log_error "❌ P0任务2失败，但继续执行任务3"
    fi
    
    # 任务3: 监控告警系统验证
    if ! execute_monitoring_validation; then
        log_error "❌ P0任务3失败"
    fi
    
    # 生成执行报告
    generate_p0_report
}

# 执行主函数
main "$@"
