@echo off
REM 智游助手v6.52-preview Windows安装脚本

echo 🚀 开始安装智游助手v6.52-preview...

REM 检查Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 请先安装Node.js (>=18.0.0)
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js检查通过

REM 安装依赖
echo 📦 安装项目依赖...
npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 安装Playwright浏览器
echo 🎭 安装Playwright浏览器...
npx playwright install

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Playwright浏览器安装失败，但不影响基本功能
)

REM 复制环境变量文件
if not exist ".env.local" (
    echo 📝 创建环境变量文件...
    if exist ".env.example" (
        copy .env.example .env.local
    ) else (
        echo # 智游助手v6.52-preview 环境变量配置 > .env.local
        echo NEXT_PUBLIC_APP_VERSION=6.52.0 >> .env.local
        echo NEXT_PUBLIC_APP_NAME=智游助手v6.52-preview >> .env.local
        echo. >> .env.local
        echo # DeepSeek API (必需) >> .env.local
        echo DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here >> .env.local
        echo DEEPSEEK_API_URL=https://api.deepseek.com/v1 >> .env.local
        echo. >> .env.local
        echo # 高德地图API (必需) >> .env.local
        echo AMAP_MCP_API_KEY=your-amap-api-key-here >> .env.local
        echo. >> .env.local
        echo # 硅基流动API (可选) >> .env.local
        echo SILICONFLOW_API_KEY=sk-your-siliconflow-api-key-here >> .env.local
        echo. >> .env.local
        echo # 腾讯地图API (可选) >> .env.local
        echo TENCENT_MCP_API_KEY=your-tencent-map-api-key-here >> .env.local
    )
    echo ⚠️  请编辑 .env.local 文件，填入您的API密钥
) else (
    echo ✅ 环境变量文件已存在
)

REM 运行基础测试
echo 🧪 运行基础测试...
npm run test:environment 2>nul || echo ⚠️  环境测试跳过，请手动配置API密钥后测试

echo.
echo ✅ 安装完成！
echo.
echo 📖 快速开始:
echo   1. 编辑 .env.local 文件，填入API密钥
echo      - DeepSeek API: https://platform.deepseek.com/
echo      - 高德地图API: https://lbs.amap.com/
echo   2. 运行 npm run dev 启动开发服务器
echo   3. 访问 http://localhost:3001
echo   4. 查看UI原型: http://localhost:3001/prototype/main-index.html
echo.
echo 📚 更多信息:
echo   - README.md: 项目概述
echo   - QUICK_START.md: 详细安装指南
echo   - docs\: 完整技术文档
echo   - prototype\: 高保真UI原型
echo.
echo 🆘 如需帮助，请查看 docs\frontend-debugging-sop.md
pause
