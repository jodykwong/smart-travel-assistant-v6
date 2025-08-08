#!/bin/bash

# Phase 3A 开发环境搭建脚本
# 用于快速搭建智游助手v6.2 Phase 3A开发环境

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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 $1 已被占用"
        return 1
    fi
    return 0
}

# 主函数
main() {
    log_info "🚀 开始搭建智游助手v6.2 Phase 3A开发环境..."
    
    # 1. 检查系统依赖
    log_info "📋 检查系统依赖..."
    check_command "node"
    check_command "npm"
    check_command "mysql"
    check_command "redis-server"
    
    # 检查Node.js版本
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js版本需要 >= $REQUIRED_VERSION，当前版本: $NODE_VERSION"
        exit 1
    fi
    log_success "Node.js版本检查通过: $NODE_VERSION"
    
    # 2. 检查项目结构
    log_info "📁 检查项目结构..."
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json，请确保在项目根目录执行此脚本"
        exit 1
    fi
    
    # 3. 安装依赖
    log_info "📦 安装项目依赖..."
    npm install
    log_success "项目依赖安装完成"
    
    # 4. 设置环境配置
    log_info "⚙️ 设置环境配置..."
    if [ ! -f ".env.phase3a" ]; then
        if [ -f ".env.phase3a.example" ]; then
            cp .env.phase3a.example .env.phase3a
            log_success "已创建 .env.phase3a 配置文件"
            log_warning "请编辑 .env.phase3a 文件，填入实际的配置值"
        else
            log_error "未找到 .env.phase3a.example 文件"
            exit 1
        fi
    else
        log_info ".env.phase3a 配置文件已存在"
    fi
    
    # 5. 检查和启动MySQL
    log_info "🗄️ 检查MySQL服务..."
    if ! pgrep -x "mysqld" > /dev/null; then
        log_info "启动MySQL服务..."
        if command -v brew &> /dev/null; then
            # macOS with Homebrew
            brew services start mysql
        elif command -v systemctl &> /dev/null; then
            # Linux with systemd
            sudo systemctl start mysql
        else
            log_warning "请手动启动MySQL服务"
        fi
    else
        log_success "MySQL服务已运行"
    fi
    
    # 6. 检查和启动Redis
    log_info "🔴 检查Redis服务..."
    if ! pgrep -x "redis-server" > /dev/null; then
        log_info "启动Redis服务..."
        if command -v brew &> /dev/null; then
            # macOS with Homebrew
            brew services start redis
        elif command -v systemctl &> /dev/null; then
            # Linux with systemd
            sudo systemctl start redis
        else
            log_warning "请手动启动Redis服务"
        fi
    else
        log_success "Redis服务已运行"
    fi
    
    # 7. 创建数据库
    log_info "🏗️ 创建开发数据库..."
    
    # 读取数据库配置
    if [ -f ".env.phase3a" ]; then
        source .env.phase3a
    fi
    
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_USERNAME=${DB_USERNAME:-smart_travel_dev}
    DB_PASSWORD=${DB_PASSWORD:-dev_password_123}
    DB_DATABASE=${DB_DATABASE:-smart_travel_dev}
    
    # 创建数据库用户和数据库
    mysql -h$DB_HOST -P$DB_PORT -uroot -p << EOF
CREATE DATABASE IF NOT EXISTS $DB_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USERNAME'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_DATABASE.* TO '$DB_USERNAME'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    if [ $? -eq 0 ]; then
        log_success "数据库创建完成: $DB_DATABASE"
    else
        log_error "数据库创建失败，请检查MySQL连接和权限"
        exit 1
    fi
    
    # 8. 运行数据库迁移
    log_info "🔄 运行数据库迁移..."
    if [ -f "database/migrations/001_create_commercial_tables.sql" ]; then
        mysql -h$DB_HOST -P$DB_PORT -u$DB_USERNAME -p$DB_PASSWORD $DB_DATABASE < database/migrations/001_create_commercial_tables.sql
        log_success "数据库迁移完成"
    else
        log_warning "未找到数据库迁移文件，跳过迁移"
    fi
    
    # 9. 插入种子数据
    log_info "🌱 插入种子数据..."
    if [ -f "database/seeds/001_development_data.sql" ]; then
        mysql -h$DB_HOST -P$DB_PORT -u$DB_USERNAME -p$DB_PASSWORD $DB_DATABASE < database/seeds/001_development_data.sql
        log_success "种子数据插入完成"
    else
        log_warning "未找到种子数据文件，跳过数据插入"
    fi
    
    # 10. 创建必要的目录
    log_info "📁 创建必要的目录..."
    mkdir -p logs
    mkdir -p uploads
    mkdir -p backups
    mkdir -p certs/wechat
    mkdir -p certs/alipay
    log_success "目录创建完成"
    
    # 11. 生成开发证书 (自签名)
    log_info "🔐 生成开发证书..."
    if [ ! -f "certs/dev-cert.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout certs/dev-key.pem -out certs/dev-cert.pem -days 365 -nodes -subj "/C=CN/ST=Beijing/L=Beijing/O=SmartTravel/CN=localhost"
        log_success "开发证书生成完成"
    else
        log_info "开发证书已存在"
    fi
    
    # 12. 设置文件权限
    log_info "🔒 设置文件权限..."
    chmod 600 certs/*.pem 2>/dev/null || true
    chmod 755 scripts/*.sh 2>/dev/null || true
    chmod 755 logs uploads backups
    log_success "文件权限设置完成"
    
    # 13. 运行测试
    log_info "🧪 运行基础测试..."
    npm run test:setup 2>/dev/null || log_warning "测试脚本不存在，跳过测试"
    
    # 14. 检查端口可用性
    log_info "🔍 检查端口可用性..."
    if ! check_port 3000; then
        log_warning "端口3000被占用，请修改配置或停止占用进程"
    fi
    
    if ! check_port 3306; then
        log_warning "端口3306被占用，MySQL可能已在运行"
    fi
    
    if ! check_port 6379; then
        log_warning "端口6379被占用，Redis可能已在运行"
    fi
    
    # 15. 生成启动脚本
    log_info "📝 生成启动脚本..."
    cat > start-phase3a-dev.sh << 'EOF'
#!/bin/bash

# Phase 3A 开发服务器启动脚本

echo "🚀 启动智游助手v6.2 Phase 3A开发服务器..."

# 加载环境变量
if [ -f ".env.phase3a" ]; then
    export $(cat .env.phase3a | grep -v '^#' | xargs)
fi

# 检查服务
echo "🔍 检查依赖服务..."

# 检查MySQL
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL服务未运行，请先启动MySQL"
    exit 1
fi

# 检查Redis
if ! pgrep -x "redis-server" > /dev/null; then
    echo "❌ Redis服务未运行，请先启动Redis"
    exit 1
fi

echo "✅ 依赖服务检查通过"

# 启动开发服务器
echo "🚀 启动开发服务器..."
NODE_ENV=development npm run dev:phase3a

EOF
    
    chmod +x start-phase3a-dev.sh
    log_success "启动脚本生成完成: start-phase3a-dev.sh"
    
    # 16. 完成提示
    log_success "🎉 Phase 3A开发环境搭建完成！"
    echo ""
    echo "📋 下一步操作："
    echo "1. 编辑 .env.phase3a 文件，配置实际的API密钥和数据库连接"
    echo "2. 运行 ./start-phase3a-dev.sh 启动开发服务器"
    echo "3. 访问 http://localhost:3000 查看应用"
    echo "4. 访问 http://localhost:3000/api/docs 查看API文档"
    echo ""
    echo "🔧 常用命令："
    echo "- npm run dev:phase3a          # 启动开发服务器"
    echo "- npm run test:phase3a         # 运行测试"
    echo "- npm run build:phase3a        # 构建生产版本"
    echo "- npm run db:migrate           # 运行数据库迁移"
    echo "- npm run db:seed              # 插入种子数据"
    echo ""
    echo "📚 文档位置："
    echo "- 技术文档: ./docs/"
    echo "- API文档: http://localhost:3000/api/docs"
    echo "- 数据库文档: ./database/README.md"
    echo ""
    echo "🐛 问题排查："
    echo "- 查看日志: tail -f logs/smart-travel.log"
    echo "- 检查服务: npm run health:check"
    echo "- 重置数据库: npm run db:reset"
    echo ""
    log_success "环境搭建完成，开始愉快的开发吧！ 🚀"
}

# 错误处理
trap 'log_error "脚本执行失败，请检查错误信息"; exit 1' ERR

# 执行主函数
main "$@"
