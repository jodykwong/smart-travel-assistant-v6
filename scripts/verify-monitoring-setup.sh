#!/bin/bash

# 智游助手v6.2 监控系统验证脚本
# 验证阶段一CI/CD和监控系统的完整性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 执行检查
run_check() {
    local description="$1"
    local command="$2"
    
    ((TOTAL_CHECKS++))
    log_info "检查: $description"
    
    if eval "$command" &> /dev/null; then
        log_success "$description"
        return 0
    else
        log_error "$description"
        return 1
    fi
}

# 验证Docker环境
verify_docker_environment() {
    echo "🐳 验证Docker环境"
    echo "===================="
    
    run_check "Docker服务运行状态" "docker info"
    run_check "Docker Compose可用性" "docker-compose --version"
    
    echo ""
}

# 验证监控容器状态
verify_monitoring_containers() {
    echo "📦 验证监控容器状态"
    echo "===================="
    
    # 检查容器是否运行
    run_check "Prometheus容器运行" "docker ps | grep smart-travel-prometheus"
    run_check "Grafana容器运行" "docker ps | grep smart-travel-grafana"
    run_check "AlertManager容器运行" "docker ps | grep smart-travel-alertmanager"
    run_check "Node Exporter容器运行" "docker ps | grep smart-travel-node-exporter"
    
    # 检查容器健康状态
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep smart-travel; then
        log_info "监控容器状态详情:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep smart-travel
    fi
    
    echo ""
}

# 验证服务健康检查
verify_service_health() {
    echo "🏥 验证服务健康检查"
    echo "===================="
    
    # Prometheus健康检查
    run_check "Prometheus健康检查" "curl -f http://localhost:9090/-/healthy"
    run_check "Prometheus就绪检查" "curl -f http://localhost:9090/-/ready"
    
    # Grafana健康检查
    run_check "Grafana健康检查" "curl -f http://localhost:3002/api/health"
    
    # AlertManager健康检查
    run_check "AlertManager健康检查" "curl -f http://localhost:9093/-/healthy"
    
    # Node Exporter健康检查
    run_check "Node Exporter指标端点" "curl -f http://localhost:9100/metrics"
    
    echo ""
}

# 验证指标收集
verify_metrics_collection() {
    echo "📊 验证指标收集"
    echo "================"
    
    # 检查Prometheus targets
    run_check "Prometheus targets API" "curl -f http://localhost:9090/api/v1/targets"
    
    # 检查基础指标
    run_check "系统指标收集" "curl -s http://localhost:9090/api/v1/query?query=up | grep -q '\"value\"'"
    
    # 检查Node Exporter指标
    run_check "Node Exporter指标" "curl -s http://localhost:9090/api/v1/query?query=node_cpu_seconds_total | grep -q '\"value\"'"
    
    # 检查应用指标（如果可用）
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_info "检测到应用服务运行中"
        if curl -f http://localhost:3000/metrics &> /dev/null; then
            run_check "应用指标端点" "curl -f http://localhost:3000/metrics"
        else
            log_warning "应用指标端点不可用，需要集成监控代码"
        fi
    else
        log_warning "应用服务未运行，跳过应用指标检查"
    fi
    
    echo ""
}

# 验证告警规则
verify_alert_rules() {
    echo "🚨 验证告警规则"
    echo "================"
    
    # 检查告警规则加载
    run_check "告警规则API" "curl -f http://localhost:9090/api/v1/rules"
    
    # 检查告警规则文件
    if [ -f "monitoring/rules/smart-travel-alerts.yml" ]; then
        log_success "告警规则文件存在"
        ((PASSED_CHECKS++))
    else
        log_error "告警规则文件不存在"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # 检查AlertManager配置
    if [ -f "monitoring/alertmanager.yml" ]; then
        log_success "AlertManager配置文件存在"
        ((PASSED_CHECKS++))
    else
        log_error "AlertManager配置文件不存在"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo ""
}

# 验证Grafana配置
verify_grafana_config() {
    echo "📈 验证Grafana配置"
    echo "=================="
    
    # 检查Grafana API
    run_check "Grafana API可用性" "curl -f http://localhost:3002/api/health"
    
    # 检查数据源配置
    if [ -f "monitoring/grafana/provisioning/datasources/prometheus.yml" ]; then
        log_success "Grafana数据源配置存在"
        ((PASSED_CHECKS++))
    else
        log_error "Grafana数据源配置不存在"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # 检查仪表板配置
    if [ -f "monitoring/grafana/provisioning/dashboards/dashboards.yml" ]; then
        log_success "Grafana仪表板配置存在"
        ((PASSED_CHECKS++))
    else
        log_error "Grafana仪表板配置不存在"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo ""
}

# 验证网络连接
verify_network_connectivity() {
    echo "🌐 验证网络连接"
    echo "================"
    
    # 检查容器间网络连接
    run_check "Prometheus到Grafana连接" "docker exec smart-travel-prometheus wget -q --spider http://grafana:3000"
    run_check "Grafana到Prometheus连接" "docker exec smart-travel-grafana wget -q --spider http://prometheus:9090"

    # 检查外部访问
    run_check "外部访问Prometheus" "curl -f http://localhost:9090"
    run_check "外部访问Grafana" "curl -f http://localhost:3002"
    run_check "外部访问AlertManager" "curl -f http://localhost:9093"
    
    echo ""
}

# 验证数据持久化
verify_data_persistence() {
    echo "💾 验证数据持久化"
    echo "=================="
    
    # 检查数据卷
    run_check "Prometheus数据卷" "docker volume ls | grep prometheus_data"
    run_check "Grafana数据卷" "docker volume ls | grep grafana_data"
    run_check "AlertManager数据卷" "docker volume ls | grep alertmanager_data"
    
    # 检查数据目录
    if [ -d "data" ]; then
        log_success "本地数据目录存在"
        ((PASSED_CHECKS++))
    else
        log_warning "本地数据目录不存在，使用Docker卷存储"
    fi
    ((TOTAL_CHECKS++))
    
    echo ""
}

# 验证配置文件
verify_config_files() {
    echo "📄 验证配置文件"
    echo "================"
    
    # 检查主要配置文件
    local config_files=(
        "docker-compose.monitoring.yml:Docker Compose监控配置"
        "monitoring/prometheus.yml:Prometheus配置"
        "monitoring/alertmanager.yml:AlertManager配置"
        "monitoring/rules/smart-travel-alerts.yml:告警规则配置"
        ".gitlab-ci.yml:GitLab CI/CD配置"
    )
    
    for config in "${config_files[@]}"; do
        IFS=':' read -r file description <<< "$config"
        if [ -f "$file" ]; then
            log_success "$description 存在"
            ((PASSED_CHECKS++))
        else
            log_error "$description 不存在"
            ((FAILED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    done
    
    echo ""
}

# 性能测试
run_performance_test() {
    echo "⚡ 运行性能测试"
    echo "================"
    
    # 测试Prometheus查询性能
    local start_time=$(date +%s%N)
    if curl -s "http://localhost:9090/api/v1/query?query=up" > /dev/null; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        if [ $duration -lt 1000 ]; then
            log_success "Prometheus查询响应时间: ${duration}ms (< 1000ms)"
            ((PASSED_CHECKS++))
        else
            log_error "Prometheus查询响应时间过长: ${duration}ms (>= 1000ms)"
            ((FAILED_CHECKS++))
        fi
    else
        log_error "Prometheus查询失败"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    # 测试Grafana响应性能
    start_time=$(date +%s%N)
    if curl -s "http://localhost:3002/api/health" > /dev/null; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 ))
        if [ $duration -lt 2000 ]; then
            log_success "Grafana响应时间: ${duration}ms (< 2000ms)"
            ((PASSED_CHECKS++))
        else
            log_error "Grafana响应时间过长: ${duration}ms (>= 2000ms)"
            ((FAILED_CHECKS++))
        fi
    else
        log_error "Grafana健康检查失败"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo ""
}

# 生成验证报告
generate_report() {
    echo "📋 验证报告"
    echo "==========="
    echo ""
    echo "总检查项: $TOTAL_CHECKS"
    echo "通过: $PASSED_CHECKS"
    echo "失败: $FAILED_CHECKS"
    echo ""
    
    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    echo "成功率: $success_rate%"
    echo ""
    
    if [ $success_rate -ge 90 ]; then
        log_success "🎉 监控系统验证通过！系统运行良好。"
        return 0
    elif [ $success_rate -ge 70 ]; then
        log_warning "⚠️ 监控系统基本可用，但存在一些问题需要修复。"
        return 1
    else
        log_error "❌ 监控系统存在严重问题，需要立即修复。"
        return 2
    fi
}

# 显示修复建议
show_fix_suggestions() {
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo ""
        echo "🔧 修复建议"
        echo "==========="
        echo ""
        echo "1. 检查Docker服务状态:"
        echo "   sudo systemctl status docker"
        echo ""
        echo "2. 重启监控服务:"
        echo "   docker-compose -f docker-compose.monitoring.yml down"
        echo "   docker-compose -f docker-compose.monitoring.yml up -d"
        echo ""
        echo "3. 查看容器日志:"
        echo "   docker-compose -f docker-compose.monitoring.yml logs"
        echo ""
        echo "4. 检查端口占用:"
        echo "   lsof -i :9090  # Prometheus"
        echo "   lsof -i :3002  # Grafana"
        echo "   lsof -i :9093  # AlertManager"
        echo ""
        echo "5. 验证配置文件语法:"
        echo "   docker run --rm -v \$(pwd)/monitoring:/etc/prometheus prom/prometheus:latest promtool check config /etc/prometheus/prometheus.yml"
        echo ""
    fi
}

# 主函数
main() {
    echo "🔍 智游助手v6.2 监控系统验证"
    echo "基于现有架构优势的渐进式CI/CD和监控验证"
    echo "=============================================="
    echo ""
    
    # 执行各项验证
    verify_docker_environment
    verify_monitoring_containers
    verify_service_health
    verify_metrics_collection
    verify_alert_rules
    verify_grafana_config
    verify_network_connectivity
    verify_data_persistence
    verify_config_files
    run_performance_test
    
    # 生成报告
    local exit_code=0
    if ! generate_report; then
        exit_code=$?
    fi
    
    # 显示修复建议
    show_fix_suggestions
    
    exit $exit_code
}

# 执行主函数
main "$@"
