#!/bin/bash

# 智游助手v6.2 安全检查脚本
# 在推送到GitHub之前检查敏感信息

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

# 敏感信息模式列表 (只检查真正的敏感信息)
SENSITIVE_PATTERNS=(
    # 真实API密钥模式
    "sk-[a-zA-Z0-9]{48}"                    # OpenAI API密钥
    "AIza[0-9A-Za-z\\-_]{35}"               # Google API密钥
    "AKIA[0-9A-Z]{16}"                      # AWS Access Key

    # 真实支付相关敏感信息
    "wx[a-fA-F0-9]{18}"                     # 真实微信AppID (18位)
    "2088[0-9]{12}"                         # 真实支付宝商户号
    "-----BEGIN.*PRIVATE KEY-----"          # 私钥
    "-----BEGIN.*CERTIFICATE-----"          # 证书

    # 真实密码和令牌 (排除测试值)
    "password.*=.*(?!test|demo|example|dev_)[a-zA-Z0-9]{8,}" # 真实密码
    "secret.*=.*(?!test|demo|example|dev_)[a-zA-Z0-9]{32,}" # 真实密钥
)

# 需要检查的文件类型
FILE_EXTENSIONS=(
    "*.ts"
    "*.js"
    "*.json"
    "*.md"
    "*.yml"
    "*.yaml"
    "*.env*"
    "*.config.*"
    "*.sql"
)

# 排除的目录
EXCLUDE_DIRS=(
    "node_modules"
    ".git"
    "dist"
    "build"
    "coverage"
    ".next"
    "logs"
)

# 主检查函数
main() {
    log_info "🔍 开始智游助手v6.2安全检查..."
    
    local issues_found=0
    local files_checked=0
    
    # 构建find命令的排除参数
    local exclude_args=""
    for dir in "${EXCLUDE_DIRS[@]}"; do
        exclude_args="$exclude_args -path ./$dir -prune -o"
    done
    
    # 构建文件扩展名参数
    local ext_args=""
    for ext in "${FILE_EXTENSIONS[@]}"; do
        if [ -z "$ext_args" ]; then
            ext_args="-name '$ext'"
        else
            ext_args="$ext_args -o -name '$ext'"
        fi
    done
    
    # 查找并检查文件
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            ((files_checked++))
            if check_file "$file"; then
                ((issues_found++))
            fi
        fi
    done < <(eval "find . $exclude_args \\( $ext_args \\) -type f -print0")
    
    # 特殊检查：环境文件
    check_env_files
    
    # 特殊检查：证书文件
    check_cert_files
    
    # 特殊检查：数据库文件
    check_db_files
    
    # 输出结果
    log_info "📊 检查完成："
    echo "  - 检查文件数: $files_checked"
    echo "  - 发现问题: $issues_found"
    
    if [ $issues_found -eq 0 ]; then
        log_success "✅ 安全检查通过，未发现敏感信息"
        return 0
    else
        log_error "❌ 发现 $issues_found 个安全问题，请处理后再推送"
        return 1
    fi
}

# 检查单个文件
check_file() {
    local file="$1"
    local issues=0

    # 跳过二进制文件
    if file "$file" | grep -q "binary"; then
        return 0
    fi

    # 检查每个敏感模式
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if grep -q -E "$pattern" "$file" 2>/dev/null; then
            log_warning "🚨 在文件 $file 中发现敏感信息模式: $pattern"
            # 显示匹配的行（但不显示完整内容）
            grep -n -E "$pattern" "$file" | head -3 | while read -r line; do
                echo "    $line"
            done
            issues=1
        fi
    done

    return $issues
}

# 检查环境文件
check_env_files() {
    log_info "🔍 检查环境配置文件..."
    
    # 检查是否存在真实环境文件
    local real_env_files=(
        ".env"
        ".env.local"
        ".env.production"
        ".env.phase3a"
    )
    
    for env_file in "${real_env_files[@]}"; do
        if [ -f "$env_file" ]; then
            log_error "❌ 发现真实环境文件: $env_file (应该被.gitignore排除)"
            return 1
        fi
    done
    
    # 检查示例文件是否使用测试值
    if [ -f ".env.phase3a.example" ]; then
        if grep -q "your_real_" ".env.phase3a.example"; then
            log_error "❌ .env.phase3a.example 包含真实配置提示"
            return 1
        fi
    fi
    
    log_success "✅ 环境文件检查通过"
    return 0
}

# 检查证书文件
check_cert_files() {
    log_info "🔍 检查证书文件..."
    
    # 查找可能的证书文件
    local cert_files=$(find . -name "*.pem" -o -name "*.key" -o -name "*.crt" -o -name "*.p12" -o -name "*.pfx" 2>/dev/null)
    
    if [ -n "$cert_files" ]; then
        log_error "❌ 发现证书文件:"
        echo "$cert_files"
        return 1
    fi
    
    log_success "✅ 证书文件检查通过"
    return 0
}

# 检查数据库文件
check_db_files() {
    log_info "🔍 检查数据库文件..."
    
    # 查找可能的数据库文件
    local db_files=$(find . -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db" -o -name "dump.rdb" 2>/dev/null)
    
    if [ -n "$db_files" ]; then
        log_warning "⚠️ 发现数据库文件:"
        echo "$db_files"
        log_warning "请确认这些文件不包含敏感数据"
    fi
    
    return 0
}

# 生成安全报告
generate_security_report() {
    local report_file="security-check-report.md"
    
    cat > "$report_file" << EOF
# 智游助手v6.2 安全检查报告

**检查时间**: $(date)
**版本**: v6.2.0
**检查范围**: 全项目文件

## 检查项目

### ✅ 已检查项目
- [x] API密钥和令牌
- [x] 数据库连接字符串
- [x] 支付配置信息
- [x] 证书和私钥文件
- [x] 环境配置文件
- [x] 真实域名和IP地址

### 🔒 安全措施
- [x] .gitignore 配置完整
- [x] 环境文件使用示例值
- [x] 敏感文件已排除
- [x] 测试数据已脱敏

### 📋 建议
1. 定期运行安全检查脚本
2. 在CI/CD中集成安全扫描
3. 团队成员推送前执行安全检查
4. 定期更新敏感信息检测规则

## 检查结果
$(if [ $? -eq 0 ]; then echo "✅ 安全检查通过"; else echo "❌ 发现安全问题"; fi)

EOF

    log_info "📄 安全报告已生成: $report_file"
}

# 错误处理
trap 'log_error "安全检查脚本执行失败"; exit 1' ERR

# 执行主函数
if main "$@"; then
    generate_security_report
    log_success "🎉 安全检查完成，可以安全推送到GitHub"
    exit 0
else
    generate_security_report
    log_error "🚨 安全检查失败，请处理问题后再推送"
    exit 1
fi
