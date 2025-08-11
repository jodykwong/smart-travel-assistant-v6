#!/bin/bash

# 智游助手v6.52-preview 安装脚本

echo "🚀 开始安装智游助手v6.52-preview..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js (>=18.0.0)"
    echo "📥 下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ 错误: Node.js版本过低，需要 >= $REQUIRED_VERSION，当前版本: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js版本检查通过: $NODE_VERSION"

# 安装依赖
echo "📦 安装项目依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 安装Playwright浏览器
echo "🎭 安装Playwright浏览器..."
npx playwright install

if [ $? -ne 0 ]; then
    echo "⚠️  Playwright浏览器安装失败，但不影响基本功能"
fi

# 复制环境变量文件
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境变量文件..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
    else
        cat > .env.local << 'EOF'
# 智游助手v6.52-preview 环境变量配置
NEXT_PUBLIC_APP_VERSION=6.52.0
NEXT_PUBLIC_APP_NAME=智游助手v6.52-preview

# DeepSeek API (必需)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# 高德地图API (必需)
AMAP_MCP_API_KEY=your-amap-api-key-here

# 硅基流动API (可选)
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key-here

# 腾讯地图API (可选)
TENCENT_MCP_API_KEY=your-tencent-map-api-key-here
EOF
    fi
    echo "⚠️  请编辑 .env.local 文件，填入您的API密钥"
else
    echo "✅ 环境变量文件已存在"
fi

# 运行基础测试
echo "🧪 运行基础测试..."
if command -v npm &> /dev/null; then
    npm run test:environment 2>/dev/null || echo "⚠️  环境测试跳过，请手动配置API密钥后测试"
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "📖 快速开始:"
echo "  1. 编辑 .env.local 文件，填入API密钥"
echo "     - DeepSeek API: https://platform.deepseek.com/"
echo "     - 高德地图API: https://lbs.amap.com/"
echo "  2. 运行 npm run dev 启动开发服务器"
echo "  3. 访问 http://localhost:3001"
echo "  4. 查看UI原型: http://localhost:3001/prototype/main-index.html"
echo ""
echo "📚 更多信息:"
echo "  - README.md: 项目概述"
echo "  - QUICK_START.md: 详细安装指南"
echo "  - docs/: 完整技术文档"
echo "  - prototype/: 高保真UI原型"
echo ""
echo "🆘 如需帮助，请查看 docs/frontend-debugging-sop.md"
