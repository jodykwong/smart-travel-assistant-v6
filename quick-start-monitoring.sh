#!/bin/bash

# 快速启动监控系统（经过实际验证）

echo "🚀 快速启动智游助手v6.2监控系统"
echo "=================================="

# 设置权限
chmod +x scripts/start-monitoring-verified.sh

# 执行启动脚本
./scripts/start-monitoring-verified.sh

echo ""
echo "🔗 请现在测试以下URL:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3002 (admin/admin123)"
echo "   Node Exporter: http://localhost:9100/metrics"
echo ""
