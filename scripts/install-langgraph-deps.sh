#!/bin/bash

# 智游助手v6.2 - LangGraph依赖安装脚本
# 安装LangGraph相关依赖包并验证兼容性

echo "🚀 开始安装LangGraph依赖包..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node_version=$(node -v)
echo "当前Node.js版本: $node_version"

# 检查npm版本
echo "📋 检查npm版本..."
npm_version=$(npm -v)
echo "当前npm版本: $npm_version"

# 安装LangGraph核心依赖
echo "📦 安装LangGraph核心依赖..."
npm install @langchain/langgraph @langchain/core @langchain/community

# 安装辅助依赖
echo "📦 安装辅助依赖..."
npm install uuid @types/uuid

# 验证安装
echo "✅ 验证依赖安装..."
npm list @langchain/langgraph @langchain/core @langchain/community uuid

# 检查TypeScript兼容性
echo "🔍 检查TypeScript兼容性..."
npx tsc --noEmit --skipLibCheck

echo "🎉 LangGraph依赖安装完成！"
echo "📋 已安装的LangGraph相关包："
echo "  - @langchain/langgraph: LangGraph核心库"
echo "  - @langchain/core: LangChain核心组件"
echo "  - @langchain/community: LangChain社区组件"
echo "  - uuid: UUID生成工具"
echo "  - @types/uuid: UUID类型定义"

echo "✅ 准备就绪，可以开始LangGraph集成开发！"
