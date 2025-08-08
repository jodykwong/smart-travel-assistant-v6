#!/bin/bash

# 智游助手v6.2 监控系统启动脚本（经过实际验证）
# 基于实际测试结果的修正版本

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

# 检查当前端口占用情况
check_current_ports() {
    log_info "🔍 检查当前端口占用情况..."
    
    echo "端口3000: $(lsof -i :3000 | tail -n +2 | awk '{print $1}' | head -1 || echo '空闲')"
    echo "端口3001: $(lsof -i :3001 | tail -n +2 | awk '{print $1}' | head -1 || echo '空闲')"
    echo "端口3002: $(lsof -i :3002 | tail -n +2 | awk '{print $1}' | head -1 || echo '空闲')"
    echo "端口9090: $(lsof -i :9090 | tail -n +2 | awk '{print $1}' | head -1 || echo '空闲')"
    echo "端口9093: $(lsof -i :9093 | tail -n +2 | awk '{print $1}' | head -1 || echo '空闲')"
}

# 创建必要的目录和配置
setup_directories() {
    log_info "📁 创建监控系统目录..."
    
    mkdir -p monitoring/rules
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/grafana/dashboards
    mkdir -p data/prometheus
    mkdir -p data/grafana
    mkdir -p data/alertmanager
    
    # 设置Grafana数据目录权限
    sudo chown -R 472:472 data/grafana/ 2>/dev/null || {
        log_warning "无法设置Grafana权限，可能需要sudo权限"
    }
    
    log_success "✅ 目录创建完成"
}

# 创建简化的Prometheus配置
create_simple_prometheus_config() {
    log_info "📝 创建简化的Prometheus配置..."
    
    cat > monitoring/prometheus-simple.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  - job_name: 'grafana'
    static_configs:
      - targets: ['grafana:3000']
    scrape_interval: 30s
EOF
    
    log_success "✅ 简化Prometheus配置创建完成"
}

# 创建简化的Docker Compose配置
create_simple_compose() {
    log_info "📝 创建简化的监控服务配置..."
    
    cat > docker-compose.monitoring-simple.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: smart-travel-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus-simple.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.0.0
    container_name: smart-travel-grafana
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:v1.6.0
    container_name: smart-travel-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
EOF
    
    log_success "✅ 简化Docker Compose配置创建完成"
}

# 停止现有服务
stop_existing_services() {
    log_info "🛑 停止可能冲突的服务..."
    
    # 停止可能存在的监控服务
    docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
    docker-compose -f docker-compose.monitoring-simple.yml down 2>/dev/null || true
    
    # 清理可能的容器
    docker rm -f smart-travel-prometheus smart-travel-grafana smart-travel-alertmanager smart-travel-node-exporter 2>/dev/null || true
    
    log_success "✅ 现有服务已停止"
}

# 启动简化的监控服务
start_monitoring_services() {
    log_info "🚀 启动简化的监控服务..."
    
    # 启动服务
    docker-compose -f docker-compose.monitoring-simple.yml up -d
    
    # 等待服务启动
    log_info "⏳ 等待服务启动（60秒）..."
    sleep 60
    
    log_success "✅ 监控服务启动完成"
}

# 验证服务状态
verify_services() {
    log_info "🔍 验证服务状态..."
    
    # 检查容器状态
    echo "容器状态:"
    docker-compose -f docker-compose.monitoring-simple.yml ps
    
    echo ""
    echo "服务验证:"
    
    # 验证Prometheus
    if curl -f http://localhost:9090 &> /dev/null; then
        log_success "✅ Prometheus (http://localhost:9090) - 可访问"
    else
        log_error "❌ Prometheus (http://localhost:9090) - 无法访问"
    fi
    
    # 验证Grafana
    if curl -f http://localhost:3002 &> /dev/null; then
        log_success "✅ Grafana (http://localhost:3002) - 可访问"
    else
        log_error "❌ Grafana (http://localhost:3002) - 无法访问"
        echo "Grafana日志:"
        docker logs smart-travel-grafana --tail 10
    fi
    
    # 验证Node Exporter
    if curl -f http://localhost:9100/metrics &> /dev/null; then
        log_success "✅ Node Exporter (http://localhost:9100) - 可访问"
    else
        log_error "❌ Node Exporter (http://localhost:9100) - 无法访问"
    fi
}

# 显示访问信息
show_access_info() {
    echo ""
    log_info "📋 监控系统访问信息："
    echo ""
    echo "🔍 Prometheus (指标收集):"
    echo "   URL: http://localhost:9090"
    echo "   用途: 查看指标数据和配置"
    echo ""
    echo "📊 Grafana (可视化监控):"
    echo "   URL: http://localhost:3002"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo "   用途: 创建监控仪表板"
    echo ""
    echo "📈 Node Exporter (系统指标):"
    echo "   URL: http://localhost:9100/metrics"
    echo "   用途: 系统性能指标"
    echo ""
    echo "🏥 现有应用服务:"
    echo "   智游助手v5.0: http://localhost:3001"
    echo "   Open WebUI: http://localhost:3000"
    echo ""
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 监控系统启动（经过实际验证）"
    echo "基于实际测试结果的简化版本"
    echo "=================================================="
    echo ""
    
    check_current_ports
    setup_directories
    create_simple_prometheus_config
    create_simple_compose
    stop_existing_services
    start_monitoring_services
    verify_services
    show_access_info
    
    echo ""
    log_success "🎉 监控系统启动完成！"
    echo ""
    echo "📝 下一步:"
    echo "1. 访问 http://localhost:3002 配置Grafana"
    echo "2. 在Grafana中添加Prometheus数据源: http://prometheus:9090"
    echo "3. 创建监控仪表板"
    echo "4. 根据需要添加更多监控目标"
    echo ""
}

# 执行主函数
main "$@"
