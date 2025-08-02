#!/usr/bin/env node

/**
 * 智游助手v5.0 项目打包脚本
 * 创建完整的项目交接压缩包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  packageName: 'smart-travel-assistant-v5.0.zip',
  projectRoot: process.cwd(),
  tempDir: path.join(process.cwd(), 'temp-package'),
  
  // 必须包含的文件和目录
  includePatterns: [
    // 配置文件
    'package.json',
    'package-lock.json',
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    'postcss.config.js',
    'vitest.config.ts',
    '.env.example',
    '.gitignore',
    
    // 源代码
    'src/**/*',
    
    // 静态资源
    'public/**/*',
    
    // 脚本
    'scripts/**/*',
    
    // 文档
    'README.md',
    'docs/**/*',
    
    // 今天创建的交接文档
    'PROJECT_HANDOVER_v5.0.md',
    'RELEASE_NOTES_v5.0.md',
    'DEPLOYMENT_GUIDE_v5.0.md',
    'API_DOCUMENTATION_v5.0.md',
    'KNOWN_ISSUES_v5.0.md',
    'ARCHITECTURE_ANALYSIS_CTO.md',
    'PROJECT_FILES_MANIFEST.md',
    'PROJECT_HANDOVER_SUMMARY.md'
  ],
  
  // 必须排除的文件和目录
  excludePatterns: [
    'node_modules/**',
    '.next/**',
    '.env.local',
    '.env',
    'dist/**',
    'coverage/**',
    'logs/**',
    '.git/**',
    '*.log',
    'temp-package/**',
    '智游助手 Smart Travel Assistant/**',
    '智游助手项目文档/**',
    'docs-v5/**',
    '*.ipynb',
    '*.html',
    'data/**',
    '*.db',
    'requirements.txt'
  ]
};

/**
 * 检查文件是否应该被包含
 */
function shouldIncludeFile(filePath) {
  const relativePath = path.relative(CONFIG.projectRoot, filePath).replace(/\\/g, '/');

  // 检查排除模式
  for (const pattern of CONFIG.excludePatterns) {
    if (matchPattern(relativePath, pattern)) {
      return false;
    }
  }

  // 检查包含模式
  for (const pattern of CONFIG.includePatterns) {
    if (matchPattern(relativePath, pattern)) {
      return true;
    }
  }

  // 检查是否在包含的目录中
  const includeDirs = ['src', 'public', 'scripts', 'docs'];
  for (const dir of includeDirs) {
    if (relativePath.startsWith(dir + '/') || relativePath === dir) {
      return true;
    }
  }

  return false;
}

/**
 * 简单的glob模式匹配
 */
function matchPattern(filePath, pattern) {
  // 转换glob模式为正则表达式
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * 递归复制文件
 */
function copyFiles(sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const items = fs.readdirSync(sourceDir);
  let copiedCount = 0;
  
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);
    
    if (shouldIncludeFile(sourcePath)) {
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        copiedCount += copyFiles(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
        copiedCount++;
        console.log(`✓ 复制: ${path.relative(CONFIG.projectRoot, sourcePath)}`);
      }
    }
  }
  
  return copiedCount;
}

/**
 * 创建项目信息文件
 */
function createProjectInfo(targetDir) {
  const projectInfo = {
    name: "智游助手v5.0",
    version: "5.0.0",
    description: "AI驱动的智能旅行规划平台",
    packageDate: new Date().toISOString(),
    packageBy: "技术合伙人 (CTO)",
    
    quickStart: {
      "1. 安装依赖": "npm install",
      "2. 配置环境": "cp .env.example .env.local (然后编辑API密钥)",
      "3. 启动开发": "npm run dev",
      "4. 访问应用": "http://localhost:3001"
    },
    
    requiredApiKeys: [
      "AMAP_MCP_API_KEY - 高德地图MCP API密钥",
      "OPENAI_API_KEY - OpenAI API密钥"
    ],
    
    documentation: [
      "README.md - 项目概述",
      "PROJECT_HANDOVER_v5.0.md - 完整交接文档",
      "DEPLOYMENT_GUIDE_v5.0.md - 部署指南",
      "API_DOCUMENTATION_v5.0.md - API文档",
      "KNOWN_ISSUES_v5.0.md - 已知问题",
      "ARCHITECTURE_ANALYSIS_CTO.md - 架构分析"
    ],
    
    technicalStack: {
      frontend: "React 18 + Next.js 14 + TypeScript",
      backend: "Next.js API Routes + LangGraph",
      database: "SQLite (开发) / PostgreSQL (生产)",
      ai: "OpenAI GPT-4 + LangGraph",
      maps: "高德地图MCP",
      styling: "Tailwind CSS + Framer Motion",
      testing: "Vitest + Playwright"
    },
    
    systemRequirements: {
      nodejs: ">= 18.0.0",
      npm: ">= 9.0.0",
      memory: ">= 2GB RAM",
      storage: ">= 5GB"
    }
  };
  
  const infoPath = path.join(targetDir, 'PROJECT_INFO.json');
  fs.writeFileSync(infoPath, JSON.stringify(projectInfo, null, 2));
  console.log(`✓ 创建: PROJECT_INFO.json`);
}

/**
 * 验证包内容
 */
function validatePackage(packageDir) {
  console.log('\n📋 验证包内容...');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'PROJECT_HANDOVER_v5.0.md',
    '.env.example',
    'src/pages/index.tsx',
    'src/components',
    'src/services',
    'docs'
  ];
  
  let allValid = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(packageDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file}`);
    } else {
      console.log(`❌ 缺失: ${file}`);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * 创建压缩包
 */
function createZipPackage() {
  console.log('\n📦 创建ZIP压缩包...');
  
  try {
    // 使用系统的zip命令创建压缩包
    const zipCommand = `cd "${CONFIG.tempDir}" && zip -r "../${CONFIG.packageName}" . -x "*.DS_Store" "*.git*"`;
    execSync(zipCommand, { stdio: 'inherit' });
    
    const packagePath = path.join(CONFIG.projectRoot, CONFIG.packageName);
    const stats = fs.statSync(packagePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ 压缩包创建成功: ${CONFIG.packageName}`);
    console.log(`📊 文件大小: ${sizeInMB} MB`);
    
    return packagePath;
  } catch (error) {
    console.error('❌ 创建压缩包失败:', error.message);
    return null;
  }
}

/**
 * 清理临时文件
 */
function cleanup() {
  if (fs.existsSync(CONFIG.tempDir)) {
    fs.rmSync(CONFIG.tempDir, { recursive: true, force: true });
    console.log('🧹 清理临时文件完成');
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始创建智游助手v5.0项目交接包...\n');
  
  try {
    // 清理之前的临时文件
    cleanup();
    
    // 创建临时目录
    fs.mkdirSync(CONFIG.tempDir, { recursive: true });
    
    // 复制文件
    console.log('📁 复制项目文件...');
    const copiedCount = copyFiles(CONFIG.projectRoot, CONFIG.tempDir);
    console.log(`✓ 共复制 ${copiedCount} 个文件\n`);
    
    // 创建项目信息文件
    createProjectInfo(CONFIG.tempDir);
    
    // 验证包内容
    const isValid = validatePackage(CONFIG.tempDir);
    if (!isValid) {
      throw new Error('包验证失败，存在缺失文件');
    }
    
    // 创建压缩包
    const packagePath = createZipPackage();
    if (!packagePath) {
      throw new Error('压缩包创建失败');
    }
    
    // 清理临时文件
    cleanup();
    
    console.log('\n🎉 项目交接包创建完成!');
    console.log(`📦 文件位置: ${packagePath}`);
    console.log('\n📋 使用说明:');
    console.log('1. 解压缩包到目标目录');
    console.log('2. 运行 npm install 安装依赖');
    console.log('3. 复制 .env.example 为 .env.local 并配置API密钥');
    console.log('4. 运行 npm run dev 启动开发服务器');
    console.log('5. 访问 http://localhost:3001 验证功能');
    
  } catch (error) {
    console.error('\n❌ 创建失败:', error.message);
    cleanup();
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };
