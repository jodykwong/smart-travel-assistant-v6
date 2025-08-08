#!/bin/bash

# 智游助手v6.2 Helm蓝绿部署脚本
# Week 5-6: CD Pipeline构建 - Helm标准化蓝绿部署

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
CHART_VERSION=${1:-"6.2.0"}
IMAGE_TAG=${2:-"latest"}
HARBOR_REGISTRY="harbor.smarttravel.local"
HARBOR_PROJECT="smart-travel"
CHART_NAME="smart-travel-assistant"
RELEASE_NAME="smart-travel"

# Helm配置
HELM_CHART_URL="oci://${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${CHART_NAME}"
VALUES_FILE="helm/smart-travel/values-production.yaml"

# 蓝绿部署配置
BLUE_RELEASE="${RELEASE_NAME}-blue"
GREEN_RELEASE="${RELEASE_NAME}-green"
MAIN_RELEASE="${RELEASE_NAME}"

# 监控配置
VALIDATION_TIMEOUT=300
SWITCH_TIMEOUT=60

# 获取当前活跃环境
get_active_environment() {
    # 检查主服务的选择器
    local current_selector=$(kubectl get service $MAIN_RELEASE -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [ "$current_selector" = "blue" ]; then
        echo "blue"
    elif [ "$current_selector" = "green" ]; then
        echo "green"
    else
        # 检查哪个环境有运行的Pod
        local blue_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$BLUE_RELEASE --no-headers 2>/dev/null | wc -l)
        local green_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$GREEN_RELEASE --no-headers 2>/dev/null | wc -l)
        
        if [ "$blue_pods" -gt 0 ] && [ "$green_pods" -eq 0 ]; then
            echo "blue"
        elif [ "$green_pods" -gt 0 ] && [ "$blue_pods" -eq 0 ]; then
            echo "green"
        else
            echo "none"
        fi
    fi
}

# 获取目标环境
get_target_environment() {
    local active_env=$(get_active_environment)
    
    if [ "$active_env" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# 使用Helm部署到目标环境
helm_deploy_to_environment() {
    local env=$1
    local release_name="${RELEASE_NAME}-${env}"
    
    log_info "🚀 使用Helm部署到${env}环境..."
    
    # 创建环境特定的values文件
    local temp_values="/tmp/values-${env}.yaml"
    cp "$VALUES_FILE" "$temp_values"
    
    # 添加环境特定配置
    cat >> "$temp_values" <<EOF

# 蓝绿部署环境特定配置
app:
  image:
    tag: "${IMAGE_TAG}"

global:
  imageRegistry: "${HARBOR_REGISTRY}"
  imageProject: "${HARBOR_PROJECT}"

# 环境标识
deployment:
  environment: "${env}"
  labels:
    version: "${env}"

# 服务选择器
service:
  selector:
    version: "${env}"

# 支付系统保护
deployment:
  paymentProtection:
    enabled: true
    strategy: "blue-green"
    environment: "${env}"
EOF
    
    # 执行Helm部署
    helm upgrade --install "$release_name" "$HELM_CHART_URL" \
        --version "$CHART_VERSION" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --values "$temp_values" \
        --set app.image.tag="$IMAGE_TAG" \
        --set global.imageRegistry="$HARBOR_REGISTRY" \
        --set global.imageProject="$HARBOR_PROJECT" \
        --set deployment.environment="$env" \
        --wait --timeout=600s
    
    # 清理临时文件
    rm -f "$temp_values"
    
    # 验证部署状态
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$release_name --no-headers | grep "Running" | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$release_name --no-headers | wc -l)
    
    if [ "$ready_pods" -ne "$total_pods" ] || [ "$total_pods" -eq 0 ]; then
        log_error "❌ ${env}环境Helm部署失败: $ready_pods/$total_pods Pod就绪"
        return 1
    fi
    
    log_success "✅ ${env}环境Helm部署完成: $ready_pods/$total_pods Pod就绪"
    return 0
}

# 验证环境健康状态
validate_environment() {
    local env=$1
    local release_name="${RELEASE_NAME}-${env}"
    local service_name="${release_name}"
    
    log_info "🏥 验证${env}环境健康状态..."
    
    # 等待Pod就绪
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance=$release_name -n $NAMESPACE --timeout=300s
    
    # 健康检查
    local health_check_url="http://${service_name}.${NAMESPACE}.svc.cluster.local:3000/api/health"
    if ! kubectl run health-check-${env}-${RANDOM} --rm -i --restart=Never --image=curlimages/curl -- curl -f "$health_check_url" > /dev/null 2>&1; then
        log_error "❌ ${env}环境健康检查失败"
        return 1
    fi
    
    # 监控指标检查
    local metrics_url="http://${service_name}.${NAMESPACE}.svc.cluster.local:3000/api/metrics"
    if ! kubectl run metrics-check-${env}-${RANDOM} --rm -i --restart=Never --image=curlimages/curl -- curl -f "$metrics_url" > /dev/null 2>&1; then
        log_error "❌ ${env}环境监控指标检查失败"
        return 1
    fi
    
    # 支付系统特殊检查
    local payment_test_url="http://${service_name}.${NAMESPACE}.svc.cluster.local:3000/api/payment/test"
    if ! kubectl run payment-check-${env}-${RANDOM} --rm -i --restart=Never --image=curlimages/curl -- curl -f "$payment_test_url" > /dev/null 2>&1; then
        log_error "❌ ${env}环境支付系统检查失败"
        return 1
    fi
    
    log_success "✅ ${env}环境健康状态验证通过"
    return 0
}

# 切换流量到目标环境
switch_traffic() {
    local target_env=$1
    local target_release="${RELEASE_NAME}-${target_env}"
    
    log_info "🔄 切换流量到${target_env}环境..."
    
    # 更新主服务选择器
    kubectl patch service $MAIN_RELEASE -n $NAMESPACE -p '{"spec":{"selector":{"app.kubernetes.io/instance":"'$target_release'"}}}'
    
    # 验证流量切换
    sleep 10
    local current_selector=$(kubectl get service $MAIN_RELEASE -n $NAMESPACE -o jsonpath='{.spec.selector.app\.kubernetes\.io/instance}')
    
    if [ "$current_selector" = "$target_release" ]; then
        log_success "✅ 流量已切换到${target_env}环境"
        return 0
    else
        log_error "❌ 流量切换失败，当前选择器: $current_selector"
        return 1
    fi
}

# 渐进式流量切换（使用Ingress权重）
gradual_traffic_switch() {
    local target_env=$1
    local target_release="${RELEASE_NAME}-${target_env}"
    
    log_info "📈 执行渐进式流量切换到${target_env}环境..."
    
    # 阶段1: 10%流量到新环境
    log_info "阶段1: 切换10%流量到${target_env}环境..."
    kubectl patch ingress ${target_release} -n $NAMESPACE -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"10"}}}'
    
    # 监控30秒
    sleep 30
    if ! validate_environment $target_env; then
        log_error "❌ 阶段1验证失败，停止切换"
        return 1
    fi
    
    # 阶段2: 50%流量到新环境
    log_info "阶段2: 切换50%流量到${target_env}环境..."
    kubectl patch ingress ${target_release} -n $NAMESPACE -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'
    
    sleep 60
    if ! validate_environment $target_env; then
        log_error "❌ 阶段2验证失败，停止切换"
        return 1
    fi
    
    # 阶段3: 100%流量到新环境
    log_info "阶段3: 切换100%流量到${target_env}环境..."
    if ! switch_traffic $target_env; then
        log_error "❌ 最终流量切换失败"
        return 1
    fi
    
    # 禁用金丝雀
    kubectl patch ingress ${target_release} -n $NAMESPACE -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary":"false"}}}'
    
    log_success "✅ 渐进式流量切换完成"
    return 0
}

# 清理旧环境
cleanup_old_environment() {
    local old_env=$1
    local old_release="${RELEASE_NAME}-${old_env}"
    
    log_info "🧹 清理${old_env}环境..."
    
    # 等待一段时间确保新环境稳定
    log_info "等待新环境稳定运行..."
    sleep 120
    
    # 缩减旧环境副本数到0
    kubectl scale deployment -l app.kubernetes.io/instance=$old_release --replicas=0 -n $NAMESPACE
    
    # 可选：完全删除旧环境（谨慎操作）
    # helm uninstall "$old_release" -n "$NAMESPACE"
    
    log_success "✅ ${old_env}环境已清理"
}

# 回滚操作
rollback_deployment() {
    local current_env=$1
    local previous_env=$2
    local current_release="${RELEASE_NAME}-${current_env}"
    local previous_release="${RELEASE_NAME}-${previous_env}"
    
    log_error "🔄 执行Helm回滚操作..."
    
    # 切换回之前的环境
    if switch_traffic $previous_env; then
        log_success "✅ 已回滚到${previous_env}环境"
        
        # 清理失败的环境
        kubectl scale deployment -l app.kubernetes.io/instance=$current_release --replicas=0 -n $NAMESPACE
        
        return 0
    else
        log_error "❌ 回滚失败"
        return 1
    fi
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
    
    echo "🔵🟢 智游助手v6.2 Helm蓝绿部署"
    echo "================================"
    echo "Chart版本: $chart_version"
    echo "镜像标签: $image_tag"
    echo ""
    
    # 登录Harbor
    helm registry login $HARBOR_REGISTRY -u $HARBOR_USERNAME -p $HARBOR_PASSWORD
    
    # 获取当前和目标环境
    local active_env=$(get_active_environment)
    local target_env=$(get_target_environment)
    
    log_info "当前活跃环境: $active_env"
    log_info "目标部署环境: $target_env"
    
    # 使用Helm部署到目标环境
    if ! helm_deploy_to_environment $target_env; then
        log_error "❌ Helm部署到${target_env}环境失败"
        exit 1
    fi
    
    # 验证目标环境
    if ! validate_environment $target_env; then
        log_error "❌ ${target_env}环境验证失败"
        helm uninstall "${RELEASE_NAME}-${target_env}" -n $NAMESPACE
        exit 1
    fi
    
    # 执行渐进式流量切换
    if ! gradual_traffic_switch $target_env; then
        log_error "❌ 流量切换失败，执行回滚"
        rollback_deployment $target_env $active_env
        exit 1
    fi
    
    # 最终验证
    sleep 60
    if ! validate_environment $target_env; then
        log_error "❌ 最终验证失败，执行回滚"
        rollback_deployment $target_env $active_env
        exit 1
    fi
    
    # 清理旧环境
    if [ "$active_env" != "none" ]; then
        cleanup_old_environment $active_env
    fi
    
    log_success "🎉 Helm蓝绿部署完成！"
    log_info "当前活跃环境: $target_env"
    log_info "Chart版本: $chart_version"
    log_info "镜像标签: $image_tag"
}

# 执行主函数
main "$@"
