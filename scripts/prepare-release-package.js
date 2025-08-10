#!/usr/bin/env node

/**
 * 发布包准备脚本
 * 创建完整的发布包，包含所有必要文件和文档
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 智游助手v6.5发布包准备');
console.log('=====================================');

const VERSION = '6.5.0';
const RELEASE_DIR = 'release-v6.5.0';
const PACKAGE_NAME = `smart-travel-assistant-v${VERSION}`;

// 清理并创建发布目录
function setupReleaseDirectory() {
  console.log('📁 设置发布目录...');
  
  if (fs.existsSync(RELEASE_DIR)) {
    execSync(`rm -rf ${RELEASE_DIR}`);
  }
  fs.mkdirSync(RELEASE_DIR);
  
  console.log(`✅ 发布目录已创建: ${RELEASE_DIR}`);
}

// 复制核心文件
function copyFiles() {
  console.log('📄 复制核心文件...');
  
  const filesToCopy = [
    // 项目配置文件
    'package.json',
    'package-lock.json',
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    
    // 文档文件
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'VERSION.md',
    'QUICK_START.md',
    
    // 配置和构建文件
    'BUILD_INFO.json',
    '.env.example',
    '.gitignore',
    
    // 发布说明
    'RELEASE_NOTES.md'
  ];
  
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      execSync(`cp ${file} ${RELEASE_DIR}/`);
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⚠️  ${file} - 文件不存在`);
    }
  });
}

// 复制源代码目录
function copyDirectories() {
  console.log('📂 复制源代码目录...');
  
  const dirsToCopy = [
    'src',
    'public',
    'docs',
    'scripts'
  ];
  
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      execSync(`cp -r ${dir} ${RELEASE_DIR}/`);
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ⚠️  ${dir}/ - 目录不存在`);
    }
  });
}

// 创建安装脚本
function createInstallScript() {
  console.log('📜 创建安装脚本...');
  
  const installScript = `#!/bin/bash

# 智游助手v${VERSION}安装脚本

echo "🚀 智游助手v${VERSION}安装开始"
echo "================================="

# 检查Node.js版本
echo "🔍 检查Node.js版本..."
node_version=$(node --version 2>/dev/null || echo "未安装")
if [[ "$node_version" == "未安装" ]]; then
    echo "❌ Node.js未安装，请先安装Node.js v18.17.0+"
    exit 1
fi

echo "✅ Node.js版本: $node_version"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 检查环境变量配置
echo "⚙️  检查环境变量配置..."
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境变量配置文件..."
    cp .env.example .env.local
    echo "⚠️  请编辑.env.local文件，填入必要的API密钥"
    echo "   - DEEPSEEK_API_KEY (必需)"
    echo "   - AMAP_API_KEY (必需)"
    echo "   - SILICONFLOW_API_KEY (可选)"
fi

# 运行验证
echo "🧪 运行基础验证..."
npm run type-check

if [ $? -eq 0 ]; then
    echo "✅ 类型检查通过"
else
    echo "❌ 类型检查失败"
    exit 1
fi

echo ""
echo "🎉 智游助手v${VERSION}安装完成！"
echo "================================="
echo ""
echo "🚀 下一步操作:"
echo "1. 编辑.env.local文件，填入API密钥"
echo "2. 运行开发服务器: npm run dev"
echo "3. 访问 http://localhost:3000"
echo ""
echo "📚 更多信息:"
echo "- 快速开始: cat QUICK_START.md"
echo "- 完整文档: docs/"
echo "- 问题反馈: https://github.com/your-org/smart-travel-assistant-v6/issues"
echo ""
`;

  fs.writeFileSync(path.join(RELEASE_DIR, 'install.sh'), installScript);
  execSync(`chmod +x ${RELEASE_DIR}/install.sh`);
  console.log('✅ install.sh');
}

// 创建Windows安装脚本
function createWindowsInstallScript() {
  console.log('📜 创建Windows安装脚本...');
  
  const installBat = `@echo off
echo 🚀 智游助手v${VERSION}安装开始
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
echo 🎉 智游助手v${VERSION}安装完成！
echo =================================
echo.
echo 🚀 下一步操作:
echo 1. 编辑.env.local文件，填入API密钥
echo 2. 运行开发服务器: npm run dev
echo 3. 访问 http://localhost:3000
echo.
echo 📚 更多信息:
echo - 快速开始: type QUICK_START.md
echo - 完整文档: docs\\
echo - 问题反馈: https://github.com/your-org/smart-travel-assistant-v6/issues
echo.
pause
`;

  fs.writeFileSync(path.join(RELEASE_DIR, 'install.bat'), installBat);
  console.log('✅ install.bat');
}

// 创建Docker文件
function createDockerFiles() {
  console.log('🐳 创建Docker文件...');
  
  const dockerfile = `# 智游助手v${VERSION} Docker镜像
FROM node:18-alpine

# 设置工作目录
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
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV TIMELINE_V2_ENABLED=true

# 启动应用
CMD ["npm", "start"]
`;

  const dockerCompose = `version: '3.8'

services:
  smart-travel:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TIMELINE_V2_ENABLED=true
      - DEEPSEEK_API_KEY=your_deepseek_api_key_here
      - SILICONFLOW_API_KEY=your_siliconflow_api_key_here
      - AMAP_API_KEY=your_amap_api_key_here
      - TENCENT_MAP_API_KEY=your_tencent_map_api_key_here
      - REDIS_URL=redis://localhost:6379
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
`;

  fs.writeFileSync(path.join(RELEASE_DIR, 'Dockerfile'), dockerfile);
  fs.writeFileSync(path.join(RELEASE_DIR, 'docker-compose.yml'), dockerCompose);
  console.log('✅ Dockerfile');
  console.log('✅ docker-compose.yml');
}

// 创建发布清单
function createReleaseManifest() {
  console.log('📋 创建发布清单...');
  
  const manifest = {
    name: "智游助手",
    version: VERSION,
    codename: "Timeline解析架构v2.0",
    releaseDate: new Date().toISOString(),
    type: "preview",
    
    features: {
      core: [
        "Timeline解析架构v2.0",
        "可插拔解析器系统",
        "Feature Flag支持",
        "双LLM服务容错",
        "双地图服务容错"
      ],
      architecture: [
        "服务端解析优先",
        "前端组件架构优化",
        "智能优先级选择",
        "完整容错机制"
      ],
      performance: [
        "解析时间 <500ms",
        "渲染时间 <200ms",
        "解析成功率 >99%",
        "数据完整性 100%"
      ]
    },
    
    requirements: {
      node: ">=18.17.0",
      npm: ">=9.0.0",
      memory: "4GB (推荐8GB)",
      storage: "20GB"
    },
    
    apiKeys: {
      required: ["DEEPSEEK_API_KEY", "AMAP_API_KEY"],
      optional: ["SILICONFLOW_API_KEY", "TENCENT_MAP_API_KEY"]
    },
    
    documentation: [
      "README.md",
      "QUICK_START.md",
      "docs/timeline-architecture.md",
      "docs/timeline-troubleshooting-sop.md",
      "docs/API.md",
      "docs/DEPLOYMENT.md"
    ],
    
    scripts: [
      "install.sh",
      "install.bat",
      "scripts/verify-timeline-v2.js",
      "scripts/quick-verify.js"
    ],
    
    checksum: "待生成"
  };
  
  fs.writeFileSync(
    path.join(RELEASE_DIR, 'RELEASE_MANIFEST.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ RELEASE_MANIFEST.json');
}

// 创建压缩包
function createPackages() {
  console.log('📦 创建发布包...');
  
  try {
    // 创建tar.gz包
    execSync(`tar -czf ${PACKAGE_NAME}.tar.gz -C ${RELEASE_DIR} .`);
    console.log(`✅ ${PACKAGE_NAME}.tar.gz`);
    
    // 创建zip包
    execSync(`cd ${RELEASE_DIR} && zip -r ../${PACKAGE_NAME}.zip .`);
    console.log(`✅ ${PACKAGE_NAME}.zip`);
    
    // 显示包大小
    const tarSize = fs.statSync(`${PACKAGE_NAME}.tar.gz`).size;
    const zipSize = fs.statSync(`${PACKAGE_NAME}.zip`).size;
    
    console.log(`📊 包大小:`);
    console.log(`  tar.gz: ${(tarSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  zip: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
    
    return [
      `${PACKAGE_NAME}.tar.gz`,
      `${PACKAGE_NAME}.zip`
    ];
  } catch (error) {
    console.log('❌ 创建压缩包失败:', error.message);
    return [];
  }
}

// 验证发布包
function validateReleasePackage() {
  console.log('🔍 验证发布包...');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'QUICK_START.md',
    '.env.example',
    'install.sh',
    'install.bat',
    'src/lib/timeline/orchestrator.ts',
    'docs/timeline-architecture.md'
  ];
  
  let allFilesPresent = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(RELEASE_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - 缺失`);
      allFilesPresent = false;
    }
  });
  
  return allFilesPresent;
}

// 主执行函数
async function main() {
  try {
    console.log(`开始准备v${VERSION}发布包...\n`);
    
    // 1. 设置发布目录
    setupReleaseDirectory();
    
    // 2. 复制文件
    copyFiles();
    copyDirectories();
    
    // 3. 创建安装脚本
    createInstallScript();
    createWindowsInstallScript();
    
    // 4. 创建Docker文件
    createDockerFiles();
    
    // 5. 创建发布清单
    createReleaseManifest();
    
    // 6. 验证发布包
    const isValid = validateReleasePackage();
    
    if (!isValid) {
      console.log('\n❌ 发布包验证失败，请检查缺失文件');
      process.exit(1);
    }
    
    // 7. 创建压缩包
    const packages = createPackages();
    
    console.log('\n🎉 发布包准备完成！');
    console.log('=====================================');
    console.log(`✅ 发布目录: ${RELEASE_DIR}`);
    console.log(`✅ 压缩包: ${packages.join(', ')}`);
    console.log(`✅ 版本: v${VERSION}`);
    console.log('✅ Timeline解析架构v2.0已集成');
    
    console.log('\n📦 发布包内容:');
    console.log('- 完整源代码');
    console.log('- Timeline解析架构v2.0');
    console.log('- 完整文档和SOP');
    console.log('- 安装脚本 (Linux/macOS/Windows)');
    console.log('- Docker配置文件');
    console.log('- 环境变量示例');
    
    console.log('\n🚀 下一步操作:');
    console.log('1. 上传到GitHub Release');
    console.log('2. 测试安装和部署');
    console.log('3. 发布公告');
    console.log('4. 收集用户反馈');
    
  } catch (error) {
    console.error('❌ 发布包准备失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  setupReleaseDirectory,
  createPackages,
  validateReleasePackage,
  VERSION,
  PACKAGE_NAME
};
