#!/bin/bash

# 智游助手v6.2 基础设施部署脚本
# 阶段一：云原生就绪的自建CI/CD方案

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRASTRUCTURE_DIR="$SCRIPT_DIR"

# 检查依赖和现有监控系统
check_dependencies() {
    log_info "🔍 检查系统依赖和现有监控系统..."

    # 检查immediate-action-plan.md的执行成果
    if [[ -f "src/lib/monitoring/MetricsRegistry.ts" ]] && [[ -f "src/lib/monitoring/MetricsCollector.ts" ]]; then
        log_success "✅ 发现现有监控系统基础设施"
        log_info "将与现有Prometheus+Grafana监控系统集成"
    else
        log_warning "⚠️ 未发现完整的监控系统，建议先执行immediate-action-plan.md"
    fi

    local deps=("docker" "docker-compose")
    local optional_deps=("kubectl" "helm")
    local missing_deps=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少以下必需依赖: ${missing_deps[*]}"
        log_info "请先安装缺少的依赖，然后重新运行此脚本"
        exit 1
    fi

    # 检查可选依赖
    for dep in "${optional_deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_warning "可选依赖 $dep 未安装，将在K3s部署时自动安装"
        fi
    done

    log_success "✅ 依赖检查通过"
}

# 创建SSL证书
create_ssl_certificates() {
    log_info "🔐 创建SSL证书..."
    
    local ssl_dir="$INFRASTRUCTURE_DIR/ssl"
    mkdir -p "$ssl_dir"
    
    if [[ ! -f "$ssl_dir/gitlab.crt" ]]; then
        log_info "生成GitLab SSL证书..."
        
        # 创建证书配置
        cat > "$ssl_dir/gitlab.conf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
ST = Beijing
L = Beijing
O = Smart Travel
OU = IT Department
CN = gitlab.smarttravel.local

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = gitlab.smarttravel.local
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF
        
        # 生成私钥和证书
        openssl genrsa -out "$ssl_dir/gitlab.key" 2048
        openssl req -new -key "$ssl_dir/gitlab.key" -out "$ssl_dir/gitlab.csr" -config "$ssl_dir/gitlab.conf"
        openssl x509 -req -in "$ssl_dir/gitlab.csr" -signkey "$ssl_dir/gitlab.key" -out "$ssl_dir/gitlab.crt" -days 365 -extensions v3_req -extfile "$ssl_dir/gitlab.conf"
        
        # 设置权限
        chmod 600 "$ssl_dir/gitlab.key"
        chmod 644 "$ssl_dir/gitlab.crt"
    fi
    
    if [[ ! -f "$ssl_dir/harbor.crt" ]]; then
        log_info "生成Harbor SSL证书..."
        
        # 创建Harbor证书配置
        cat > "$ssl_dir/harbor.conf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
ST = Beijing
L = Beijing
O = Smart Travel
OU = IT Department
CN = harbor.smarttravel.local

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = harbor.smarttravel.local
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF
        
        # 生成Harbor证书
        openssl genrsa -out "$ssl_dir/harbor.key" 2048
        openssl req -new -key "$ssl_dir/harbor.key" -out "$ssl_dir/harbor.csr" -config "$ssl_dir/harbor.conf"
        openssl x509 -req -in "$ssl_dir/harbor.csr" -signkey "$ssl_dir/harbor.key" -out "$ssl_dir/harbor.crt" -days 365 -extensions v3_req -extfile "$ssl_dir/harbor.conf"
        
        chmod 600 "$ssl_dir/harbor.key"
        chmod 644 "$ssl_dir/harbor.crt"
    fi
    
    log_success "✅ SSL证书创建完成"
}

# 部署GitLab CE
deploy_gitlab() {
    log_info "🦊 部署GitLab CE..."
    
    local gitlab_dir="$INFRASTRUCTURE_DIR/gitlab"
    
    # 检查GitLab配置
    if [[ ! -f "$gitlab_dir/docker-compose.yml" ]]; then
        log_error "GitLab配置文件不存在: $gitlab_dir/docker-compose.yml"
        exit 1
    fi
    
    # 启动GitLab
    cd "$gitlab_dir"
    docker-compose up -d
    
    # 等待GitLab启动
    log_info "等待GitLab服务启动（这可能需要几分钟）..."
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -k -s https://localhost/users/sign_in > /dev/null 2>&1; then
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "GitLab启动超时"
        exit 1
    fi
    
    echo ""
    log_success "✅ GitLab CE部署完成"
    log_info "GitLab访问地址: https://gitlab.smarttravel.local"
    log_info "初始root密码: $(docker exec smart-travel-gitlab grep 'Password:' /etc/gitlab/initial_root_password | cut -d' ' -f2)"
}

# 部署Harbor
deploy_harbor() {
    log_info "🐳 部署Harbor镜像仓库..."
    
    local harbor_dir="$INFRASTRUCTURE_DIR/harbor"
    
    # 检查Harbor配置
    if [[ ! -f "$harbor_dir/docker-compose.yml" ]]; then
        log_error "Harbor配置文件不存在: $harbor_dir/docker-compose.yml"
        exit 1
    fi
    
    # 创建Harbor配置目录
    mkdir -p "$harbor_dir/config/"{core,portal,registry,registryctl,jobservice,nginx,log,trivy}
    
    # 启动Harbor
    cd "$harbor_dir"
    docker-compose up -d
    
    # 等待Harbor启动
    log_info "等待Harbor服务启动..."
    local max_attempts=20
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -k -s https://localhost:443 > /dev/null 2>&1; then
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "Harbor启动超时"
        exit 1
    fi
    
    echo ""
    log_success "✅ Harbor部署完成"
    log_info "Harbor访问地址: https://harbor.smarttravel.local"
    log_info "默认用户名: admin"
    log_info "默认密码: Harbor12345"
}

# 部署K3s集群
deploy_k3s() {
    log_info "☸️ 部署K3s集群..."
    
    local k3s_script="$INFRASTRUCTURE_DIR/k3s/install-k3s-cluster.sh"
    
    if [[ ! -f "$k3s_script" ]]; then
        log_error "K3s安装脚本不存在: $k3s_script"
        exit 1
    fi
    
    # 执行K3s安装脚本
    chmod +x "$k3s_script"
    bash "$k3s_script"
    
    log_success "✅ K3s集群部署完成"
}

# 部署监控系统（扩展现有监控）
deploy_monitoring() {
    log_info "📊 扩展现有监控系统到Kubernetes环境..."

    # 检查现有监控系统
    if [[ -f "docker-compose.yml" ]] && docker-compose ps | grep -q "prometheus\|grafana"; then
        log_info "检测到现有的Docker Compose监控系统"
        log_info "将扩展监控到Kubernetes环境，保持现有监控运行"
    fi

    # 检查kubectl连接
    if ! kubectl get nodes > /dev/null 2>&1; then
        log_error "无法连接到Kubernetes集群"
        exit 1
    fi

    # 应用Prometheus配置（扩展现有配置）
    kubectl apply -f "$INFRASTRUCTURE_DIR/monitoring/prometheus-k8s-config.yaml"

    # 部署Prometheus Operator（与现有监控共存）
    log_info "部署Kubernetes监控组件..."

    # 检查helm是否可用
    if ! command -v helm &> /dev/null; then
        log_info "安装Helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update

    # 使用不同的端口避免与现有监控冲突
    helm upgrade --install k8s-monitoring prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set prometheus.prometheusSpec.configMaps="{prometheus-config}" \
        --set prometheus.prometheusSpec.ruleSelector.matchLabels.app=smart-travel \
        --set grafana.adminPassword=admin123 \
        --set grafana.service.type=NodePort \
        --set grafana.service.nodePort=30301 \
        --set prometheus.service.type=NodePort \
        --set prometheus.service.nodePort=30901 \
        --set prometheus.prometheusSpec.externalUrl="http://localhost:30901" \
        --set grafana.grafana\\.ini.server.root_url="http://localhost:30301" \
        --wait

    # 等待监控系统启动
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=300s

    # 创建监控集成配置
    create_monitoring_integration

    log_success "✅ Kubernetes监控系统部署完成"
    log_info "现有监控系统: http://localhost:3002 (Grafana)"
    log_info "K8s Prometheus: http://localhost:30901"
    log_info "K8s Grafana: http://localhost:30301 (admin/admin123)"
}

# 创建监控集成配置
create_monitoring_integration() {
    log_info "🔗 创建监控系统集成配置..."

    # 创建监控集成配置文件
    cat > "$INFRASTRUCTURE_DIR/monitoring/integration-config.yaml" <<EOF
# 监控系统集成配置
# 连接现有监控系统与新的Kubernetes监控

apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-integration
  namespace: monitoring
data:
  prometheus-federation.yml: |
    # Prometheus联邦配置，聚合现有监控数据
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      # 联邦现有Prometheus实例
      - job_name: 'existing-prometheus'
        scrape_interval: 15s
        honor_labels: true
        metrics_path: '/federate'
        params:
          'match[]':
            - '{job=~"smart-travel.*"}'
            - '{job=~"prometheus"}'
            - '{__name__=~"smart_travel_.*"}'
        static_configs:
          - targets:
            - 'host.docker.internal:9090'  # 现有Prometheus

      # 现有应用监控
      - job_name: 'smart-travel-legacy'
        static_configs:
          - targets:
            - 'host.docker.internal:3000'  # 现有应用
        metrics_path: '/api/metrics'
        scrape_interval: 15s

  grafana-datasources.yml: |
    # Grafana数据源配置
    apiVersion: 1
    datasources:
      - name: 'Legacy Prometheus'
        type: prometheus
        access: proxy
        url: http://host.docker.internal:9090
        isDefault: false
      - name: 'K8s Prometheus'
        type: prometheus
        access: proxy
        url: http://prometheus-operated:9090
        isDefault: true
EOF

    kubectl apply -f "$INFRASTRUCTURE_DIR/monitoring/integration-config.yaml"

    log_success "✅ 监控集成配置创建完成"
}

# 配置GitLab Runner
configure_gitlab_runner() {
    log_info "🏃 配置GitLab Runner..."
    
    # 获取GitLab Runner注册token
    log_info "请在GitLab中获取Runner注册token："
    log_info "1. 访问 https://gitlab.smarttravel.local/admin/runners"
    log_info "2. 复制注册token"
    
    read -p "请输入GitLab Runner注册token: " RUNNER_TOKEN
    
    if [[ -z "$RUNNER_TOKEN" ]]; then
        log_warning "未提供Runner token，跳过Runner配置"
        return
    fi
    
    # 注册Docker Runner
    docker exec smart-travel-gitlab-runner gitlab-runner register \
        --non-interactive \
        --url "https://gitlab.smarttravel.local/" \
        --registration-token "$RUNNER_TOKEN" \
        --executor "docker" \
        --docker-image "node:18-alpine" \
        --description "smart-travel-docker-runner" \
        --tag-list "docker,node,smart-travel" \
        --run-untagged="true" \
        --locked="false" \
        --access-level="not_protected"
    
    log_success "✅ GitLab Runner配置完成"
}

# 验证部署
verify_deployment() {
    log_info "✅ 验证部署状态..."
    
    echo ""
    echo "🔍 服务状态检查:"
    echo "=================="
    
    # 检查GitLab
    if curl -k -s https://localhost/users/sign_in > /dev/null 2>&1; then
        echo "✅ GitLab CE: 运行正常"
    else
        echo "❌ GitLab CE: 服务异常"
    fi
    
    # 检查Harbor
    if curl -k -s https://localhost:443 > /dev/null 2>&1; then
        echo "✅ Harbor: 运行正常"
    else
        echo "❌ Harbor: 服务异常"
    fi
    
    # 检查K3s
    if kubectl get nodes > /dev/null 2>&1; then
        echo "✅ K3s集群: 运行正常"
        kubectl get nodes
    else
        echo "❌ K3s集群: 连接异常"
    fi
    
    # 检查监控系统
    if kubectl get pods -n monitoring | grep -q "Running"; then
        echo "✅ 监控系统: 运行正常"
    else
        echo "❌ 监控系统: 服务异常"
    fi
    
    echo ""
    echo "🌐 访问地址:"
    echo "============"
    echo "GitLab CE: https://gitlab.smarttravel.local"
    echo "Harbor: https://harbor.smarttravel.local"
    echo "Prometheus: http://localhost:30900"
    echo "Grafana: http://localhost:30300"
    echo ""
    echo "📝 下一步:"
    echo "=========="
    echo "1. 配置DNS解析或修改hosts文件"
    echo "2. 在GitLab中创建项目并配置CI/CD"
    echo "3. 配置Harbor项目和用户权限"
    echo "4. 导入Grafana监控仪表板"
    echo ""
}

# 清理函数
cleanup() {
    log_info "🧹 清理临时文件..."
    # 清理临时文件
    rm -f /tmp/k3s-token
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 基础设施部署"
    echo "=================================="
    echo "阶段一：云原生就绪的自建CI/CD方案"
    echo ""
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 检查是否为root用户
    if [[ $EUID -eq 0 ]]; then
        log_warning "不建议使用root用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 执行部署步骤
    check_dependencies
    create_ssl_certificates
    
    # 询问要部署的组件
    echo "请选择要部署的组件:"
    echo "1) 全部部署"
    echo "2) 仅GitLab CE"
    echo "3) 仅Harbor"
    echo "4) 仅K3s集群"
    echo "5) 仅监控系统"
    read -p "请选择 (1-5): " choice
    
    case $choice in
        1)
            deploy_gitlab
            deploy_harbor
            deploy_k3s
            deploy_monitoring
            configure_gitlab_runner
            ;;
        2)
            deploy_gitlab
            configure_gitlab_runner
            ;;
        3)
            deploy_harbor
            ;;
        4)
            deploy_k3s
            ;;
        5)
            deploy_monitoring
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
    
    verify_deployment
    
    echo ""
    log_success "🎉 基础设施部署完成！"
    echo ""
    log_info "💡 提示: 请确保配置DNS解析或hosts文件以访问服务"
    echo "gitlab.smarttravel.local -> 127.0.0.1"
    echo "harbor.smarttravel.local -> 127.0.0.1"
}

# 执行主函数
main "$@"
