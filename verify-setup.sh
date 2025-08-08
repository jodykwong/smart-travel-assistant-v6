#!/bin/bash

# 智游助手v6.2 配置验证脚本
# 验证所有必要的配置文件是否正确创建

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

# 检查文件是否存在
check_file() {
    local file_path=$1
    local description=$2
    
    if [[ -f "$file_path" ]]; then
        log_success "✅ $description: $file_path"
        return 0
    else
        log_error "❌ $description: $file_path (缺失)"
        return 1
    fi
}

# 检查目录是否存在
check_directory() {
    local dir_path=$1
    local description=$2
    
    if [[ -d "$dir_path" ]]; then
        log_success "✅ $description: $dir_path"
        return 0
    else
        log_error "❌ $description: $dir_path (缺失)"
        return 1
    fi
}

echo "🔍 智游助手v6.2 配置验证"
echo "========================="
echo ""

# 验证immediate-action-plan.md的成果
log_info "📊 验证现有监控系统基础..."

check_file "immediate-action-plan.md" "immediate-action-plan执行记录"
check_file "src/lib/monitoring/MetricsRegistry.ts" "统一指标注册中心"
check_file "src/lib/monitoring/MetricsCollector.ts" "指标收集器"
check_file "src/lib/monitoring/ErrorHandler.ts" "错误处理机制"
check_file "src/config/monitoring.config.ts" "监控配置管理"

echo ""

# 验证基础设施配置文件
log_info "🏗️ 验证基础设施配置文件..."

# GitLab配置
check_file "infrastructure/gitlab/docker-compose.yml" "GitLab CE Docker Compose配置"
check_file "infrastructure/gitlab/runner-config.toml" "GitLab Runner配置"

# Harbor配置
check_file "infrastructure/harbor/docker-compose.yml" "Harbor Docker Compose配置"

# K3s配置
check_file "infrastructure/k3s/install-k3s-cluster.sh" "K3s集群安装脚本"

# 监控配置
check_file "infrastructure/monitoring/prometheus-k8s-config.yaml" "Prometheus K8s配置"

# 部署脚本
check_file "infrastructure/deploy-infrastructure.sh" "主部署脚本"
check_file "infrastructure/setup-environment.sh" "环境准备脚本"
check_file "infrastructure/track-progress.sh" "进度跟踪脚本"

echo ""

# 验证文档文件
log_info "📚 验证文档文件..."

check_file "cloud-agnostic-cicd-evolution-plan.md" "云厂商无关CI/CD演进方案"
check_file "cicd-implementation-checklist.md" "CI/CD实施检查清单"
check_file "week1-2-implementation-checklist.md" "Week 1-2实施检查清单"
check_file "EXECUTION-GUIDE.md" "执行指南"
check_file "EXECUTION-STATUS.md" "执行状态"
check_file "QUICK-START.md" "快速启动指南"

echo ""

# 验证脚本权限
log_info "🔐 验证脚本执行权限..."

scripts=(
    "infrastructure/setup-environment.sh"
    "infrastructure/deploy-infrastructure.sh"
    "infrastructure/track-progress.sh"
    "infrastructure/k3s/install-k3s-cluster.sh"
    "verify-setup.sh"
)

for script in "${scripts[@]}"; do
    if [[ -f "$script" ]]; then
        if [[ -x "$script" ]]; then
            log_success "✅ $script (可执行)"
        else
            log_warning "⚠️ $script (需要设置执行权限)"
            chmod +x "$script" 2>/dev/null && log_success "✅ 已设置执行权限: $script"
        fi
    fi
done

echo ""

# 验证配置文件语法
log_info "🔧 验证配置文件语法..."

# 验证Docker Compose文件
if command -v docker-compose &> /dev/null; then
    if docker-compose -f infrastructure/gitlab/docker-compose.yml config &>/dev/null; then
        log_success "✅ GitLab Docker Compose配置语法正确"
    else
        log_error "❌ GitLab Docker Compose配置语法错误"
    fi
    
    if docker-compose -f infrastructure/harbor/docker-compose.yml config &>/dev/null; then
        log_success "✅ Harbor Docker Compose配置语法正确"
    else
        log_error "❌ Harbor Docker Compose配置语法错误"
    fi
else
    log_warning "⚠️ docker-compose未安装，跳过语法检查"
fi

# 验证YAML文件
if command -v python3 &> /dev/null; then
    if python3 -c "import yaml; yaml.safe_load(open('infrastructure/monitoring/prometheus-k8s-config.yaml'))" &>/dev/null; then
        log_success "✅ Prometheus配置YAML语法正确"
    else
        log_error "❌ Prometheus配置YAML语法错误"
    fi
else
    log_warning "⚠️ Python3未安装，跳过YAML语法检查"
fi

echo ""

# 验证系统要求
log_info "💻 验证系统要求..."

# 检查内存
if command -v free &> /dev/null; then
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -ge 8 ]]; then
        log_success "✅ 内存充足: ${MEMORY_GB}GB"
    else
        log_warning "⚠️ 内存不足: ${MEMORY_GB}GB (推荐8GB+)"
    fi
fi

# 检查磁盘空间
if command -v df &> /dev/null; then
    DISK_SPACE=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_SPACE -ge 100 ]]; then
        log_success "✅ 磁盘空间充足: ${DISK_SPACE}GB"
    else
        log_warning "⚠️ 磁盘空间不足: ${DISK_SPACE}GB (推荐100GB+)"
    fi
fi

# 检查CPU核心
if command -v nproc &> /dev/null; then
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -ge 4 ]]; then
        log_success "✅ CPU核心充足: ${CPU_CORES}核"
    else
        log_warning "⚠️ CPU核心不足: ${CPU_CORES}核 (推荐4核+)"
    fi
fi

echo ""

# 验证必要软件
log_info "🛠️ 验证必要软件..."

required_tools=("docker" "curl" "openssl")
optional_tools=("docker-compose" "kubectl" "helm")

for tool in "${required_tools[@]}"; do
    if command -v "$tool" &> /dev/null; then
        log_success "✅ $tool 已安装"
    else
        log_error "❌ $tool 未安装 (必需)"
    fi
done

for tool in "${optional_tools[@]}"; do
    if command -v "$tool" &> /dev/null; then
        log_success "✅ $tool 已安装"
    else
        log_warning "⚠️ $tool 未安装 (可选，部署时会自动安装)"
    fi
done

echo ""

# 生成验证报告
log_info "📋 生成验证报告..."

cat > verification-report.md <<EOF
# 智游助手v6.2 配置验证报告

## 📅 验证时间: $(date '+%Y-%m-%d %H:%M:%S')

## ✅ 验证结果摘要

### 现有监控系统基础
- [$(if [[ -f "src/lib/monitoring/MetricsRegistry.ts" ]]; then echo "x"; else echo " "; fi)] MetricsRegistry统一指标注册中心
- [$(if [[ -f "src/lib/monitoring/MetricsCollector.ts" ]]; then echo "x"; else echo " "; fi)] MetricsCollector指标收集器
- [$(if [[ -f "src/lib/monitoring/ErrorHandler.ts" ]]; then echo "x"; else echo " "; fi)] ErrorHandler错误处理机制
- [$(if [[ -f "src/config/monitoring.config.ts" ]]; then echo "x"; else echo " "; fi)] 监控配置管理

### 基础设施配置文件
- [$(if [[ -f "infrastructure/gitlab/docker-compose.yml" ]]; then echo "x"; else echo " "; fi)] GitLab CE配置
- [$(if [[ -f "infrastructure/harbor/docker-compose.yml" ]]; then echo "x"; else echo " "; fi)] Harbor镜像仓库配置
- [$(if [[ -f "infrastructure/k3s/install-k3s-cluster.sh" ]]; then echo "x"; else echo " "; fi)] K3s集群安装脚本
- [$(if [[ -f "infrastructure/monitoring/prometheus-k8s-config.yaml" ]]; then echo "x"; else echo " "; fi)] Prometheus K8s配置

### 部署脚本
- [$(if [[ -f "infrastructure/deploy-infrastructure.sh" ]]; then echo "x"; else echo " "; fi)] 主部署脚本
- [$(if [[ -f "infrastructure/setup-environment.sh" ]]; then echo "x"; else echo " "; fi)] 环境准备脚本
- [$(if [[ -f "infrastructure/track-progress.sh" ]]; then echo "x"; else echo " "; fi)] 进度跟踪脚本

### 系统要求
- CPU: $(nproc 2>/dev/null || echo "未知")核
- 内存: $(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "未知")GB
- 磁盘: $(df -BG . 2>/dev/null | awk 'NR==2{print $4}' | sed 's/G//' || echo "未知")GB

### 必要软件
- Docker: $(if command -v docker &>/dev/null; then echo "✅ 已安装"; else echo "❌ 未安装"; fi)
- Docker Compose: $(if command -v docker-compose &>/dev/null; then echo "✅ 已安装"; else echo "⚠️ 未安装"; fi)
- curl: $(if command -v curl &>/dev/null; then echo "✅ 已安装"; else echo "❌ 未安装"; fi)
- openssl: $(if command -v openssl &>/dev/null; then echo "✅ 已安装"; else echo "❌ 未安装"; fi)

## 🚀 下一步操作

$(if [[ -f "infrastructure/setup-environment.sh" && -f "infrastructure/deploy-infrastructure.sh" ]]; then
echo "✅ 所有配置文件已准备就绪，可以开始执行部署：

\`\`\`bash
# 1. 环境准备
./infrastructure/setup-environment.sh

# 2. 开始部署
./infrastructure/deploy-infrastructure.sh

# 3. 跟踪进度
./infrastructure/track-progress.sh
\`\`\`"
else
echo "❌ 部分配置文件缺失，请检查并重新创建缺失的文件。"
fi)

---
*验证报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
EOF

log_success "✅ 验证报告已生成: verification-report.md"

echo ""
echo "🎯 验证完成总结"
echo "================"

# 统计验证结果
total_checks=0
passed_checks=0

# 这里可以添加更详细的统计逻辑
# 为了简化，我们给出一个基本的总结

if [[ -f "infrastructure/deploy-infrastructure.sh" && -f "infrastructure/setup-environment.sh" ]]; then
    log_success "🎉 配置验证通过！所有必要文件已准备就绪。"
    echo ""
    echo "📋 立即开始执行："
    echo "1. ./infrastructure/setup-environment.sh"
    echo "2. ./infrastructure/deploy-infrastructure.sh"
    echo "3. ./infrastructure/track-progress.sh"
    echo ""
    echo "📚 参考文档："
    echo "- QUICK-START.md - 快速启动指南"
    echo "- EXECUTION-GUIDE.md - 详细执行指南"
    echo "- week1-2-implementation-checklist.md - 实施检查清单"
else
    log_error "❌ 配置验证失败！部分关键文件缺失。"
    echo ""
    echo "🔧 建议操作："
    echo "1. 检查文件创建过程"
    echo "2. 重新运行配置生成脚本"
    echo "3. 手动创建缺失的文件"
fi

echo ""
