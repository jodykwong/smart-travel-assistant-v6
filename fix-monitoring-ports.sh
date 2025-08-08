#!/bin/bash

# 智游助手v6.2 监控系统端口冲突快速修正脚本

echo "🔧 智游助手v6.2 监控系统端口冲突修正"
echo "=============================================="

# 设置脚本权限
chmod +x scripts/restart-monitoring-fixed.sh
chmod +x scripts/setup-monitoring-phase1.sh
chmod +x scripts/verify-monitoring-setup.sh

echo "✅ 脚本权限设置完成"

# 停止可能冲突的服务
echo "🛑 停止现有监控服务..."
docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || echo "监控服务未运行"

# 检查端口占用
echo "🔍 检查端口占用情况..."
echo "端口3001 (应释放给应用):" 
lsof -i :3001 || echo "端口3001空闲 ✅"

echo "端口3002 (Grafana新端口):"
lsof -i :3002 || echo "端口3002空闲 ✅"

echo "端口9093 (AlertManager):"
lsof -i :9093 || echo "端口9093空闲 ✅"

# 启动修正后的监控服务
echo "🚀 启动修正后的监控服务..."
./scripts/restart-monitoring-fixed.sh

echo ""
echo "🎉 端口冲突修正完成！"
echo ""
echo "📋 修正内容:"
echo "   • Grafana端口: 3001 → 3002"
echo "   • AlertManager: 添加监听地址配置"
echo "   • 释放端口3001给智游助手v6.2应用使用"
echo ""
echo "🔗 现在可以访问:"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3002 (admin/admin123)"
echo "   • AlertManager: http://localhost:9093"
echo "   • 智游助手v6.2应用: http://localhost:3001 (端口已释放)"
echo ""
