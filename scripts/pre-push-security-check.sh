#!/bin/bash

# 智游助手v6.2 推送前安全检查脚本
# 专门检查真正的敏感信息

set -e

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

# 检查真实敏感信息
check_real_secrets() {
    log_info "🔍 检查真实敏感信息..."
    
    local issues=0
    
    # 检查真实API密钥
    if find . -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.env*" | xargs grep -l "sk-[a-zA-Z0-9]\{48\}" 2>/dev/null; then
        log_error "❌ 发现真实OpenAI API密钥"
        ((issues++))
    fi
    
    # 检查真实数据库密码
    if find . -name "*.ts" -o -name "*.js" -o -name "*.json" | xargs grep -l "password.*[^test][^demo][^example].*[a-zA-Z0-9]\{8,\}" 2>/dev/null; then
        log_warning "⚠️ 可能包含真实密码，请检查"
    fi
    
    # 检查真实证书文件
    if find . -name "*.pem" -o -name "*.key" -o -name "*.crt" 2>/dev/null | head -1; then
        log_error "❌ 发现证书文件"
        ((issues++))
    fi
    
    return $issues
}

# 检查环境文件
check_env_files() {
    log_info "🔍 检查环境文件..."
    
    local issues=0
    
    # 检查是否存在真实环境文件
    local real_env_files=(
        ".env"
        ".env.local"
        ".env.production"
        ".env.phase3a"
    )
    
    for env_file in "${real_env_files[@]}"; do
        if [ -f "$env_file" ]; then
            log_error "❌ 发现真实环境文件: $env_file"
            ((issues++))
        fi
    done
    
    return $issues
}

# 检查数据库文件
check_database_files() {
    log_info "🔍 检查数据库文件..."
    
    local issues=0
    
    # 检查SQLite数据库文件
    if find . -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db" 2>/dev/null | head -1; then
        log_warning "⚠️ 发现数据库文件，请确认不包含敏感数据"
    fi
    
    return $issues
}

# 检查.gitignore配置
check_gitignore() {
    log_info "🔍 检查.gitignore配置..."
    
    if [ ! -f ".gitignore" ]; then
        log_error "❌ 未找到.gitignore文件"
        return 1
    fi
    
    # 检查关键排除项
    local required_patterns=(
        ".env"
        "*.pem"
        "*.key"
        "certs/"
        "*.db"
    )
    
    for pattern in "${required_patterns[@]}"; do
        if ! grep -q "$pattern" .gitignore; then
            log_warning "⚠️ .gitignore缺少模式: $pattern"
        fi
    done
    
    log_success "✅ .gitignore配置检查完成"
    return 0
}

# 主函数
main() {
    log_info "🚀 开始智游助手v6.2推送前安全检查..."
    
    local total_issues=0
    
    # 执行各项检查
    if ! check_real_secrets; then
        ((total_issues++))
    fi
    
    if ! check_env_files; then
        ((total_issues++))
    fi
    
    if ! check_database_files; then
        ((total_issues++))
    fi
    
    if ! check_gitignore; then
        ((total_issues++))
    fi
    
    # 输出结果
    if [ $total_issues -eq 0 ]; then
        log_success "✅ 安全检查通过，可以安全推送到GitHub"
        return 0
    else
        log_error "❌ 发现 $total_issues 个安全问题，请处理后再推送"
        return 1
    fi
}

# 执行主函数
main "$@"
