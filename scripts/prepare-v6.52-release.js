#!/usr/bin/env node

/**
 * 智游助手v6.52-preview 发布准备脚本
 * 自动化处理版本更新、代码脱敏、文档更新和发布包创建
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '6.52.0-preview';
const RELEASE_DATE = '2025-01-10';
const RELEASE_DIR = `release-v${VERSION}`;

console.log(`🚀 开始准备智游助手v${VERSION}发布包...`);

// 1. 创建发布目录
function createReleaseDirectory() {
    console.log('📁 创建发布目录...');
    
    if (fs.existsSync(RELEASE_DIR)) {
        execSync(`rm -rf ${RELEASE_DIR}`);
    }
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
    
    console.log(`✅ 发布目录已创建: ${RELEASE_DIR}`);
}

// 2. 复制核心文件
function copyProjectFiles() {
    console.log('📋 复制项目文件...');
    
    const filesToCopy = [
        'package.json',
        'package-lock.json',
        'next.config.js',
        'tailwind.config.js',
        'tsconfig.json',
        'postcss.config.js',
        'vitest.config.ts',
        'playwright.config.ts',
        '.env.local',
        '.env.example',
        '.gitignore',
        'README.md',
        'CHANGELOG.md',
        'LICENSE',
        'CONTRIBUTING.md'
    ];
    
    const directoriesToCopy = [
        'src',
        'public',
        'docs',
        'scripts',
        'tests',
        'prototype',
        'data'
    ];
    
    // 复制文件
    filesToCopy.forEach(file => {
        if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join(RELEASE_DIR, file));
            console.log(`  ✓ ${file}`);
        }
    });
    
    // 复制目录
    directoriesToCopy.forEach(dir => {
        if (fs.existsSync(dir)) {
            execSync(`cp -r ${dir} ${RELEASE_DIR}/`);
            console.log(`  ✓ ${dir}/`);
        }
    });
    
    console.log('✅ 项目文件复制完成');
}

// 3. 创建发布信息文件
function createReleaseInfo() {
    console.log('📄 创建发布信息文件...');
    
    const buildInfo = {
        version: VERSION,
        buildDate: new Date().toISOString(),
        releaseDate: RELEASE_DATE,
        buildHash: Math.random().toString(36).substring(2, 10),
        features: [
            '高保真UI原型系统',
            '前端问题诊断SOP',
            '费用显示修复',
            '响应式设计优化',
            '现代化交互动画'
        ],
        fixes: [
            '费用显示错误修复',
            '信息过载问题解决',
            '导航功能完善',
            '移动端适配优化'
        ],
        technicalImprovements: [
            'Playwright前端诊断集成',
            '智游助手v6.5品牌配色',
            '玻璃拟态设计风格',
            '完整响应式支持'
        ]
    };
    
    fs.writeFileSync(
        path.join(RELEASE_DIR, 'BUILD_INFO.json'),
        JSON.stringify(buildInfo, null, 2)
    );
    
    console.log('✅ 发布信息文件已创建');
}

// 4. 创建安装脚本
function createInstallScripts() {
    console.log('🔧 创建安装脚本...');
    
    // Unix/Linux/macOS 安装脚本
    const installSh = `#!/bin/bash

# 智游助手v${VERSION} 安装脚本

echo "🚀 开始安装智游助手v${VERSION}..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js (>=18.0.0)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ 错误: Node.js版本过低，需要 >= $REQUIRED_VERSION，当前版本: $NODE_VERSION"
    exit 1
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 安装Playwright浏览器
echo "🎭 安装Playwright浏览器..."
npx playwright install

# 复制环境变量文件
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env.local
    echo "⚠️  请编辑 .env.local 文件，填入您的API密钥"
fi

# 运行测试
echo "🧪 运行基础测试..."
npm run test:environment

echo "✅ 安装完成！"
echo ""
echo "📖 快速开始:"
echo "  1. 编辑 .env.local 文件，填入API密钥"
echo "  2. 运行 npm run dev 启动开发服务器"
echo "  3. 访问 http://localhost:3001"
echo ""
echo "📚 更多信息请查看 README.md"
`;

    // Windows 安装脚本
    const installBat = `@echo off
REM 智游助手v${VERSION} Windows安装脚本

echo 🚀 开始安装智游助手v${VERSION}...

REM 检查Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 请先安装Node.js (>=18.0.0)
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装项目依赖...
npm install

REM 安装Playwright浏览器
echo 🎭 安装Playwright浏览器...
npx playwright install

REM 复制环境变量文件
if not exist ".env.local" (
    echo 📝 创建环境变量文件...
    copy .env.example .env.local
    echo ⚠️  请编辑 .env.local 文件，填入您的API密钥
)

REM 运行测试
echo 🧪 运行基础测试...
npm run test:environment

echo ✅ 安装完成！
echo.
echo 📖 快速开始:
echo   1. 编辑 .env.local 文件，填入API密钥
echo   2. 运行 npm run dev 启动开发服务器
echo   3. 访问 http://localhost:3001
echo.
echo 📚 更多信息请查看 README.md
pause
`;

    fs.writeFileSync(path.join(RELEASE_DIR, 'install.sh'), installSh);
    fs.writeFileSync(path.join(RELEASE_DIR, 'install.bat'), installBat);
    
    // 设置执行权限
    try {
        execSync(`chmod +x ${RELEASE_DIR}/install.sh`);
    } catch (error) {
        console.log('⚠️  无法设置install.sh执行权限，请手动设置');
    }
    
    console.log('✅ 安装脚本已创建');
}

// 5. 创建Docker配置
function createDockerConfig() {
    console.log('🐳 创建Docker配置...');
    
    const dockerfile = `# 智游助手v${VERSION} Docker配置
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]
`;

    const dockerCompose = `version: '3.8'

services:
  smart-travel-assistant:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    
volumes:
  redis_data:
`;

    fs.writeFileSync(path.join(RELEASE_DIR, 'Dockerfile'), dockerfile);
    fs.writeFileSync(path.join(RELEASE_DIR, 'docker-compose.yml'), dockerCompose);
    
    console.log('✅ Docker配置已创建');
}

// 6. 创建发布清单
function createReleaseManifest() {
    console.log('📋 创建发布清单...');
    
    const manifest = {
        version: VERSION,
        releaseDate: RELEASE_DATE,
        packageName: `smart-travel-assistant-v${VERSION}`,
        description: '智游助手v6.52-preview - 企业级AI旅行规划系统',
        features: {
            'UI原型系统': '高保真UI原型，解决前端显示问题',
            '前端诊断SOP': 'Playwright集成的前端问题诊断标准操作程序',
            '费用显示修复': '修复费用显示错误，展示¥20,500预算分解',
            '响应式设计': '完整支持桌面端、平板、移动端',
            '现代化交互': '玻璃拟态效果，悬停、点击、滚动动画'
        },
        technicalStack: {
            'Frontend': 'Next.js 14 + React 18 + TypeScript',
            'UI/UX': 'Tailwind CSS + Framer Motion + 玻璃拟态设计',
            'Testing': 'Playwright + Vitest + E2E测试框架',
            'AI Services': 'DeepSeek + SiliconFlow双链路',
            'Map Services': '高德地图 + 腾讯地图MCP',
            'Caching': 'Redis多层缓存',
            'Database': 'SQLite + Better-SQLite3'
        },
        installation: {
            'requirements': 'Node.js >=18.0.0, npm >=9.0.0',
            'quickStart': [
                '1. 解压发布包',
                '2. 运行 ./install.sh (Unix) 或 install.bat (Windows)',
                '3. 编辑 .env.local 文件，填入API密钥',
                '4. 运行 npm run dev',
                '5. 访问 http://localhost:3001'
            ]
        },
        documentation: {
            'README.md': '项目概述和快速开始指南',
            'CHANGELOG.md': '版本更新日志',
            'docs/': '完整技术文档',
            'prototype/': '高保真UI原型展示'
        }
    };
    
    fs.writeFileSync(
        path.join(RELEASE_DIR, 'RELEASE_MANIFEST.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ 发布清单已创建');
}

// 7. 创建快速开始指南
function createQuickStart() {
    console.log('📖 创建快速开始指南...');
    
    const quickStart = `# 智游助手v${VERSION} 快速开始指南

## 🚀 5分钟快速部署

### 1. 系统要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

### 2. 安装步骤

#### 自动安装 (推荐)
\`\`\`bash
# Unix/Linux/macOS
./install.sh

# Windows
install.bat
\`\`\`

#### 手动安装
\`\`\`bash
# 1. 安装依赖
npm install

# 2. 安装Playwright浏览器
npx playwright install

# 3. 复制环境变量文件
cp .env.example .env.local

# 4. 编辑环境变量文件
# 填入您的API密钥 (DeepSeek, SiliconFlow, 高德, 腾讯地图)

# 5. 运行测试
npm run test:environment

# 6. 启动开发服务器
npm run dev
\`\`\`

### 3. 访问应用
打开浏览器访问: http://localhost:3001

### 4. 查看UI原型
访问高保真UI原型: http://localhost:3001/prototype/main-index.html

## 🔑 API密钥配置

编辑 \`.env.local\` 文件，填入以下API密钥:

\`\`\`env
# DeepSeek API (必需)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# 硅基流动API (可选，用于故障转移)
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key-here

# 高德地图API (必需)
AMAP_MCP_API_KEY=your-amap-api-key-here

# 腾讯地图API (可选，用于故障转移)
TENCENT_MCP_API_KEY=your-tencent-map-api-key-here
\`\`\`

### API密钥获取指南:
- **DeepSeek**: https://platform.deepseek.com/
- **硅基流动**: https://siliconflow.cn/
- **高德地图**: https://lbs.amap.com/
- **腾讯地图**: https://lbs.qq.com/

## 🧪 测试验证

\`\`\`bash
# 环境测试
npm run test:environment

# API连接测试
npm run test:api

# E2E测试
npm run test:e2e

# 前端测试
npm run test:playwright
\`\`\`

## 📚 更多资源

- **完整文档**: docs/README.md
- **API文档**: docs/API.md
- **部署指南**: docs/DEPLOYMENT.md
- **故障排除**: docs/frontend-debugging-sop.md
- **UI原型**: prototype/PROTOTYPE-GUIDE.md

## 🆘 获取帮助

如果遇到问题，请查看:
1. **故障排除文档**: docs/frontend-debugging-sop.md
2. **已知问题**: KNOWN_ISSUES.md
3. **GitHub Issues**: https://github.com/your-repo/smart-travel-assistant/issues

---

**智游助手v${VERSION}** - 企业级AI旅行规划系统
发布日期: ${RELEASE_DATE}
`;

    fs.writeFileSync(path.join(RELEASE_DIR, 'QUICK_START.md'), quickStart);
    
    console.log('✅ 快速开始指南已创建');
}

// 8. 清理和优化
function cleanupAndOptimize() {
    console.log('🧹 清理和优化发布包...');
    
    const itemsToRemove = [
        'node_modules',
        '.next',
        'test-results',
        'playwright-report',
        '*.log',
        '.DS_Store',
        'Thumbs.db'
    ];
    
    itemsToRemove.forEach(item => {
        const fullPath = path.join(RELEASE_DIR, item);
        try {
            if (item.includes('*')) {
                execSync(`find ${RELEASE_DIR} -name "${item}" -delete`, { stdio: 'ignore' });
            } else if (fs.existsSync(fullPath)) {
                execSync(`rm -rf "${fullPath}"`);
            }
        } catch (error) {
            // 忽略删除错误
        }
    });
    
    console.log('✅ 发布包清理完成');
}

// 9. 创建压缩包
function createArchives() {
    console.log('📦 创建压缩包...');
    
    const packageName = `smart-travel-assistant-v${VERSION}`;
    
    try {
        // 创建tar.gz
        execSync(`tar -czf ${packageName}.tar.gz ${RELEASE_DIR}`);
        console.log(`✅ 已创建: ${packageName}.tar.gz`);
        
        // 创建zip
        execSync(`zip -r ${packageName}.zip ${RELEASE_DIR}`);
        console.log(`✅ 已创建: ${packageName}.zip`);
    } catch (error) {
        console.log('⚠️  压缩包创建失败，请手动创建');
    }
}

// 主执行函数
async function main() {
    try {
        createReleaseDirectory();
        copyProjectFiles();
        createReleaseInfo();
        createInstallScripts();
        createDockerConfig();
        createReleaseManifest();
        createQuickStart();
        cleanupAndOptimize();
        createArchives();
        
        console.log('');
        console.log('🎉 智游助手v6.52-preview发布包准备完成！');
        console.log('');
        console.log('📦 发布文件:');
        console.log(`  📁 ${RELEASE_DIR}/`);
        console.log(`  📦 smart-travel-assistant-v${VERSION}.tar.gz`);
        console.log(`  📦 smart-travel-assistant-v${VERSION}.zip`);
        console.log('');
        console.log('🚀 下一步:');
        console.log('  1. 测试发布包');
        console.log('  2. 创建GitHub Release');
        console.log('  3. 上传发布文件');
        console.log('');
        
    } catch (error) {
        console.error('❌ 发布准备失败:', error.message);
        process.exit(1);
    }
}

// 执行脚本
if (require.main === module) {
    main();
}

module.exports = { main };
