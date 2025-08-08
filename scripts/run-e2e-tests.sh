#!/bin/bash

# 智游助手v6.2 - Playwright端到端测试运行脚本
# 验证P0级关键功能的完整测试套件

echo "🚀 智游助手v6.2端到端测试套件启动"
echo "============================================================"
echo "📅 测试时间: $(date)"
echo "🎯 测试目标: 验证P0级关键功能（用户认证系统 + 支付系统安全加固）"
echo "============================================================"

# 设置环境变量
export NODE_ENV=test
export NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
export NEXT_PUBLIC_DOMAIN=http://localhost:3000

# 检查依赖
echo "🔍 检查测试依赖..."

if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装Node.js"
    exit 1
fi

if ! npm list @playwright/test &> /dev/null; then
    echo "📦 安装Playwright测试依赖..."
    npm install @playwright/test
fi

# 安装浏览器
echo "🌐 安装Playwright浏览器..."
npx playwright install

# 启动开发服务器
echo "🖥️ 启动开发服务器..."
npm run dev &
DEV_SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 10

# 检查服务器是否启动成功
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器启动成功"
else
    echo "❌ 开发服务器启动失败"
    kill $DEV_SERVER_PID 2>/dev/null
    exit 1
fi

# 创建测试结果目录
mkdir -p test-results/screenshots
mkdir -p test-results/videos
mkdir -p test-results/traces

echo "============================================================"
echo "🧪 开始执行端到端测试..."
echo "============================================================"

# 运行测试套件
TEST_EXIT_CODE=0

echo "📝 1. 用户注册流程测试..."
npx playwright test tests/e2e/user-registration.spec.ts --reporter=line
if [ $? -ne 0 ]; then
    echo "❌ 用户注册测试失败"
    TEST_EXIT_CODE=1
else
    echo "✅ 用户注册测试通过"
fi

echo "🔐 2. 用户登录流程测试..."
npx playwright test tests/e2e/user-login.spec.ts --reporter=line
if [ $? -ne 0 ]; then
    echo "❌ 用户登录测试失败"
    TEST_EXIT_CODE=1
else
    echo "✅ 用户登录测试通过"
fi

echo "💳 3. 支付流程测试..."
npx playwright test tests/e2e/payment-flow.spec.ts --reporter=line
if [ $? -ne 0 ]; then
    echo "❌ 支付流程测试失败"
    TEST_EXIT_CODE=1
else
    echo "✅ 支付流程测试通过"
fi

echo "⚙️ 4. 用户偏好管理测试..."
npx playwright test tests/e2e/user-preferences.spec.ts --reporter=line
if [ $? -ne 0 ]; then
    echo "❌ 用户偏好测试失败"
    TEST_EXIT_CODE=1
else
    echo "✅ 用户偏好测试通过"
fi

echo "🗺️ 5. 旅游规划功能测试..."
npx playwright test tests/e2e/travel-planning.spec.ts --reporter=line
if [ $? -ne 0 ]; then
    echo "❌ 旅游规划测试失败"
    TEST_EXIT_CODE=1
else
    echo "✅ 旅游规划测试通过"
fi

# 生成完整的HTML报告
echo "📊 生成测试报告..."
npx playwright show-report test-results/html-report

# 清理
echo "🧹 清理测试环境..."
kill $DEV_SERVER_PID 2>/dev/null

echo "============================================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 智游助手v6.2端到端测试全部通过！"
    echo "✅ P0级关键功能验证完成"
    echo "📈 商业化就绪度: 65%"
    echo "🚀 可以开始第3-4周的P1级功能开发"
else
    echo "❌ 部分测试失败，请检查测试结果"
    echo "📋 查看详细报告: test-results/html-report/index.html"
fi
echo "============================================================"

exit $TEST_EXIT_CODE
