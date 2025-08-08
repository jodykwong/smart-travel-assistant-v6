#!/bin/bash

# 智游助手v6.2 支付系统特殊保护策略
# Week 3-4: 支付系统蓝绿部署+实时监控

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
PAYMENT_SERVICE="payment-service"
MONITORING_ENDPOINT="http://prometheus:9090"
GRAFANA_ENDPOINT="http://grafana:3000"

# 支付系统关键指标
PAYMENT_SUCCESS_RATE_THRESHOLD=0.99
PAYMENT_RESPONSE_TIME_THRESHOLD=5.0
PAYMENT_ERROR_RATE_THRESHOLD=0.01

# 监控时间窗口（秒）
MONITORING_WINDOW=300
VALIDATION_TIMEOUT=600

# 检查支付系统健康状态
check_payment_health() {
    log_info "🏥 检查支付系统健康状态..."
    
    # 检查支付服务Pod状态
    local payment_pods=$(kubectl get pods -n $NAMESPACE -l app=$PAYMENT_SERVICE --no-headers | wc -l)
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app=$PAYMENT_SERVICE --no-headers | grep "Running" | wc -l)
    
    if [ "$payment_pods" -eq 0 ]; then
        log_error "❌ 未找到支付服务Pod"
        return 1
    fi
    
    if [ "$ready_pods" -ne "$payment_pods" ]; then
        log_error "❌ 支付服务Pod未全部就绪: $ready_pods/$payment_pods"
        return 1
    fi
    
    log_success "✅ 支付服务Pod状态正常: $ready_pods/$payment_pods"
    
    # 检查支付API健康状态
    local health_check_url="http://${PAYMENT_SERVICE}.${NAMESPACE}.svc.cluster.local:3000/api/payment/health"
    if kubectl run health-check --rm -i --restart=Never --image=curlimages/curl -- curl -f "$health_check_url" > /dev/null 2>&1; then
        log_success "✅ 支付API健康检查通过"
    else
        log_error "❌ 支付API健康检查失败"
        return 1
    fi
    
    return 0
}

# 获取支付系统监控指标
get_payment_metrics() {
    log_info "📊 获取支付系统监控指标..."
    
    # 查询Prometheus指标
    local prometheus_query_url="${MONITORING_ENDPOINT}/api/v1/query"
    
    # 支付成功率
    local success_rate_query="smart_travel_payment_success_rate"
    local success_rate=$(curl -s "${prometheus_query_url}?query=${success_rate_query}" | jq -r '.data.result[0].value[1] // "0"')
    
    # 支付响应时间（95分位）
    local response_time_query="histogram_quantile(0.95, smart_travel_payment_response_time_seconds_bucket)"
    local response_time=$(curl -s "${prometheus_query_url}?query=${response_time_query}" | jq -r '.data.result[0].value[1] // "0"')
    
    # 支付错误率
    local error_rate_query="rate(smart_travel_payment_errors_total[5m])"
    local error_rate=$(curl -s "${prometheus_query_url}?query=${error_rate_query}" | jq -r '.data.result[0].value[1] // "0"')
    
    echo "SUCCESS_RATE=$success_rate"
    echo "RESPONSE_TIME=$response_time"
    echo "ERROR_RATE=$error_rate"
    
    # 验证指标阈值
    if (( $(echo "$success_rate < $PAYMENT_SUCCESS_RATE_THRESHOLD" | bc -l) )); then
        log_error "❌ 支付成功率过低: $success_rate < $PAYMENT_SUCCESS_RATE_THRESHOLD"
        return 1
    fi
    
    if (( $(echo "$response_time > $PAYMENT_RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log_error "❌ 支付响应时间过长: $response_time > $PAYMENT_RESPONSE_TIME_THRESHOLD"
        return 1
    fi
    
    if (( $(echo "$error_rate > $PAYMENT_ERROR_RATE_THRESHOLD" | bc -l) )); then
        log_error "❌ 支付错误率过高: $error_rate > $PAYMENT_ERROR_RATE_THRESHOLD"
        return 1
    fi
    
    log_success "✅ 支付系统指标正常"
    log_info "   成功率: $success_rate"
    log_info "   响应时间: ${response_time}s"
    log_info "   错误率: $error_rate"
    
    return 0
}

# 执行支付系统测试
run_payment_tests() {
    log_info "🧪 执行支付系统测试..."
    
    # 创建测试Pod
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: payment-test-${RANDOM}
  namespace: $NAMESPACE
spec:
  restartPolicy: Never
  containers:
  - name: payment-test
    image: node:18-alpine
    command: ["/bin/sh"]
    args: ["-c", "
      apk add --no-cache curl jq &&
      echo '🧪 测试支付API...' &&
      curl -f http://${PAYMENT_SERVICE}.${NAMESPACE}.svc.cluster.local:3000/api/payment/test &&
      echo '✅ 支付API测试通过'
    "]
EOF
    
    # 等待测试完成
    local test_pod=$(kubectl get pods -n $NAMESPACE -l job-name=payment-test --no-headers -o custom-columns=":metadata.name" | head -1)
    kubectl wait --for=condition=Ready pod/$test_pod -n $NAMESPACE --timeout=60s
    
    # 检查测试结果
    if kubectl logs $test_pod -n $NAMESPACE | grep -q "✅ 支付API测试通过"; then
        log_success "✅ 支付系统测试通过"
        kubectl delete pod $test_pod -n $NAMESPACE
        return 0
    else
        log_error "❌ 支付系统测试失败"
        kubectl logs $test_pod -n $NAMESPACE
        kubectl delete pod $test_pod -n $NAMESPACE
        return 1
    fi
}

# 设置支付系统告警
setup_payment_alerts() {
    log_info "🚨 设置支付系统告警..."
    
    # 创建支付系统告警规则
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: payment-system-alerts
  namespace: $NAMESPACE
spec:
  groups:
  - name: payment.rules
    rules:
    - alert: PaymentSuccessRateLow
      expr: smart_travel_payment_success_rate < $PAYMENT_SUCCESS_RATE_THRESHOLD
      for: 1m
      labels:
        severity: critical
        service: payment
      annotations:
        summary: "支付成功率过低"
        description: "支付成功率 {{ \$value }} 低于阈值 $PAYMENT_SUCCESS_RATE_THRESHOLD"
    
    - alert: PaymentResponseTimeHigh
      expr: histogram_quantile(0.95, smart_travel_payment_response_time_seconds_bucket) > $PAYMENT_RESPONSE_TIME_THRESHOLD
      for: 2m
      labels:
        severity: warning
        service: payment
      annotations:
        summary: "支付响应时间过长"
        description: "支付95%分位响应时间 {{ \$value }}s 超过阈值 ${PAYMENT_RESPONSE_TIME_THRESHOLD}s"
    
    - alert: PaymentErrorRateHigh
      expr: rate(smart_travel_payment_errors_total[5m]) > $PAYMENT_ERROR_RATE_THRESHOLD
      for: 1m
      labels:
        severity: critical
        service: payment
      annotations:
        summary: "支付错误率过高"
        description: "支付错误率 {{ \$value }} 超过阈值 $PAYMENT_ERROR_RATE_THRESHOLD"
EOF
    
    log_success "✅ 支付系统告警规则已设置"
}

# 监控支付系统部署
monitor_payment_deployment() {
    log_info "👀 监控支付系统部署过程..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + VALIDATION_TIMEOUT))
    
    while [ $(date +%s) -lt $end_time ]; do
        log_info "检查支付系统状态..."
        
        if check_payment_health && get_payment_metrics; then
            log_success "✅ 支付系统状态正常"
            return 0
        else
            log_warning "⚠️ 支付系统状态异常，继续监控..."
            sleep 30
        fi
    done
    
    log_error "❌ 支付系统监控超时"
    return 1
}

# 回滚支付系统
rollback_payment_system() {
    log_error "🔄 执行支付系统回滚..."
    
    # 获取上一个稳定版本
    local previous_version=$(kubectl rollout history deployment/$APP_NAME -n $NAMESPACE | tail -2 | head -1 | awk '{print $1}')
    
    if [ -n "$previous_version" ]; then
        log_info "回滚到版本: $previous_version"
        kubectl rollout undo deployment/$APP_NAME -n $NAMESPACE --to-revision=$previous_version
        kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=300s
        
        # 验证回滚后状态
        if check_payment_health && get_payment_metrics; then
            log_success "✅ 支付系统回滚成功"
            return 0
        else
            log_error "❌ 支付系统回滚后仍有问题"
            return 1
        fi
    else
        log_error "❌ 无法找到可回滚的版本"
        return 1
    fi
}

# 主函数
main() {
    local action=${1:-"pre-deploy"}
    
    echo "🛡️ 智游助手v6.2 支付系统保护策略"
    echo "======================================="
    echo "操作: $action"
    echo ""
    
    case $action in
        "pre-deploy")
            log_info "🚀 执行部署前检查..."
            
            if ! check_payment_health; then
                log_error "❌ 部署前支付系统健康检查失败"
                exit 1
            fi
            
            if ! get_payment_metrics; then
                log_error "❌ 部署前支付系统指标检查失败"
                exit 1
            fi
            
            setup_payment_alerts
            
            log_success "✅ 部署前检查完成，可以开始部署"
            ;;
            
        "post-deploy")
            log_info "🔍 执行部署后验证..."
            
            if ! monitor_payment_deployment; then
                log_error "❌ 部署后支付系统监控失败，执行回滚"
                rollback_payment_system
                exit 1
            fi
            
            if ! run_payment_tests; then
                log_error "❌ 部署后支付系统测试失败，执行回滚"
                rollback_payment_system
                exit 1
            fi
            
            log_success "✅ 部署后验证完成，支付系统运行正常"
            ;;
            
        "rollback")
            log_warning "🔄 执行紧急回滚..."
            rollback_payment_system
            ;;
            
        *)
            log_error "❌ 未知操作: $action"
            echo "用法: $0 [pre-deploy|post-deploy|rollback]"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
