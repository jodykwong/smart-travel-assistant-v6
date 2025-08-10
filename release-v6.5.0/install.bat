@echo off
echo 🚀 智游助手v6.5.0安装开始
echo =================================

REM 检查Node.js版本
echo 🔍 检查Node.js版本...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装，请先安装Node.js v18.17.0+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
echo ✅ Node.js版本: %node_version%

REM 安装依赖
echo 📦 安装依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装成功

REM 检查环境变量配置
echo ⚙️  检查环境变量配置...
if not exist ".env.local" (
    echo 📝 创建环境变量配置文件...
    copy .env.example .env.local
    echo ⚠️  请编辑.env.local文件，填入必要的API密钥
    echo    - DEEPSEEK_API_KEY (必需)
    echo    - AMAP_API_KEY (必需)
    echo    - SILICONFLOW_API_KEY (可选)
)

REM 运行验证
echo 🧪 运行基础验证...
npm run type-check
if errorlevel 1 (
    echo ❌ 类型检查失败
    pause
    exit /b 1
)
echo ✅ 类型检查通过

echo.
echo 🎉 智游助手v6.5.0安装完成！
echo =================================
echo.
echo 🚀 下一步操作:
echo 1. 编辑.env.local文件，填入API密钥
echo 2. 运行开发服务器: npm run dev
echo 3. 访问 http://localhost:3000
echo.
echo 📚 更多信息:
echo - 快速开始: type QUICK_START.md
echo - 完整文档: docs\
echo - 问题反馈: https://github.com/your-org/smart-travel-assistant-v6/issues
echo.
pause
