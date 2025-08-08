#!/bin/bash

# K3s集群安装脚本
# 智游助手v6.2 Kubernetes集群部署

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
CLUSTER_NAME="smart-travel-k3s"
MASTER_NODE_IP="192.168.1.10"
WORKER_NODES=("192.168.1.11" "192.168.1.12")
K3S_VERSION="v1.28.3+k3s2"
KUBECONFIG_PATH="/etc/rancher/k3s/k3s.yaml"

# 检查系统要求
check_system_requirements() {
    log_info "🔍 检查系统要求..."
    
    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        log_error "无法检测操作系统版本"
        exit 1
    fi
    
    # 检查内存
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -lt 2 ]]; then
        log_warning "内存不足2GB，可能影响性能"
    fi
    
    # 检查磁盘空间
    DISK_SPACE=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_SPACE -lt 20 ]]; then
        log_error "磁盘空间不足20GB"
        exit 1
    fi
    
    log_success "✅ 系统要求检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "📦 安装系统依赖..."
    
    # 更新包管理器
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y curl wget git jq
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y curl wget git jq
    else
        log_error "不支持的包管理器"
        exit 1
    fi
    
    # 安装Docker（如果需要）
    if ! command -v docker &> /dev/null; then
        log_info "安装Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        sudo systemctl enable docker
        sudo systemctl start docker
    fi
    
    log_success "✅ 依赖安装完成"
}

# 配置系统参数
configure_system() {
    log_info "⚙️ 配置系统参数..."
    
    # 禁用swap
    sudo swapoff -a
    sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
    
    # 配置内核参数
    cat <<EOF | sudo tee /etc/sysctl.d/k3s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
    
    # 加载br_netfilter模块
    sudo modprobe br_netfilter
    echo 'br_netfilter' | sudo tee /etc/modules-load.d/k3s.conf
    
    # 应用sysctl参数
    sudo sysctl --system
    
    # 配置防火墙（如果启用）
    if systemctl is-active --quiet firewalld; then
        log_info "配置防火墙规则..."
        sudo firewall-cmd --permanent --add-port=6443/tcp  # K3s API server
        sudo firewall-cmd --permanent --add-port=10250/tcp # Kubelet
        sudo firewall-cmd --permanent --add-port=8472/udp  # Flannel VXLAN
        sudo firewall-cmd --permanent --add-port=51820/udp # Flannel Wireguard
        sudo firewall-cmd --permanent --add-port=51821/udp # Flannel Wireguard
        sudo firewall-cmd --reload
    fi
    
    log_success "✅ 系统参数配置完成"
}

# 安装K3s主节点
install_k3s_master() {
    log_info "🎯 安装K3s主节点..."
    
    # 创建K3s配置目录
    sudo mkdir -p /etc/rancher/k3s
    
    # 创建K3s配置文件
    cat <<EOF | sudo tee /etc/rancher/k3s/config.yaml
cluster-init: true
token: "smart-travel-k3s-token-$(openssl rand -hex 16)"
tls-san:
  - "${MASTER_NODE_IP}"
  - "k3s.smarttravel.local"
node-name: "master-node"
cluster-cidr: "10.42.0.0/16"
service-cidr: "10.43.0.0/16"
cluster-dns: "10.43.0.10"
disable:
  - traefik  # 我们将使用nginx-ingress
write-kubeconfig-mode: "0644"
kube-apiserver-arg:
  - "enable-admission-plugins=NodeRestriction,ResourceQuota"
kube-controller-manager-arg:
  - "bind-address=0.0.0.0"
kube-scheduler-arg:
  - "bind-address=0.0.0.0"
kubelet-arg:
  - "max-pods=110"
EOF
    
    # 安装K3s
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${K3S_VERSION} sh -s - server
    
    # 等待K3s启动
    log_info "等待K3s服务启动..."
    sleep 30
    
    # 验证安装
    sudo k3s kubectl get nodes
    
    # 获取节点token
    K3S_TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)
    echo "K3S_TOKEN=${K3S_TOKEN}" > /tmp/k3s-token
    
    log_success "✅ K3s主节点安装完成"
}

# 安装K3s工作节点
install_k3s_workers() {
    log_info "👥 安装K3s工作节点..."
    
    if [[ ! -f /tmp/k3s-token ]]; then
        log_error "未找到K3s token文件"
        exit 1
    fi
    
    source /tmp/k3s-token
    
    for i in "${!WORKER_NODES[@]}"; do
        WORKER_IP="${WORKER_NODES[$i]}"
        WORKER_NAME="worker-node-$((i+1))"
        
        log_info "安装工作节点: ${WORKER_NAME} (${WORKER_IP})"
        
        # 通过SSH在工作节点上安装K3s
        ssh root@${WORKER_IP} "
            # 配置系统参数
            swapoff -a
            sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
            
            # 安装K3s agent
            curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${K3S_VERSION} K3S_URL=https://${MASTER_NODE_IP}:6443 K3S_TOKEN=${K3S_TOKEN} sh -s - agent --node-name=${WORKER_NAME}
        "
        
        log_success "✅ 工作节点 ${WORKER_NAME} 安装完成"
    done
}

# 安装网络插件
install_network_plugin() {
    log_info "🌐 安装网络插件..."
    
    # K3s默认使用Flannel，我们可以选择Calico作为替代
    if [[ "${NETWORK_PLUGIN:-flannel}" == "calico" ]]; then
        log_info "安装Calico网络插件..."
        
        # 下载Calico manifest
        curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml
        curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/custom-resources.yaml
        
        # 应用Calico
        sudo k3s kubectl apply -f tigera-operator.yaml
        sudo k3s kubectl apply -f custom-resources.yaml
        
        # 等待Calico启动
        sudo k3s kubectl wait --for=condition=Ready pods -l k8s-app=calico-node -n calico-system --timeout=300s
    else
        log_info "使用默认Flannel网络插件"
    fi
    
    log_success "✅ 网络插件安装完成"
}

# 安装Ingress控制器
install_ingress_controller() {
    log_info "🚪 安装Nginx Ingress控制器..."
    
    # 安装nginx-ingress
    sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
    
    # 等待Ingress控制器启动
    sudo k3s kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log_success "✅ Nginx Ingress控制器安装完成"
}

# 安装存储类
install_storage_class() {
    log_info "💾 配置存储类..."
    
    # 创建本地存储类
    cat <<EOF | sudo k3s kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
EOF
    
    # 如果需要NFS存储
    if [[ "${ENABLE_NFS:-false}" == "true" ]]; then
        log_info "配置NFS存储类..."
        
        # 安装NFS CSI驱动
        sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/example/nfs-provisioner/nfs-server.yaml
        sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/v4.4.0/rbac-csi-nfs-controller.yaml
        sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/v4.4.0/csi-nfs-driverinfo.yaml
        sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/v4.4.0/csi-nfs-controller.yaml
        sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/v4.4.0/csi-nfs-node.yaml
    fi
    
    log_success "✅ 存储类配置完成"
}

# 安装cert-manager
install_cert_manager() {
    log_info "🔐 安装cert-manager..."
    
    # 安装cert-manager
    sudo k3s kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
    
    # 等待cert-manager启动
    sudo k3s kubectl wait --namespace cert-manager \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/instance=cert-manager \
        --timeout=300s
    
    # 创建Let's Encrypt ClusterIssuer
    cat <<EOF | sudo k3s kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@smarttravel.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    log_success "✅ cert-manager安装完成"
}

# 配置kubectl
configure_kubectl() {
    log_info "⚙️ 配置kubectl..."
    
    # 复制kubeconfig到用户目录
    mkdir -p ~/.kube
    sudo cp ${KUBECONFIG_PATH} ~/.kube/config
    sudo chown $(id -u):$(id -g) ~/.kube/config
    
    # 设置环境变量
    echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
    echo 'alias k=kubectl' >> ~/.bashrc
    
    log_success "✅ kubectl配置完成"
}

# 验证集群
verify_cluster() {
    log_info "✅ 验证K3s集群..."
    
    # 检查节点状态
    echo "节点状态:"
    sudo k3s kubectl get nodes -o wide
    
    # 检查系统Pod状态
    echo -e "\n系统Pod状态:"
    sudo k3s kubectl get pods -A
    
    # 检查服务状态
    echo -e "\n服务状态:"
    sudo k3s kubectl get svc -A
    
    # 运行测试Pod
    log_info "运行测试Pod..."
    sudo k3s kubectl run test-pod --image=nginx:alpine --rm -it --restart=Never -- /bin/sh -c "echo 'K3s集群测试成功!'"
    
    log_success "✅ K3s集群验证完成"
}

# 创建监控命名空间
create_monitoring_namespace() {
    log_info "📊 创建监控命名空间..."
    
    cat <<EOF | sudo k3s kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: smart-travel-staging
  labels:
    name: smart-travel-staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: smart-travel-production
  labels:
    name: smart-travel-production
EOF
    
    log_success "✅ 监控命名空间创建完成"
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 K3s集群安装"
    echo "=================================="
    echo ""
    
    # 检查是否为root用户
    if [[ $EUID -eq 0 ]]; then
        log_warning "建议使用非root用户运行此脚本"
    fi
    
    # 执行安装步骤
    check_system_requirements
    install_dependencies
    configure_system
    install_k3s_master
    
    # 如果有工作节点，则安装
    if [[ ${#WORKER_NODES[@]} -gt 0 ]]; then
        install_k3s_workers
    fi
    
    install_network_plugin
    install_ingress_controller
    install_storage_class
    install_cert_manager
    configure_kubectl
    create_monitoring_namespace
    verify_cluster
    
    echo ""
    log_success "🎉 K3s集群安装完成！"
    echo ""
    echo "📝 下一步:"
    echo "1. 配置DNS解析: k3s.smarttravel.local -> ${MASTER_NODE_IP}"
    echo "2. 部署监控系统: kubectl apply -f monitoring/"
    echo "3. 部署应用: helm install smart-travel ./helm/smart-travel"
    echo ""
    echo "🔧 管理命令:"
    echo "- 查看集群状态: kubectl get nodes"
    echo "- 查看所有Pod: kubectl get pods -A"
    echo "- 重启K3s: sudo systemctl restart k3s"
    echo ""
}

# 执行主函数
main "$@"
