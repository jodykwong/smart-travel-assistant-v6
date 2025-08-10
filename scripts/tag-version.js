#!/usr/bin/env node

/**
 * 智游助手v6.5版本标记脚本
 * 在代码中添加版本信息和构建时间戳
 */

const fs = require('fs');
const path = require('path');

console.log('🏷️  智游助手v6.5版本标记');
console.log('=====================================');

const VERSION = '6.5.0';
const BUILD_TIME = new Date().toISOString();
const BUILD_HASH = Math.random().toString(36).substr(2, 8);

// 版本信息对象
const versionInfo = {
  version: VERSION,
  buildTime: BUILD_TIME,
  buildHash: BUILD_HASH,
  features: [
    'Timeline解析架构v2.0',
    'LLM+Map双链路容错',
    'Feature Flag支持',
    '高性能缓存策略',
    '完整监控告警'
  ],
  architecture: {
    frontend: 'Next.js 14 + TypeScript',
    backend: 'Node.js + API Routes',
    database: 'SQLite + Redis',
    ai: 'DeepSeek + SiliconFlow',
    maps: 'AMap + Tencent Maps'
  }
};

// 创建版本信息文件
function createVersionFile() {
  const versionFilePath = 'src/lib/version.ts';
  const versionFileContent = `/**
 * 智游助手v6.5版本信息
 * 自动生成，请勿手动修改
 */

export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)} as const;

export function getVersion(): string {
  return VERSION_INFO.version;
}

export function getBuildInfo(): string {
  return \`v\${VERSION_INFO.version} (build \${VERSION_INFO.buildHash})\`;
}

export function getFullVersionInfo(): typeof VERSION_INFO {
  return VERSION_INFO;
}

export function isTimelineV2Supported(): boolean {
  return true; // v6.5+支持Timeline解析架构v2.0
}

export function getTimelineParserVersion(): string {
  return '2.0.0';
}
`;

  fs.writeFileSync(versionFilePath, versionFileContent, 'utf8');
  console.log(`✅ 创建版本文件: ${versionFilePath}`);
}

// 更新package.json中的版本信息
function updatePackageJson() {
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.version = VERSION;
  packageJson.buildTime = BUILD_TIME;
  packageJson.buildHash = BUILD_HASH;
  
  // 确保描述包含版本信息
  if (!packageJson.description.includes('v6.5')) {
    packageJson.description = packageJson.description.replace(/v\d+\.\d+/, 'v6.5');
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`✅ 更新package.json版本: ${VERSION}`);
}

// 在主要组件中添加版本标记
function addVersionToComponents() {
  const componentsToTag = [
    {
      path: 'src/lib/timeline/orchestrator.ts',
      marker: '// Timeline解析架构v2.0',
      versionComment: `/**
 * Timeline解析架构v2.0 - 核心调度器
 * 版本: ${VERSION}
 * 构建时间: ${BUILD_TIME}
 */`
    },
    {
      path: 'src/pages/api/v1/planning/sessions/[sessionId]/index.ts',
      marker: '// 智游助手v6.5',
      versionComment: `/**
 * 智游助手v6.5 - 会话详情API
 * 版本: ${VERSION}
 * Timeline解析架构: v2.0
 */`
    }
  ];
  
  componentsToTag.forEach(component => {
    if (fs.existsSync(component.path)) {
      let content = fs.readFileSync(component.path, 'utf8');
      
      // 如果文件开头没有版本注释，添加它
      if (!content.includes(`版本: ${VERSION}`)) {
        // 找到第一个import或其他代码行之前插入版本注释
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // 跳过现有的注释块
        while (insertIndex < lines.length && 
               (lines[insertIndex].trim().startsWith('/**') || 
                lines[insertIndex].trim().startsWith('*') ||
                lines[insertIndex].trim().startsWith('*/') ||
                lines[insertIndex].trim() === '')) {
          insertIndex++;
        }
        
        lines.splice(insertIndex, 0, component.versionComment, '');
        content = lines.join('\n');
        
        fs.writeFileSync(component.path, content, 'utf8');
        console.log(`✅ 添加版本标记: ${component.path}`);
      }
    }
  });
}

// 创建构建信息文件
function createBuildInfo() {
  const buildInfoPath = 'BUILD_INFO.json';
  const buildInfo = {
    version: VERSION,
    buildTime: BUILD_TIME,
    buildHash: BUILD_HASH,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitCommit: 'N/A', // 在实际CI/CD中会被替换
    gitBranch: 'main',
    buildEnvironment: 'development',
    features: versionInfo.features,
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0',
      typescript: '^5.0.0',
      tailwindcss: '^3.0.0'
    }
  };
  
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2), 'utf8');
  console.log(`✅ 创建构建信息: ${buildInfoPath}`);
}

// 更新README.md中的版本信息
function updateReadme() {
  const readmePath = 'README.md';
  if (fs.existsSync(readmePath)) {
    let content = fs.readFileSync(readmePath, 'utf8');
    
    // 更新版本徽章
    content = content.replace(
      /!\[Version\]\([^)]*\)/g,
      `![Version](https://img.shields.io/badge/version-${VERSION}-blue.svg)`
    );
    
    // 更新版本号引用
    content = content.replace(/v\d+\.\d+\.\d+/g, `v${VERSION}`);
    
    fs.writeFileSync(readmePath, content, 'utf8');
    console.log(`✅ 更新README.md版本信息`);
  }
}

// 验证版本标记
function validateVersionTags() {
  console.log('\n🔍 验证版本标记...');
  
  const filesToCheck = [
    'src/lib/version.ts',
    'package.json',
    'BUILD_INFO.json'
  ];
  
  let allValid = true;
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(VERSION)) {
        console.log(`✅ ${file}: 版本信息正确`);
      } else {
        console.log(`❌ ${file}: 版本信息缺失`);
        allValid = false;
      }
    } else {
      console.log(`❌ ${file}: 文件不存在`);
      allValid = false;
    }
  });
  
  return allValid;
}

// 主执行流程
async function main() {
  try {
    console.log(`📦 开始标记版本 ${VERSION}...`);
    
    createVersionFile();
    updatePackageJson();
    addVersionToComponents();
    createBuildInfo();
    updateReadme();
    
    const isValid = validateVersionTags();
    
    console.log('\n📊 版本标记完成');
    console.log('=====================================');
    
    if (isValid) {
      console.log(`✅ 智游助手v${VERSION}版本标记成功！`);
      console.log('\n🎯 版本信息:');
      console.log(`- 版本号: ${VERSION}`);
      console.log(`- 构建时间: ${BUILD_TIME}`);
      console.log(`- 构建哈希: ${BUILD_HASH}`);
      console.log(`- Timeline解析架构: v2.0`);
      
      console.log('\n🚀 下一步操作:');
      console.log('1. 运行代码脱敏脚本');
      console.log('2. 执行完整测试');
      console.log('3. 生成发布包');
      console.log('4. 创建Git标签');
    } else {
      console.log('❌ 版本标记存在问题，请检查');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 版本标记失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createVersionFile,
  updatePackageJson,
  validateVersionTags,
  VERSION_INFO: versionInfo
};
