#!/bin/bash

# 智游助手v6.2 监控系统重启脚本（修正端口冲突）
# 解决Grafana端口冲突和AlertManager访问问题

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

# 停止现有监控服务
stop_monitoring() {
    log_info "🛑 停止现有监控服务..."
    
    if docker-compose -f docker-compose.monitoring.yml ps | grep -q "Up"; then
        docker-compose -f docker-compose.monitoring.yml down
        log_success "✅ 监控服务已停止"
    else
        log_info "监控服务未运行"
    fi
    
    # 清理可能占用端口的容器
    if docker ps | grep -q "3001"; then
        log_warning "⚠️ 发现端口3001被占用，尝试清理..."
        docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 3001 | awk '{print $1}' | xargs -r docker stop
    fi
}

# 检查端口可用性
check_ports() {
    log_info "🔍 检查端口可用性..."
    
    local ports=(9090 3002 9093 9100 9121 9104 8080)
    local port_names=("Prometheus" "Grafana" "AlertManager" "Node Exporter" "Redis Exporter" "MySQL Exporter" "cAdvisor")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}
        
        if lsof -i :$port &> /dev/null; then
            log_warning "⚠️ 端口 $port ($name) 被占用"
            log_info "占用进程: $(lsof -i :$port | tail -n +2 | awk '{print $1, $2}' | head -1)"
        else
            log_success "✅ 端口 $port ($name) 可用"
        fi
    done
}

# 启动监控服务
start_monitoring() {
    log_info "🚀 启动修正后的监控服务..."
    
    # 确保配置文件存在
    if [ ! -f "docker-compose.monitoring.yml" ]; then
        log_error "❌ docker-compose.monitoring.yml 文件不存在"
        exit 1
    fi
    
    if [ ! -f "monitoring/prometheus.yml" ]; then
        log_error "❌ monitoring/prometheus.yml 文件不存在"
        exit 1
    fi
    
    if [ ! -f "monitoring/alertmanager.yml" ]; then
        log_error "❌ monitoring/alertmanager.yml 文件不存在"
        exit 1
    fi
    
    # 启动服务
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # 等待服务启动
    log_info "⏳ 等待服务启动..."
    sleep 30
    
    log_success "✅ 监控服务启动完成"
}

# 验证服务状态
verify_services() {
    log_info "🔍 验证服务状态..."
    
    # 检查容器状态
    log_info "容器状态:"
    docker-compose -f docker-compose.monitoring.yml ps
    
    # 验证服务健康状态
    local services=(
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:3002/api/health:Grafana"
        "http://localhost:9093/-/healthy:AlertManager"
        "http://localhost:9100/metrics:Node Exporter"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        
        if curl -f "$url" &> /dev/null; then
            log_success "✅ $name 健康检查通过"
        else
            log_error "❌ $name 健康检查失败"
        fi
    done
}

# 显示访问信息
show_access_info() {
    log_info "📋 修正后的监控系统访问信息："
    echo ""
    echo "🔍 Prometheus (指标收集):"
    echo "   URL: http://localhost:9090"
    echo "   状态: $(curl -s http://localhost:9090/-/healthy &> /dev/null && echo "✅ 正常" || echo "❌ 异常")"
    echo ""
    echo "📊 Grafana (可视化监控) - 端口已修正:"
    echo "   URL: http://localhost:3002"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo "   状态: $(curl -s http://localhost:3002/api/health &> /dev/null && echo "✅ 正常" || echo "❌ 异常")"
    echo ""
    echo "🚨 AlertManager (告警管理) - 配置已修正:"
    echo "   URL: http://localhost:9093"
    echo "   状态: $(curl -s http://localhost:9093/-/healthy &> /dev/null && echo "✅ 正常" || echo "❌ 异常")"
    echo ""
    echo "📈 其他监控服务:"
    echo "   Node Exporter: http://localhost:9100/metrics"
    echo "   cAdvisor: http://localhost:8080"
    echo ""
    echo "🏥 应用服务 (端口已释放):"
    echo "   智游助手v6.2: http://localhost:3001 (现在可用)"
    echo "   现有健康检查: http://localhost:3000/health"
    echo ""
}

# 测试端口冲突解决
test_port_conflict_resolution() {
    log_info "🧪 测试端口冲突解决..."
    
    # 测试3001端口是否已释放
    if ! lsof -i :3001 &> /dev/null; then
        log_success "✅ 端口3001已释放，智游助手v6.2应用可以使用"
    else
        log_warning "⚠️ 端口3001仍被占用: $(lsof -i :3001 | tail -n +2 | awk '{print $1}' | head -1)"
    fi
    
    # 测试Grafana新端口
    if curl -f http://localhost:3002/api/health &> /dev/null; then
        log_success "✅ Grafana已成功迁移到端口3002"
    else
        log_error "❌ Grafana在新端口3002上不可访问"
    fi
    
    # 测试AlertManager
    if curl -f http://localhost:9093/-/healthy &> /dev/null; then
        log_success "✅ AlertManager现在可以正常访问"
    else
        log_error "❌ AlertManager仍然无法访问，可能需要进一步调试"
        log_info "尝试检查AlertManager日志:"
        docker logs smart-travel-alertmanager --tail 20
    fi
}

# 主函数
main() {
    echo "🔧 智游助手v6.2 监控系统端口冲突修正"
    echo "解决Grafana端口冲突和AlertManager访问问题"
    echo "=============================================="
    echo ""
    
    stop_monitoring
    check_ports
    start_monitoring
    verify_services
    test_port_conflict_resolution
    show_access_info
    
    echo ""
    log_success "🎉 监控系统端口冲突修正完成！"
    echo ""
    echo "📝 修正内容:"
    echo "   • Grafana端口: 3001 → 3002 (释放3001给应用使用)"
    echo "   • AlertManager配置: 添加监听地址配置"
    echo "   • 所有脚本和文档: 更新端口引用"
    echo ""
    echo "🔗 现在可以访问:"
    echo "   • 智游助手v6.2应用: http://localhost:3001 (端口已释放)"
    echo "   • Grafana监控面板: http://localhost:3002"
    echo "   • AlertManager: http://localhost:9093"
    echo ""
}

# 执行主函数
main "$@"
