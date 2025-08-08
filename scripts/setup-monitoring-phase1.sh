#!/bin/bash

# 智游助手v6.2 阶段一监控系统搭建脚本
# 基于现有架构优势的渐进式CI/CD和监控实施

set -e  # 遇到错误立即退出

# 颜色定义
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

# 检查前置条件
check_prerequisites() {
    log_info "🔍 检查前置条件..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    log_success "✅ Docker已安装: $(docker --version)"
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    log_success "✅ Docker Compose已安装: $(docker-compose --version)"
    
    # 检查现有应用是否运行
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "✅ 现有应用健康检查通过"
    else
        log_warning "⚠️ 现有应用健康检查失败，监控系统仍可独立运行"
    fi
    
    # 检查端口占用
    check_port_availability 9090 "Prometheus"
    check_port_availability 3002 "Grafana"
    check_port_availability 9093 "AlertManager"
}

# 检查端口可用性
check_port_availability() {
    local port=$1
    local service=$2
    
    if lsof -i :$port &> /dev/null; then
        log_warning "⚠️ 端口 $port 已被占用，$service 可能无法启动"
        log_info "请检查并释放端口 $port，或修改配置文件中的端口设置"
    else
        log_success "✅ 端口 $port 可用 ($service)"
    fi
}

# 创建必要的目录结构
create_directories() {
    log_info "📁 创建监控系统目录结构..."
    
    # 创建监控配置目录
    mkdir -p monitoring/rules
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/grafana/dashboards
    
    # 创建数据目录
    mkdir -p data/prometheus
    mkdir -p data/grafana
    mkdir -p data/alertmanager
    
    # 设置权限
    chmod 755 monitoring/
    chmod 755 data/
    
    log_success "✅ 目录结构创建完成"
}

# 创建Grafana数据源配置
create_grafana_datasource() {
    log_info "📊 创建Grafana数据源配置..."
    
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "5s"
EOF
    
    log_success "✅ Grafana数据源配置创建完成"
}

# 创建Grafana仪表板配置
create_grafana_dashboard_config() {
    log_info "📈 创建Grafana仪表板配置..."
    
    cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'smart-travel-dashboards'
    orgId: 1
    folder: 'Smart Travel v6.2'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    log_success "✅ Grafana仪表板配置创建完成"
}

# 创建基础仪表板
create_basic_dashboard() {
    log_info "📊 创建基础监控仪表板..."
    
    cat > monitoring/grafana/dashboards/smart-travel-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "智游助手v6.2 系统概览",
    "tags": ["smart-travel", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "系统状态",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"smart-travel-app\"}",
            "legendFormat": "应用状态"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "支付成功率",
        "type": "stat",
        "targets": [
          {
            "expr": "smart_travel_payment_success_rate",
            "legendFormat": "支付成功率"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 0.95},
                {"color": "green", "value": 0.99}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF
    
    log_success "✅ 基础监控仪表板创建完成"
}

# 启动监控系统
start_monitoring_system() {
    log_info "🚀 启动监控系统..."
    
    # 检查配置文件
    if [ ! -f "docker-compose.monitoring.yml" ]; then
        log_error "docker-compose.monitoring.yml 文件不存在"
        exit 1
    fi
    
    if [ ! -f "monitoring/prometheus.yml" ]; then
        log_error "monitoring/prometheus.yml 文件不存在"
        exit 1
    fi
    
    # 启动监控服务
    log_info "启动监控容器..."
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # 等待服务启动
    log_info "⏳ 等待服务启动..."
    sleep 30
    
    log_success "✅ 监控系统启动完成"
}

# 验证监控系统
verify_monitoring_system() {
    log_info "🔍 验证监控系统..."
    
    # 检查容器状态
    log_info "检查容器状态..."
    docker-compose -f docker-compose.monitoring.yml ps
    
    # 验证Prometheus
    if curl -f http://localhost:9090/-/healthy &> /dev/null; then
        log_success "✅ Prometheus健康检查通过"
    else
        log_error "❌ Prometheus健康检查失败"
        return 1
    fi
    
    # 验证Grafana
    if curl -f http://localhost:3002/api/health &> /dev/null; then
        log_success "✅ Grafana健康检查通过"
    else
        log_error "❌ Grafana健康检查失败"
        return 1
    fi
    
    # 验证AlertManager
    if curl -f http://localhost:9093/-/healthy &> /dev/null; then
        log_success "✅ AlertManager健康检查通过"
    else
        log_error "❌ AlertManager健康检查失败"
        return 1
    fi
    
    # 验证指标收集
    log_info "验证指标收集..."
    if curl -f http://localhost:9090/api/v1/targets &> /dev/null; then
        log_success "✅ Prometheus指标收集正常"
    else
        log_warning "⚠️ Prometheus指标收集可能有问题"
    fi
    
    # 验证应用指标端点（如果应用正在运行）
    if curl -f http://localhost:3000/metrics &> /dev/null; then
        log_success "✅ 应用指标端点可用"
    else
        log_warning "⚠️ 应用指标端点不可用，需要在应用中集成监控代码"
    fi
}

# 显示访问信息
show_access_info() {
    log_info "📋 监控系统访问信息："
    echo ""
    echo "🔍 Prometheus (指标收集):"
    echo "   URL: http://localhost:9090"
    echo "   用途: 查看原始指标数据和告警规则"
    echo ""
    echo "📊 Grafana (可视化监控):"
    echo "   URL: http://localhost:3002"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo "   用途: 查看监控仪表板和图表"
    echo ""
    echo "🚨 AlertManager (告警管理):"
    echo "   URL: http://localhost:9093"
    echo "   用途: 管理告警规则和通知"
    echo ""
    echo "📈 系统指标:"
    echo "   Node Exporter: http://localhost:9100/metrics"
    echo "   cAdvisor: http://localhost:8080"
    echo ""
    echo "🏥 应用健康检查:"
    echo "   现有健康检查: http://localhost:3000/health"
    echo "   新增指标端点: http://localhost:3000/metrics (需要应用集成)"
    echo ""
}

# 显示下一步操作
show_next_steps() {
    log_info "📝 下一步操作："
    echo ""
    echo "1. 🔗 集成应用监控代码:"
    echo "   - 在应用中添加 /metrics 端点"
    echo "   - 集成支付监控埋点"
    echo "   - 添加业务指标收集"
    echo ""
    echo "2. 📊 配置Grafana仪表板:"
    echo "   - 访问 http://localhost:3002"
    echo "   - 导入更多仪表板模板"
    echo "   - 配置告警通知"
    echo ""
    echo "3. 🚨 配置告警通知:"
    echo "   - 编辑 monitoring/alertmanager.yml"
    echo "   - 配置Slack/邮件通知"
    echo "   - 测试告警规则"
    echo ""
    echo "4. 🔍 验证监控数据:"
    echo "   - 检查Prometheus targets状态"
    echo "   - 验证指标数据收集"
    echo "   - 测试告警触发"
    echo ""
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 阶段一监控系统搭建"
    echo "基于现有架构优势的渐进式CI/CD和监控实施"
    echo "=================================================="
    echo ""
    
    # 执行各个步骤
    check_prerequisites
    create_directories
    create_grafana_datasource
    create_grafana_dashboard_config
    create_basic_dashboard
    start_monitoring_system
    
    # 验证系统
    if verify_monitoring_system; then
        log_success "🎉 监控系统搭建成功！"
        show_access_info
        show_next_steps
    else
        log_error "❌ 监控系统验证失败，请检查日志"
        exit 1
    fi
}

# 执行主函数
main "$@"
