#!/bin/bash

# 智游助手v6.2 部署后测试脚本
# Week 3-4: 集成现有监控系统的部署验证

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
ENVIRONMENT=${1:-"staging"}
APP_NAME="smart-travel-assistant"

# 根据环境设置配置
case $ENVIRONMENT in
    "development"|"dev")
        NAMESPACE="smart-travel-dev"
        BASE_URL="https://dev.smarttravel.local"
        ;;
    "staging")
        NAMESPACE="smart-travel-staging"
        BASE_URL="https://staging.smarttravel.local"
        ;;
    "production"|"prod")
        NAMESPACE="smart-travel-production"
        BASE_URL="https://api.smarttravel.com"
        ;;
    *)
        log_error "❌ 未知环境: $ENVIRONMENT"
        exit 1
        ;;
esac

# 测试超时配置
HEALTH_CHECK_TIMEOUT=60
API_TEST_TIMEOUT=120
MONITORING_TEST_TIMEOUT=30

# 基础健康检查
test_basic_health() {
    log_info "🏥 执行基础健康检查..."
    
    # 检查Pod状态
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME --no-headers | grep "Running" | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME --no-headers | wc -l)
    
    if [ "$total_pods" -eq 0 ]; then
        log_error "❌ 未找到应用Pod"
        return 1
    fi
    
    if [ "$ready_pods" -ne "$total_pods" ]; then
        log_error "❌ Pod未全部就绪: $ready_pods/$total_pods"
        kubectl get pods -n $NAMESPACE -l app=$APP_NAME
        return 1
    fi
    
    log_success "✅ Pod状态检查通过: $ready_pods/$total_pods"
    
    # 检查服务状态
    if ! kubectl get service $APP_NAME -n $NAMESPACE > /dev/null 2>&1; then
        log_error "❌ 服务不存在"
        return 1
    fi
    
    log_success "✅ 服务状态检查通过"
    
    # 健康检查端点测试
    local health_url="${BASE_URL}/api/health"
    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_TIMEOUT))
    
    while [ $(date +%s) -lt $end_time ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "✅ 健康检查端点响应正常"
            return 0
        fi
        sleep 5
    done
    
    log_error "❌ 健康检查端点超时"
    return 1
}

# 监控系统集成测试
test_monitoring_integration() {
    log_info "📊 测试监控系统集成..."
    
    # 测试指标端点
    local metrics_url="${BASE_URL}/api/metrics"
    if curl -f -s "$metrics_url" | grep -q "smart_travel_"; then
        log_success "✅ Prometheus指标端点正常"
    else
        log_error "❌ Prometheus指标端点异常"
        return 1
    fi
    
    # 测试MetricsRegistry集成
    local registry_test_url="${BASE_URL}/api/monitoring/registry/status"
    if curl -f -s "$registry_test_url" | grep -q "initialized"; then
        log_success "✅ MetricsRegistry集成正常"
    else
        log_warning "⚠️ MetricsRegistry状态检查失败"
    fi
    
    # 测试MetricsCollector集成
    local collector_test_url="${BASE_URL}/api/monitoring/collector/status"
    if curl -f -s "$collector_test_url" | grep -q "active"; then
        log_success "✅ MetricsCollector集成正常"
    else
        log_warning "⚠️ MetricsCollector状态检查失败"
    fi
    
    # 测试ErrorHandler集成
    local error_handler_test_url="${BASE_URL}/api/monitoring/error-handler/status"
    if curl -f -s "$error_handler_test_url" | grep -q "ready"; then
        log_success "✅ ErrorHandler集成正常"
    else
        log_warning "⚠️ ErrorHandler状态检查失败"
    fi
    
    return 0
}

# API功能测试
test_api_functionality() {
    log_info "🔌 测试API功能..."
    
    # 测试基础API端点
    local api_endpoints=(
        "/api/health"
        "/api/ready"
        "/api/version"
        "/api/travel/search"
        "/api/travel/plan"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local url="${BASE_URL}${endpoint}"
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "✅ API端点正常: $endpoint"
        else
            log_error "❌ API端点异常: $endpoint"
            return 1
        fi
    done
    
    # 测试API响应时间
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "${BASE_URL}/api/health")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "✅ API响应时间正常: ${response_time}s"
    else
        log_warning "⚠️ API响应时间较慢: ${response_time}s"
    fi
    
    return 0
}

# 支付系统测试
test_payment_system() {
    log_info "💳 测试支付系统..."
    
    # 支付系统健康检查
    local payment_health_url="${BASE_URL}/api/payment/health"
    if curl -f -s "$payment_health_url" | grep -q "healthy"; then
        log_success "✅ 支付系统健康检查通过"
    else
        log_error "❌ 支付系统健康检查失败"
        return 1
    fi
    
    # 支付系统测试端点
    local payment_test_url="${BASE_URL}/api/payment/test"
    if curl -f -s "$payment_test_url" | grep -q "success"; then
        log_success "✅ 支付系统测试通过"
    else
        log_error "❌ 支付系统测试失败"
        return 1
    fi
    
    # 支付系统监控指标检查
    local payment_metrics_url="${BASE_URL}/api/metrics"
    if curl -f -s "$payment_metrics_url" | grep -q "smart_travel_payment_"; then
        log_success "✅ 支付系统监控指标正常"
    else
        log_warning "⚠️ 支付系统监控指标缺失"
    fi
    
    return 0
}

# 数据库连接测试
test_database_connectivity() {
    log_info "🗄️ 测试数据库连接..."
    
    # 数据库健康检查
    local db_health_url="${BASE_URL}/api/database/health"
    if curl -f -s "$db_health_url" | grep -q "connected"; then
        log_success "✅ 数据库连接正常"
    else
        log_error "❌ 数据库连接异常"
        return 1
    fi
    
    # 缓存连接测试
    local cache_health_url="${BASE_URL}/api/cache/health"
    if curl -f -s "$cache_health_url" | grep -q "connected"; then
        log_success "✅ 缓存连接正常"
    else
        log_warning "⚠️ 缓存连接异常"
    fi
    
    return 0
}

# 外部服务集成测试
test_external_services() {
    log_info "🌐 测试外部服务集成..."
    
    # 高德地图API测试
    local amap_test_url="${BASE_URL}/api/amap/test"
    if curl -f -s "$amap_test_url" | grep -q "success"; then
        log_success "✅ 高德地图API集成正常"
    else
        log_warning "⚠️ 高德地图API集成异常"
    fi
    
    # 支付网关测试
    if [ "$ENVIRONMENT" != "production" ]; then
        local payment_gateway_test_url="${BASE_URL}/api/payment/gateway/test"
        if curl -f -s "$payment_gateway_test_url" | grep -q "success"; then
            log_success "✅ 支付网关集成正常"
        else
            log_warning "⚠️ 支付网关集成异常"
        fi
    fi
    
    return 0
}

# 性能测试
test_performance() {
    log_info "⚡ 执行性能测试..."
    
    # 并发请求测试
    local concurrent_requests=10
    local test_url="${BASE_URL}/api/health"
    
    log_info "执行并发请求测试: $concurrent_requests 个并发请求"
    
    local start_time=$(date +%s)
    for i in $(seq 1 $concurrent_requests); do
        curl -f -s "$test_url" > /dev/null &
    done
    wait
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 10 ]; then
        log_success "✅ 并发性能测试通过: ${duration}s"
    else
        log_warning "⚠️ 并发性能较慢: ${duration}s"
    fi
    
    return 0
}

# 安全测试
test_security() {
    log_info "🔒 执行安全测试..."
    
    # 检查安全头
    local security_headers=$(curl -I -s "${BASE_URL}/api/health" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)")
    if [ -n "$security_headers" ]; then
        log_success "✅ 安全头配置正常"
    else
        log_warning "⚠️ 缺少安全头配置"
    fi
    
    # 检查HTTPS重定向
    if [ "$ENVIRONMENT" != "development" ]; then
        local http_url=$(echo "$BASE_URL" | sed 's/https/http/')
        local redirect_status=$(curl -I -s "$http_url/api/health" | head -1 | awk '{print $2}')
        if [ "$redirect_status" = "301" ] || [ "$redirect_status" = "302" ]; then
            log_success "✅ HTTPS重定向正常"
        else
            log_warning "⚠️ HTTPS重定向配置异常"
        fi
    fi
    
    return 0
}

# 生成测试报告
generate_test_report() {
    local test_results_file="reports/post-deployment-test-results-${ENVIRONMENT}.json"
    mkdir -p reports
    
    cat > "$test_results_file" <<EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "base_url": "$BASE_URL",
  "namespace": "$NAMESPACE",
  "tests": {
    "basic_health": $1,
    "monitoring_integration": $2,
    "api_functionality": $3,
    "payment_system": $4,
    "database_connectivity": $5,
    "external_services": $6,
    "performance": $7,
    "security": $8
  },
  "overall_status": "$9"
}
EOF
    
    log_info "📋 测试报告已生成: $test_results_file"
}

# 主函数
main() {
    echo "🧪 智游助手v6.2 部署后测试"
    echo "============================"
    echo "环境: $ENVIRONMENT"
    echo "命名空间: $NAMESPACE"
    echo "基础URL: $BASE_URL"
    echo ""
    
    # 执行所有测试
    local test_results=()
    local overall_status="PASS"
    
    # 基础健康检查
    if test_basic_health; then
        test_results+=(true)
    else
        test_results+=(false)
        overall_status="FAIL"
    fi
    
    # 监控系统集成测试
    if test_monitoring_integration; then
        test_results+=(true)
    else
        test_results+=(false)
        overall_status="FAIL"
    fi
    
    # API功能测试
    if test_api_functionality; then
        test_results+=(true)
    else
        test_results+=(false)
        overall_status="FAIL"
    fi
    
    # 支付系统测试
    if test_payment_system; then
        test_results+=(true)
    else
        test_results+=(false)
        overall_status="FAIL"
    fi
    
    # 数据库连接测试
    if test_database_connectivity; then
        test_results+=(true)
    else
        test_results+=(false)
        overall_status="FAIL"
    fi
    
    # 外部服务集成测试
    if test_external_services; then
        test_results+=(true)
    else
        test_results+=(false)
        # 外部服务失败不影响整体状态
    fi
    
    # 性能测试
    if test_performance; then
        test_results+=(true)
    else
        test_results+=(false)
        # 性能测试失败不影响整体状态
    fi
    
    # 安全测试
    if test_security; then
        test_results+=(true)
    else
        test_results+=(false)
        # 安全测试失败不影响整体状态
    fi
    
    # 生成测试报告
    generate_test_report "${test_results[@]}" "$overall_status"
    
    echo ""
    if [ "$overall_status" = "PASS" ]; then
        log_success "🎉 所有关键测试通过！"
        echo "环境 $ENVIRONMENT 部署验证成功"
        exit 0
    else
        log_error "❌ 部分关键测试失败！"
        echo "环境 $ENVIRONMENT 部署验证失败"
        exit 1
    fi
}

# 执行主函数
main "$@"
