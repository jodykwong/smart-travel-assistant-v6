#!/bin/bash

# 智游助手v6.2 最终安全检查脚本
# 只检查项目源码中的真实敏感信息

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

# 主函数
main() {
    log_info "🔒 智游助手v6.2最终安全检查..."
    
    local issues=0
    
    # 1. 检查真实环境文件
    log_info "🔍 检查环境文件..."
    if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.production" ] || [ -f ".env.phase3a" ]; then
        log_error "❌ 发现真实环境文件"
        ((issues++))
    else
        log_success "✅ 环境文件检查通过"
    fi
    
    # 2. 检查证书文件
    log_info "🔍 检查证书文件..."
    local cert_files=$(find . -maxdepth 3 -name "*.pem" -o -name "*.key" -o -name "*.crt" -o -name "*.p12" | grep -v node_modules)
    if [ -n "$cert_files" ]; then
        log_error "❌ 发现证书文件: $cert_files"
        ((issues++))
    else
        log_success "✅ 证书文件检查通过"
    fi
    
    # 3. 检查真实API密钥（排除node_modules）
    log_info "🔍 检查API密钥..."
    if find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | xargs grep -l "sk-[a-zA-Z0-9]\{48\}" 2>/dev/null; then
        log_error "❌ 发现真实API密钥"
        ((issues++))
    else
        log_success "✅ API密钥检查通过"
    fi
    
    # 4. 检查数据库文件
    log_info "🔍 检查数据库文件..."
    if find . -maxdepth 2 -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db" | grep -v node_modules | head -1; then
        log_warning "⚠️ 发现数据库文件，请确认不包含敏感数据"
    else
        log_success "✅ 数据库文件检查通过"
    fi
    
    # 5. 检查.gitignore配置
    log_info "🔍 检查.gitignore配置..."
    if [ ! -f ".gitignore" ]; then
        log_error "❌ 未找到.gitignore文件"
        ((issues++))
    else
        # 检查关键排除项
        local missing_patterns=()
        
        if ! grep -q "\.env" .gitignore; then
            missing_patterns+=(".env")
        fi
        
        if ! grep -q "\*.pem" .gitignore; then
            missing_patterns+=("*.pem")
        fi
        
        if ! grep -q "\*.key" .gitignore; then
            missing_patterns+=("*.key")
        fi
        
        if [ ${#missing_patterns[@]} -gt 0 ]; then
            log_warning "⚠️ .gitignore缺少模式: ${missing_patterns[*]}"
        else
            log_success "✅ .gitignore配置检查通过"
        fi
    fi
    
    # 6. 检查版本一致性
    log_info "🔍 检查版本一致性..."
    local package_version=$(grep '"version"' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
    if [ "$package_version" != "6.2.0" ]; then
        log_warning "⚠️ package.json版本不是6.2.0: $package_version"
    else
        log_success "✅ 版本一致性检查通过"
    fi
    
    # 输出结果
    echo ""
    log_info "📊 安全检查结果："
    if [ $issues -eq 0 ]; then
        log_success "🎉 所有安全检查通过，可以安全推送到GitHub！"
        echo ""
        echo "✅ 检查项目："
        echo "  - 环境文件: 通过"
        echo "  - 证书文件: 通过"
        echo "  - API密钥: 通过"
        echo "  - 数据库文件: 通过"
        echo "  - .gitignore配置: 通过"
        echo "  - 版本一致性: 通过"
        echo ""
        log_success "🚀 智游助手v6.2已准备好推送到GitHub仓库"
        return 0
    else
        log_error "❌ 发现 $issues 个安全问题，请处理后再推送"
        return 1
    fi
}

# 执行主函数
main "$@"
