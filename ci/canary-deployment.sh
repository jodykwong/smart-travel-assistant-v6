#!/bin/bash

# 智游助手v6.2 金丝雀发布脚本
# Week 5-6: CD Pipeline构建 - 金丝雀发布策略

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 配置变量
NAMESPACE="smart-travel-production"
APP_NAME="smart-travel-assistant"
CHART_VERSION=${1:-"6.2.0"}
IMAGE_TAG=${2:-"latest"}
HARBOR_REGISTRY="harbor.smarttravel.local"
HARBOR_PROJECT="smart-travel"

# 金丝雀发布配置
CANARY_RELEASE="${APP_NAME}-canary"
STABLE_RELEASE="${APP_NAME}-stable"
MAIN_SERVICE="${APP_NAME}"

# 金丝雀发布阶段配置
CANARY_STAGES=(10 25 50 75 100)
STAGE_DURATION=300  # 每个阶段持续5分钟

# 监控指标阈值
SUCCESS_RATE_THRESHOLD=0.99
ERROR_RATE_THRESHOLD=0.01
RESPONSE_TIME_THRESHOLD=5.0

# 获取当前金丝雀权重
get_canary_weight() {
    local weight=$(kubectl get ingress $CANARY_RELEASE -n $NAMESPACE -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/canary-weight}' 2>/dev/null || echo "0")
    echo "$weight"
}

# 设置金丝雀权重
set_canary_weight() {
    local weight=$1
    
    log_info "设置金丝雀权重为 ${weight}%..."
    
    # 更新Ingress注解
    kubectl patch ingress $CANARY_RELEASE -n $NAMESPACE -p "{\"metadata\":{\"annotations\":{\"nginx.ingress.kubernetes.io/canary-weight\":\"$weight\"}}}"
    
    # 验证权重设置
    sleep 5
    local current_weight=$(get_canary_weight)
    if [ "$current_weight" = "$weight" ]; then
        log_success "✅ 金丝雀权重已设置为 ${weight}%"
        return 0
    else
        log_error "❌ 金丝雀权重设置失败"
        return 1
    fi
}

# 部署金丝雀版本
deploy_canary() {
    local image_tag=$1
    
    log_info "🚀 部署金丝雀版本..."
    
    # 使用Helm部署金丝雀版本
    helm upgrade --install $CANARY_RELEASE oci://$HARBOR_REGISTRY/$HARBOR_PROJECT/smart-travel-assistant \
        --version $CHART_VERSION \
        --namespace $NAMESPACE \
        --create-namespace \
        --values helm/smart-travel/values-production.yaml \
        --set app.image.tag="$image_tag" \
        --set global.imageRegistry="$HARBOR_REGISTRY" \
        --set global.imageProject="$HARBOR_PROJECT" \
        --set app.replicaCount=2 \
        --set deployment.strategy="Recreate" \
        --set ingress.annotations."nginx\.ingress\.kubernetes\.io/canary"="true" \
        --set ingress.annotations."nginx\.ingress\.kubernetes\.io/canary-weight"="0" \
        --wait --timeout=600s
    
    # 验证金丝雀部署
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$CANARY_RELEASE --no-headers | grep "Running" | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$CANARY_RELEASE --no-headers | wc -l)
    
    if [ "$ready_pods" -ne "$total_pods" ] || [ "$total_pods" -eq 0 ]; then
        log_error "❌ 金丝雀版本部署失败: $ready_pods/$total_pods Pod就绪"
        return 1
    fi
    
    log_success "✅ 金丝雀版本部署完成: $ready_pods/$total_pods Pod就绪"
    return 0
}

# 监控金丝雀指标
monitor_canary_metrics() {
    local duration=$1
    
    log_info "📊 监控金丝雀指标 ${duration}秒..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        # 查询Prometheus指标
        local prometheus_url="http://prometheus:9090/api/v1/query"
        
        # 成功率检查
        local success_rate=$(curl -s "${prometheus_url}?query=rate(smart_travel_http_requests_total{status=~\"2..\",version=\"canary\"}[5m])/rate(smart_travel_http_requests_total{version=\"canary\"}[5m])" | jq -r '.data.result[0].value[1] // "1"')
        
        # 错误率检查
        local error_rate=$(curl -s "${prometheus_url}?query=rate(smart_travel_http_requests_total{status=~\"5..\",version=\"canary\"}[5m])/rate(smart_travel_http_requests_total{version=\"canary\"}[5m])" | jq -r '.data.result[0].value[1] // "0"')
        
        # 响应时间检查
        local response_time=$(curl -s "${prometheus_url}?query=histogram_quantile(0.95,rate(smart_travel_http_request_duration_seconds_bucket{version=\"canary\"}[5m]))" | jq -r '.data.result[0].value[1] // "0"')
        
        log_info "指标 - 成功率: $success_rate, 错误率: $error_rate, 响应时间: ${response_time}s"
        
        # 检查指标是否超过阈值
        if (( $(echo "$success_rate < $SUCCESS_RATE_THRESHOLD" | bc -l) )); then
            log_error "❌ 成功率过低: $success_rate < $SUCCESS_RATE_THRESHOLD"
            return 1
        fi
        
        if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
            log_error "❌ 错误率过高: $error_rate > $ERROR_RATE_THRESHOLD"
            return 1
        fi
        
        if (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            log_error "❌ 响应时间过长: $response_time > $RESPONSE_TIME_THRESHOLD"
            return 1
        fi
        
        sleep 30
    done
    
    log_success "✅ 金丝雀指标监控通过"
    return 0
}

# 执行金丝雀发布
execute_canary_deployment() {
    local image_tag=$1
    
    log_info "🐤 开始金丝雀发布流程..."
    
    # 部署金丝雀版本
    if ! deploy_canary "$image_tag"; then
        log_error "❌ 金丝雀版本部署失败"
        return 1
    fi
    
    # 逐步增加流量
    for stage in "${CANARY_STAGES[@]}"; do
        log_info "📈 金丝雀发布阶段: ${stage}%流量"
        
        # 设置流量权重
        if ! set_canary_weight "$stage"; then
            log_error "❌ 设置金丝雀权重失败"
            rollback_canary
            return 1
        fi
        
        # 监控指标
        if ! monitor_canary_metrics "$STAGE_DURATION"; then
            log_error "❌ 金丝雀指标监控失败，执行回滚"
            rollback_canary
            return 1
        fi
        
        log_success "✅ 金丝雀发布阶段 ${stage}% 完成"
        
        # 如果是100%，完成发布
        if [ "$stage" = "100" ]; then
            complete_canary_deployment
            return 0
        fi
    done
}

# 完成金丝雀发布
complete_canary_deployment() {
    log_info "🎉 完成金丝雀发布..."
    
    # 将稳定版本更新为金丝雀版本
    local canary_image=$(kubectl get deployment $CANARY_RELEASE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    # 更新稳定版本
    kubectl set image deployment/$STABLE_RELEASE container-name="$canary_image" -n $NAMESPACE
    kubectl rollout status deployment/$STABLE_RELEASE -n $NAMESPACE
    
    # 将流量切回稳定版本
    kubectl patch ingress $CANARY_RELEASE -n $NAMESPACE -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary":"false"}}}'
    
    # 清理金丝雀版本
    helm uninstall $CANARY_RELEASE -n $NAMESPACE
    
    log_success "✅ 金丝雀发布完成，新版本已成为稳定版本"
}

# 回滚金丝雀发布
rollback_canary() {
    log_error "🔄 回滚金丝雀发布..."
    
    # 将金丝雀流量设置为0
    set_canary_weight "0"
    
    # 删除金丝雀版本
    helm uninstall $CANARY_RELEASE -n $NAMESPACE
    
    log_success "✅ 金丝雀发布已回滚"
}

# 主函数
main() {
    local chart_version=$1
    local image_tag=$2
    
    if [ -z "$chart_version" ] || [ -z "$image_tag" ]; then
        log_error "❌ 请提供Chart版本和镜像标签"
        echo "用法: $0 <chart_version> <image_tag>"
        exit 1
    fi
    
    echo "🐤 智游助手v6.2 金丝雀发布"
    echo "=========================="
    echo "Chart版本: $chart_version"
    echo "镜像标签: $image_tag"
    echo ""
    
    # 登录Harbor
    helm registry login $HARBOR_REGISTRY -u $HARBOR_USERNAME -p $HARBOR_PASSWORD
    
    # 执行金丝雀发布
    if execute_canary_deployment "$image_tag"; then
        log_success "🎉 金丝雀发布成功完成！"
        exit 0
    else
        log_error "❌ 金丝雀发布失败"
        exit 1
    fi
}

# 执行主函数
main "$@"
