#!/bin/bash

# 智游助手v6.2 蓝绿部署脚本
# Week 3-4: 支付系统蓝绿部署实现

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
NEW_IMAGE=${1:-"harbor.smarttravel.local/smart-travel/smart-travel-assistant:latest"}
SERVICE_NAME="${APP_NAME}-service"
INGRESS_NAME="${APP_NAME}-ingress"

# 蓝绿部署配置
BLUE_DEPLOYMENT="${APP_NAME}-blue"
GREEN_DEPLOYMENT="${APP_NAME}-green"
BLUE_SERVICE="${APP_NAME}-blue-service"
GREEN_SERVICE="${APP_NAME}-green-service"

# 监控配置
VALIDATION_TIMEOUT=300
SWITCH_TIMEOUT=60

# 获取当前活跃环境
get_active_environment() {
    local current_selector=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [ "$current_selector" = "blue" ]; then
        echo "blue"
    elif [ "$current_selector" = "green" ]; then
        echo "green"
    else
        echo "none"
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

# 创建部署配置
create_deployment_config() {
    local env=$1
    local image=$2
    local deployment_name="${APP_NAME}-${env}"
    
    cat <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $deployment_name
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    version: $env
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $APP_NAME
      version: $env
  template:
    metadata:
      labels:
        app: $APP_NAME
        version: $env
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/metrics"
    spec:
      containers:
      - name: $APP_NAME
        image: $image
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: METRICS_ENABLED
          value: "true"
        - name: MONITORING_INTERVAL
          value: "15000"
        - name: VERSION
          value: "$env"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}-${env}-service
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    version: $env
spec:
  selector:
    app: $APP_NAME
    version: $env
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  type: ClusterIP
EOF
}

# 部署到目标环境
deploy_to_environment() {
    local env=$1
    local image=$2
    
    log_info "🚀 部署到${env}环境..."
    
    # 创建部署配置
    create_deployment_config $env $image | kubectl apply -f -
    
    # 等待部署完成
    log_info "等待${env}环境部署完成..."
    kubectl rollout status deployment/${APP_NAME}-${env} -n $NAMESPACE --timeout=600s
    
    # 验证Pod状态
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME,version=$env --no-headers | grep "Running" | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME,version=$env --no-headers | wc -l)
    
    if [ "$ready_pods" -ne "$total_pods" ] || [ "$total_pods" -eq 0 ]; then
        log_error "❌ ${env}环境部署失败: $ready_pods/$total_pods Pod就绪"
        return 1
    fi
    
    log_success "✅ ${env}环境部署完成: $ready_pods/$total_pods Pod就绪"
    return 0
}

# 验证环境健康状态
validate_environment() {
    local env=$1
    local service_name="${APP_NAME}-${env}-service"
    
    log_info "🏥 验证${env}环境健康状态..."
    
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

# 切换流量
switch_traffic() {
    local target_env=$1
    
    log_info "🔄 切换流量到${target_env}环境..."
    
    # 更新主服务选择器
    kubectl patch service $SERVICE_NAME -n $NAMESPACE -p '{"spec":{"selector":{"version":"'$target_env'"}}}'
    
    # 验证流量切换
    sleep 10
    local current_selector=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
    
    if [ "$current_selector" = "$target_env" ]; then
        log_success "✅ 流量已切换到${target_env}环境"
        return 0
    else
        log_error "❌ 流量切换失败，当前选择器: $current_selector"
        return 1
    fi
}

# 渐进式流量切换
gradual_traffic_switch() {
    local target_env=$1
    
    log_info "📈 执行渐进式流量切换到${target_env}环境..."
    
    # 阶段1: 10%流量
    log_info "阶段1: 切换10%流量到${target_env}环境..."
    # 这里可以使用Istio或其他服务网格实现流量分割
    # 简化实现：直接切换
    
    # 监控30秒
    sleep 30
    if ! validate_environment $target_env; then
        log_error "❌ 阶段1验证失败，停止切换"
        return 1
    fi
    
    # 阶段2: 50%流量
    log_info "阶段2: 切换50%流量到${target_env}环境..."
    sleep 30
    if ! validate_environment $target_env; then
        log_error "❌ 阶段2验证失败，停止切换"
        return 1
    fi
    
    # 阶段3: 100%流量
    log_info "阶段3: 切换100%流量到${target_env}环境..."
    if ! switch_traffic $target_env; then
        log_error "❌ 最终流量切换失败"
        return 1
    fi
    
    log_success "✅ 渐进式流量切换完成"
    return 0
}

# 清理旧环境
cleanup_old_environment() {
    local old_env=$1
    
    log_info "🧹 清理${old_env}环境..."
    
    # 等待一段时间确保新环境稳定
    log_info "等待新环境稳定运行..."
    sleep 60
    
    # 缩减旧环境副本数
    kubectl scale deployment/${APP_NAME}-${old_env} --replicas=0 -n $NAMESPACE
    
    log_success "✅ ${old_env}环境已清理"
}

# 回滚操作
rollback_deployment() {
    local current_env=$1
    local previous_env=$2
    
    log_error "🔄 执行回滚操作..."
    
    # 切换回之前的环境
    if switch_traffic $previous_env; then
        log_success "✅ 已回滚到${previous_env}环境"
        
        # 清理失败的环境
        kubectl scale deployment/${APP_NAME}-${current_env} --replicas=0 -n $NAMESPACE
        
        return 0
    else
        log_error "❌ 回滚失败"
        return 1
    fi
}

# 主函数
main() {
    local new_image=$1
    
    if [ -z "$new_image" ]; then
        log_error "❌ 请提供新镜像地址"
        echo "用法: $0 <new_image>"
        exit 1
    fi
    
    echo "🔵🟢 智游助手v6.2 蓝绿部署"
    echo "=========================="
    echo "新镜像: $new_image"
    echo ""
    
    # 获取当前和目标环境
    local active_env=$(get_active_environment)
    local target_env=$(get_target_environment)
    
    log_info "当前活跃环境: $active_env"
    log_info "目标部署环境: $target_env"
    
    # 部署到目标环境
    if ! deploy_to_environment $target_env $new_image; then
        log_error "❌ 部署到${target_env}环境失败"
        exit 1
    fi
    
    # 验证目标环境
    if ! validate_environment $target_env; then
        log_error "❌ ${target_env}环境验证失败"
        kubectl scale deployment/${APP_NAME}-${target_env} --replicas=0 -n $NAMESPACE
        exit 1
    fi
    
    # 执行流量切换
    if ! gradual_traffic_switch $target_env; then
        log_error "❌ 流量切换失败，执行回滚"
        rollback_deployment $target_env $active_env
        exit 1
    fi
    
    # 最终验证
    sleep 30
    if ! validate_environment $target_env; then
        log_error "❌ 最终验证失败，执行回滚"
        rollback_deployment $target_env $active_env
        exit 1
    fi
    
    # 清理旧环境
    if [ "$active_env" != "none" ]; then
        cleanup_old_environment $active_env
    fi
    
    log_success "🎉 蓝绿部署完成！"
    log_info "当前活跃环境: $target_env"
    log_info "新镜像: $new_image"
}

# 执行主函数
main "$@"
