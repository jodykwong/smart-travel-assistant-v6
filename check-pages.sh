#!/bin/bash

# 智游助手v6.5 页面状态检查脚本

echo "🔍 智游助手v6.5 页面可用性审查"
echo "=================================="
echo ""

BASE_URL="http://localhost:3001"

# 定义要检查的页面列表
declare -A PAGES=(
    ["主页"]="/"
    ["规划问卷页面"]="/planning"
    ["生成页面"]="/planning/generating"
    ["结果页面"]="/planning/result?sessionId=test123"
    ["修复版结果页面"]="/planning/result-fixed"
    ["简单测试页面"]="/test-simple"
    ["设计测试页面"]="/design-test"
    ["API健康检查"]="/api/health"
    ["API规划会话"]="/api/v1/planning/sessions"
)

echo "📋 页面状态检查结果："
echo "===================="

# 检查每个页面的状态
for page_name in "${!PAGES[@]}"; do
    url="${BASE_URL}${PAGES[$page_name]}"
    
    # 使用curl检查HTTP状态码
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    # 根据状态码显示不同的图标和颜色
    case $status_code in
        200)
            echo "✅ $page_name: $status_code OK - $url"
            ;;
        404)
            echo "❌ $page_name: $status_code NOT FOUND - $url"
            ;;
        500)
            echo "🚨 $page_name: $status_code SERVER ERROR - $url"
            ;;
        *)
            echo "⚠️  $page_name: $status_code UNKNOWN - $url"
            ;;
    esac
done

echo ""
echo "🔧 组件系统检查："
echo "================"

# 检查组件文件是否存在
COMPONENTS=(
    "src/components/ui/Button.tsx"
    "src/components/ui/Card.tsx"
    "src/components/ui/Input.tsx"
    "src/components/ui/Progress.tsx"
    "src/lib/utils.ts"
    "src/styles/design-system.css"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $component - 存在"
    else
        echo "❌ $component - 缺失"
    fi
done

echo ""
echo "📊 项目配置检查："
echo "================"

# 检查重要配置文件
CONFIG_FILES=(
    "package.json"
    "tailwind.config.js"
    "next.config.js"
    "tsconfig.json"
    ".env.local"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ $config - 存在"
    else
        echo "❌ $config - 缺失"
    fi
done

echo ""
echo "🎯 检查完成！"
echo "============"
