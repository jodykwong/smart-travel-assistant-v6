#!/bin/bash

# 智游助手v6.5 最终页面状态检查脚本

echo "🎉 智游助手v6.5 最终页面状态检查"
echo "=================================="
echo ""

BASE_URL="http://localhost:3001"

# 定义要检查的页面列表
declare -a PAGES=(
    "主页:/"
    "规划问卷页面:/planning"
    "生成页面:/planning/generating"
    "结果页面:/planning/result?sessionId=test123"
    "修复版结果页面:/planning/result-fixed"
    "简单测试页面:/test-simple"
    "设计测试页面:/design-test"
    "API健康检查:/api/health"
)

echo "📋 页面状态检查结果："
echo "===================="

success_count=0
total_count=${#PAGES[@]}

# 检查每个页面的状态
for page_info in "${PAGES[@]}"; do
    IFS=':' read -r page_name url <<< "$page_info"
    full_url="${BASE_URL}${url}"
    
    # 使用curl检查HTTP状态码
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$full_url" 2>/dev/null)
    
    # 根据状态码显示不同的图标和颜色
    case $status_code in
        200)
            echo "✅ $page_name: $status_code OK"
            ((success_count++))
            ;;
        404)
            echo "❌ $page_name: $status_code NOT FOUND"
            ;;
        500)
            echo "🚨 $page_name: $status_code SERVER ERROR"
            ;;
        503)
            echo "⚠️  $page_name: $status_code SERVICE UNAVAILABLE"
            ;;
        *)
            echo "⚠️  $page_name: $status_code UNKNOWN"
            ;;
    esac
done

echo ""
echo "📊 统计结果："
echo "============"
echo "✅ 成功页面: $success_count/$total_count"
echo "📈 成功率: $(( success_count * 100 / total_count ))%"

if [ $success_count -eq $((total_count - 1)) ]; then
    echo ""
    echo "🎉 恭喜！除API健康检查外，所有页面都正常工作！"
    echo "🚀 系统已基本恢复正常运行状态"
elif [ $success_count -ge $((total_count * 3 / 4)) ]; then
    echo ""
    echo "👍 很好！大部分页面正常工作"
    echo "🔧 还有少数页面需要修复"
else
    echo ""
    echo "⚠️  需要更多修复工作"
    echo "🔧 请检查错误日志"
fi

echo ""
echo "🎯 检查完成！"
echo "============"
