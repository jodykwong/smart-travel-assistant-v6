#!/bin/bash

# 智游助手v6.2 CI权限设置脚本
# Week 3-4 & Week 5-6: 设置CI/CD脚本执行权限

echo "🔧 设置CI/CD脚本执行权限..."

# 设置CI目录下所有shell脚本的执行权限
chmod +x ci/*.sh

# 设置根目录下的脚本权限
chmod +x setup-ci-permissions.sh
chmod +x verify-setup.sh
chmod +x parallel-validation.sh

# 设置基础设施脚本权限
chmod +x infrastructure/*.sh

echo "✅ CI/CD脚本权限设置完成"

# 验证权限设置
echo ""
echo "📋 CI脚本权限状态:"
ls -la ci/*.sh
echo ""
echo "📋 根目录脚本权限状态:"
ls -la *.sh
echo ""
echo "📋 基础设施脚本权限状态:"
ls -la infrastructure/*.sh

echo ""
echo "🎉 所有CI/CD脚本权限设置完成！"
echo ""
echo "📋 P0任务执行脚本:"
echo "   • infrastructure/setup-environment.sh - 环境准备"
echo "   • infrastructure/deploy-infrastructure.sh - 基础设施部署"
echo "   • verify-setup.sh - 部署验证"
echo ""
echo "📋 Week 5-6新增脚本:"
echo "   • ci/helm-blue-green-deployment.sh - Helm蓝绿部署"
echo "   • ci/canary-deployment.sh - 金丝雀发布"
echo "   • ci/environment-manager.sh - 环境管理"
