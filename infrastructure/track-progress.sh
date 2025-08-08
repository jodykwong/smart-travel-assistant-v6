#!/bin/bash

# 智游助手v6.2 实时进度跟踪脚本
# 用于跟踪阶段一实施进度

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

# 检查服务状态
check_service_status() {
    local service_name=$1
    local check_command=$2
    local expected_result=$3
    
    if eval "$check_command" &>/dev/null; then
        log_success "✅ $service_name: 运行正常"
        return 0
    else
        log_error "❌ $service_name: 服务异常"
        return 1
    fi
}

# 检查GitLab状态
check_gitlab() {
    log_info "🦊 检查GitLab CE状态..."
    
    # 检查容器状态
    if docker ps | grep -q "smart-travel-gitlab"; then
        log_success "✅ GitLab容器运行中"
    else
        log_error "❌ GitLab容器未运行"
        return 1
    fi
    
    # 检查Web访问
    if curl -k -s https://localhost/users/sign_in | grep -q "GitLab" 2>/dev/null; then
        log_success "✅ GitLab Web界面可访问"
    else
        log_warning "⚠️ GitLab Web界面暂时不可访问（可能正在启动）"
    fi
    
    # 检查数据库
    if docker exec smart-travel-gitlab gitlab-rake gitlab:check SANITIZE=true 2>/dev/null | grep -q "GitLab"; then
        log_success "✅ GitLab内部检查通过"
    else
        log_warning "⚠️ GitLab内部检查未完成"
    fi
}

# 检查Harbor状态
check_harbor() {
    log_info "🐳 检查Harbor状态..."
    
    # 检查容器状态
    local harbor_containers=("harbor-core" "harbor-portal" "harbor-registry" "harbor-db")
    local running_containers=0
    
    for container in "${harbor_containers[@]}"; do
        if docker ps | grep -q "$container"; then
            running_containers=$((running_containers + 1))
        fi
    done
    
    if [[ $running_containers -eq ${#harbor_containers[@]} ]]; then
        log_success "✅ Harbor所有容器运行正常 ($running_containers/${#harbor_containers[@]})"
    else
        log_warning "⚠️ Harbor部分容器未运行 ($running_containers/${#harbor_containers[@]})"
    fi
    
    # 检查Web访问
    if curl -k -s https://localhost:443 | grep -q "Harbor" 2>/dev/null; then
        log_success "✅ Harbor Web界面可访问"
    else
        log_warning "⚠️ Harbor Web界面暂时不可访问"
    fi
}

# 检查K3s状态
check_k3s() {
    log_info "☸️ 检查K3s集群状态..."
    
    # 检查K3s服务
    if systemctl is-active --quiet k3s 2>/dev/null; then
        log_success "✅ K3s服务运行正常"
    else
        log_error "❌ K3s服务未运行"
        return 1
    fi
    
    # 检查节点状态
    if kubectl get nodes 2>/dev/null | grep -q "Ready"; then
        local ready_nodes=$(kubectl get nodes --no-headers 2>/dev/null | grep -c "Ready" || echo "0")
        local total_nodes=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
        log_success "✅ K3s节点状态: $ready_nodes/$total_nodes Ready"
    else
        log_error "❌ K3s节点状态异常"
        return 1
    fi
    
    # 检查系统Pod
    if kubectl get pods -A 2>/dev/null | grep -q "Running"; then
        local running_pods=$(kubectl get pods -A --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        local total_pods=$(kubectl get pods -A --no-headers 2>/dev/null | wc -l || echo "0")
        log_success "✅ K3s系统Pod: $running_pods/$total_pods Running"
    else
        log_warning "⚠️ K3s系统Pod状态检查失败"
    fi
}

# 检查监控系统状态
check_monitoring() {
    log_info "📊 检查监控系统状态..."
    
    # 检查现有监控系统
    if docker ps | grep -q "prometheus\|grafana"; then
        log_success "✅ 现有监控系统运行正常"
    else
        log_warning "⚠️ 现有监控系统未检测到"
    fi
    
    # 检查K8s监控系统
    if kubectl get pods -n monitoring 2>/dev/null | grep -q "Running"; then
        local monitoring_pods=$(kubectl get pods -n monitoring --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        log_success "✅ K8s监控系统: $monitoring_pods 个Pod运行中"
    else
        log_warning "⚠️ K8s监控系统未部署或未运行"
    fi
    
    # 检查Prometheus访问
    if curl -s http://localhost:30901/api/v1/status/config 2>/dev/null | grep -q "prometheus"; then
        log_success "✅ K8s Prometheus可访问"
    else
        log_warning "⚠️ K8s Prometheus暂时不可访问"
    fi
    
    # 检查Grafana访问
    if curl -s http://localhost:30301/api/health 2>/dev/null | grep -q "ok"; then
        log_success "✅ K8s Grafana可访问"
    else
        log_warning "⚠️ K8s Grafana暂时不可访问"
    fi
}

# 生成进度报告
generate_progress_report() {
    local report_file="infrastructure/progress-report-$(date +%Y%m%d-%H%M%S).md"
    
    log_info "📋 生成进度报告: $report_file"
    
    cat > "$report_file" <<EOF
# 智游助手v6.2 CI/CD阶段一进度报告

## 📅 报告时间: $(date '+%Y-%m-%d %H:%M:%S')

## 🎯 总体进度

### GitLab CE
$(if check_gitlab &>/dev/null; then echo "- [x] 部署完成"; else echo "- [ ] 部署中或异常"; fi)

### Harbor镜像仓库
$(if check_harbor &>/dev/null; then echo "- [x] 部署完成"; else echo "- [ ] 部署中或异常"; fi)

### K3s集群
$(if check_k3s &>/dev/null; then echo "- [x] 部署完成"; else echo "- [ ] 部署中或异常"; fi)

### 监控系统
$(if check_monitoring &>/dev/null; then echo "- [x] 扩展完成"; else echo "- [ ] 扩展中或异常"; fi)

## 📊 详细状态

### 服务访问地址
- GitLab CE: https://gitlab.smarttravel.local
- Harbor: https://harbor.smarttravel.local
- K8s Prometheus: http://localhost:30901
- K8s Grafana: http://localhost:30301

### 系统资源使用
- CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
- 内存使用率: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
- 磁盘使用率: $(df -h . | awk 'NR==2{print $5}')

### Docker容器状态
\`\`\`
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
\`\`\`

### Kubernetes Pod状态
\`\`\`
$(kubectl get pods -A 2>/dev/null || echo "K3s集群未就绪")
\`\`\`

## 🚨 问题和建议

$(if ! check_gitlab &>/dev/null; then echo "- GitLab服务异常，建议检查容器日志: docker logs smart-travel-gitlab"; fi)
$(if ! check_harbor &>/dev/null; then echo "- Harbor服务异常，建议检查容器状态: docker-compose -f infrastructure/harbor/docker-compose.yml ps"; fi)
$(if ! check_k3s &>/dev/null; then echo "- K3s集群异常，建议检查服务状态: sudo systemctl status k3s"; fi)

## 📈 下一步计划

- [ ] 完成所有服务的配置和测试
- [ ] 开始Week 3-4的CI Pipeline构建
- [ ] 集成现有监控系统数据

---
*报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
EOF

    log_success "✅ 进度报告已生成: $report_file"
}

# 主函数
main() {
    echo "📊 智游助手v6.2 CI/CD阶段一进度跟踪"
    echo "======================================="
    echo ""
    
    # 检查所有服务状态
    check_gitlab
    echo ""
    check_harbor
    echo ""
    check_k3s
    echo ""
    check_monitoring
    echo ""
    
    # 生成进度报告
    generate_progress_report
    
    echo ""
    echo "🎯 总体状态摘要:"
    echo "================"
    
    local services_ok=0
    local total_services=4
    
    if check_gitlab &>/dev/null; then services_ok=$((services_ok + 1)); fi
    if check_harbor &>/dev/null; then services_ok=$((services_ok + 1)); fi
    if check_k3s &>/dev/null; then services_ok=$((services_ok + 1)); fi
    if check_monitoring &>/dev/null; then services_ok=$((services_ok + 1)); fi
    
    local progress_percent=$((services_ok * 100 / total_services))
    
    echo "进度: $services_ok/$total_services 服务正常 ($progress_percent%)"
    
    if [[ $services_ok -eq $total_services ]]; then
        log_success "🎉 所有服务运行正常！"
        echo ""
        echo "📋 下一步操作:"
        echo "1. 访问服务界面进行配置"
        echo "2. 运行集成测试"
        echo "3. 开始Week 3-4的CI Pipeline构建"
    else
        log_warning "⚠️ 部分服务需要关注"
        echo ""
        echo "🔧 建议操作:"
        echo "1. 检查异常服务的日志"
        echo "2. 重新运行部署脚本"
        echo "3. 联系技术支持"
    fi
    
    echo ""
    echo "🔄 定期运行此脚本以跟踪进度:"
    echo "./infrastructure/track-progress.sh"
}

# 执行主函数
main "$@"
