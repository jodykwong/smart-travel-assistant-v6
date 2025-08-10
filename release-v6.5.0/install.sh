#!/bin/bash

# 智游助手v6.5.0安装脚本

echo "🚀 智游助手v6.5.0安装开始"
echo "================================="

# 检查Node.js版本
echo "🔍 检查Node.js版本..."
node_version=$(node --version 2>/dev/null || echo "未安装")
if [[ "$node_version" == "未安装" ]]; then
    echo "❌ Node.js未安装，请先安装Node.js v18.17.0+"
    exit 1
fi

echo "✅ Node.js版本: $node_version"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 检查环境变量配置
echo "⚙️  检查环境变量配置..."
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境变量配置文件..."
    cp .env.example .env.local
    echo "⚠️  请编辑.env.local文件，填入必要的API密钥"
    echo "   - DEEPSEEK_API_KEY (必需)"
    echo "   - AMAP_API_KEY (必需)"
    echo "   - SILICONFLOW_API_KEY (可选)"
fi

# 运行验证
echo "🧪 运行基础验证..."
npm run type-check

if [ $? -eq 0 ]; then
    echo "✅ 类型检查通过"
else
    echo "❌ 类型检查失败"
    exit 1
fi

echo ""
echo "🎉 智游助手v6.5.0安装完成！"
echo "================================="
echo ""
echo "🚀 下一步操作:"
echo "1. 编辑.env.local文件，填入API密钥"
echo "2. 运行开发服务器: npm run dev"
echo "3. 访问 http://localhost:3000"
echo ""
echo "📚 更多信息:"
echo "- 快速开始: cat QUICK_START.md"
echo "- 完整文档: docs/"
echo "- 问题反馈: https://github.com/your-org/smart-travel-assistant-v6/issues"
echo ""
