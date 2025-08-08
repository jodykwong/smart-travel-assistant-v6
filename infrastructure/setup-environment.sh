#!/bin/bash

# 智游助手v6.2 环境准备脚本
# 阶段一：基础设施搭建环境准备

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

echo "🚀 智游助手v6.2 环境准备"
echo "=========================="
echo ""

# 1. 检查系统要求
log_info "🔍 检查系统要求..."

# 检查内存
MEMORY_GB=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
if [[ $MEMORY_GB -lt 8 ]]; then
    log_warning "内存 ${MEMORY_GB}GB < 推荐的8GB，可能影响性能"
else
    log_success "内存检查通过: ${MEMORY_GB}GB"
fi

# 检查磁盘空间
DISK_SPACE=$(df -BG . 2>/dev/null | awk 'NR==2{print $4}' | sed 's/G//' || echo "0")
if [[ $DISK_SPACE -lt 100 ]]; then
    log_warning "磁盘空间 ${DISK_SPACE}GB < 推荐的100GB"
else
    log_success "磁盘空间检查通过: ${DISK_SPACE}GB"
fi

# 检查CPU核心数
CPU_CORES=$(nproc 2>/dev/null || echo "1")
if [[ $CPU_CORES -lt 4 ]]; then
    log_warning "CPU核心数 ${CPU_CORES} < 推荐的4核"
else
    log_success "CPU检查通过: ${CPU_CORES}核"
fi

# 2. 检查必要软件
log_info "🔧 检查必要软件..."

check_command() {
    if command -v $1 &> /dev/null; then
        log_success "$1 已安装: $(command -v $1)"
        return 0
    else
        log_error "$1 未安装"
        return 1
    fi
}

MISSING_DEPS=()

# 检查Docker
if ! check_command docker; then
    MISSING_DEPS+=("docker")
fi

# 检查Docker Compose
if ! check_command docker-compose; then
    MISSING_DEPS+=("docker-compose")
fi

# 检查curl
if ! check_command curl; then
    MISSING_DEPS+=("curl")
fi

# 检查openssl
if ! check_command openssl; then
    MISSING_DEPS+=("openssl")
fi

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
    log_error "缺少以下依赖: ${MISSING_DEPS[*]}"
    log_info "请先安装缺少的依赖："
    echo ""
    echo "Ubuntu/Debian:"
    echo "sudo apt update && sudo apt install -y docker.io docker-compose curl openssl"
    echo ""
    echo "CentOS/RHEL:"
    echo "sudo yum install -y docker docker-compose curl openssl"
    echo ""
    echo "macOS:"
    echo "brew install docker docker-compose curl openssl"
    echo ""
    exit 1
fi

# 3. 创建目录结构
log_info "📁 创建项目目录结构..."

# 创建基础设施目录
mkdir -p infrastructure/{gitlab,harbor,k3s,monitoring,ssl}
mkdir -p infrastructure/gitlab/{config,data,logs}
mkdir -p infrastructure/harbor/{config,data}
mkdir -p infrastructure/k3s/{scripts,configs}
mkdir -p infrastructure/monitoring/{configs,dashboards}

# 创建日志目录
mkdir -p logs/{gitlab,harbor,k3s,monitoring}

# 创建备份目录
mkdir -p backups/{gitlab,harbor,k3s}

log_success "✅ 目录结构创建完成"

# 4. 设置权限
log_info "🔐 设置文件权限..."

# 设置脚本执行权限
find infrastructure -name "*.sh" -type f -exec chmod +x {} \;

# 创建SSL目录权限
chmod 755 infrastructure/ssl

log_success "✅ 权限设置完成"

# 5. 检查Docker服务
log_info "🐳 检查Docker服务状态..."

if systemctl is-active --quiet docker 2>/dev/null; then
    log_success "Docker服务正在运行"
elif service docker status &>/dev/null; then
    log_success "Docker服务正在运行"
else
    log_warning "Docker服务未运行，尝试启动..."
    if sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null; then
        log_success "Docker服务启动成功"
    else
        log_error "无法启动Docker服务，请手动启动"
        exit 1
    fi
fi

# 测试Docker命令
if docker ps &>/dev/null; then
    log_success "Docker命令测试通过"
else
    log_warning "Docker命令需要sudo权限，建议将当前用户添加到docker组："
    echo "sudo usermod -aG docker \$USER"
    echo "然后重新登录或执行: newgrp docker"
fi

# 6. 检查网络连通性
log_info "🌐 检查网络连通性..."

if curl -s --connect-timeout 5 https://www.google.com &>/dev/null; then
    log_success "网络连通性正常"
else
    log_warning "网络连通性检查失败，可能影响镜像下载"
fi

# 7. 检查现有监控系统
log_info "📊 检查现有监控系统..."

if [[ -f "src/lib/monitoring/MetricsRegistry.ts" ]]; then
    log_success "发现现有监控系统 - MetricsRegistry"
fi

if [[ -f "src/lib/monitoring/MetricsCollector.ts" ]]; then
    log_success "发现现有监控系统 - MetricsCollector"
fi

if [[ -f "src/lib/monitoring/ErrorHandler.ts" ]]; then
    log_success "发现现有监控系统 - ErrorHandler"
fi

if [[ -f "src/config/monitoring.config.ts" ]]; then
    log_success "发现现有监控配置"
fi

# 8. 生成环境配置文件
log_info "⚙️ 生成环境配置文件..."

cat > infrastructure/.env <<EOF
# 智游助手v6.2 基础设施环境配置

# 基础配置
PROJECT_NAME=smart-travel
PROJECT_VERSION=6.2.0
ENVIRONMENT=development

# 域名配置
GITLAB_DOMAIN=gitlab.smarttravel.local
HARBOR_DOMAIN=harbor.smarttravel.local
K3S_DOMAIN=k3s.smarttravel.local

# GitLab配置
GITLAB_ROOT_PASSWORD=SmartTravel2024!
GITLAB_SMTP_SERVER=smtp.qq.com
GITLAB_SMTP_PORT=587
GITLAB_SMTP_USER=smarttravel@qq.com
GITLAB_SMTP_PASSWORD=your_smtp_password

# Harbor配置
HARBOR_ADMIN_PASSWORD=Harbor2024!
HARBOR_DB_PASSWORD=HarborDB2024!

# K3s配置
K3S_VERSION=v1.28.3+k3s2
K3S_TOKEN=smart-travel-k3s-token-$(openssl rand -hex 16)

# 监控配置
PROMETHEUS_RETENTION=15d
GRAFANA_ADMIN_PASSWORD=Grafana2024!

# 资源配置
GITLAB_MEMORY_LIMIT=4g
HARBOR_MEMORY_LIMIT=2g
PROMETHEUS_MEMORY_LIMIT=2g
GRAFANA_MEMORY_LIMIT=1g
EOF

log_success "✅ 环境配置文件生成完成"

# 9. 创建进度跟踪文件
log_info "📋 创建进度跟踪文件..."

cat > infrastructure/progress-tracker.md <<EOF
# 智游助手v6.2 CI/CD阶段一进度跟踪

## 📅 开始时间: $(date '+%Y-%m-%d %H:%M:%S')

## 🎯 总体目标
- [ ] GitLab CE部署和配置
- [ ] Harbor镜像仓库搭建
- [ ] K3s集群搭建
- [ ] 监控系统扩展

## 📊 每日进度记录

### $(date '+%Y-%m-%d')
#### 完成任务:
- [x] 环境准备和系统检查
- [ ] 

#### 遇到问题:
- 

#### 明日计划:
- [ ] 开始GitLab CE部署

#### 风险评估:
- 
EOF

log_success "✅ 进度跟踪文件创建完成"

# 10. 显示总结信息
echo ""
echo "🎉 环境准备完成！"
echo "=================="
echo ""
echo "📁 创建的目录结构:"
echo "infrastructure/"
echo "├── gitlab/          # GitLab CE配置和数据"
echo "├── harbor/          # Harbor镜像仓库配置"
echo "├── k3s/            # K3s集群配置"
echo "├── monitoring/     # 监控系统配置"
echo "├── ssl/            # SSL证书"
echo "└── .env            # 环境变量配置"
echo ""
echo "📋 下一步操作:"
echo "1. 检查并修改 infrastructure/.env 中的配置"
echo "2. 执行部署脚本: ./infrastructure/deploy-infrastructure.sh"
echo "3. 跟踪进度: 更新 infrastructure/progress-tracker.md"
echo ""
echo "🔧 快速开始:"
echo "./infrastructure/deploy-infrastructure.sh"
echo ""

log_success "✅ 环境准备脚本执行完成"
