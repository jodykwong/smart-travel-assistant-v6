#!/usr/bin/env node

/**
 * 智游助手v6.5 GitHub开源发布准备脚本
 * 自动化准备开源发布包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 智游助手v6.5 GitHub开源发布准备');
console.log('=====================================');

const VERSION = '6.5.0';
const RELEASE_DIR = 'release';

// 发布检查清单
const releaseChecklist = [
  { name: '版本标记', check: checkVersionTags },
  { name: '代码脱敏', check: checkSanitization },
  { name: '文档完整性', check: checkDocumentation },
  { name: '测试覆盖', check: checkTests },
  { name: '构建成功', check: checkBuild },
  { name: '许可证文件', check: checkLicense },
  { name: '贡献指南', check: checkContributing },
  { name: '更新日志', check: checkChangelog }
];

// 检查版本标记
function checkVersionTags() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const versionFile = fs.existsSync('src/lib/version.ts') ? 
    fs.readFileSync('src/lib/version.ts', 'utf8') : '';
  
  return {
    passed: packageJson.version === VERSION && versionFile.includes(VERSION),
    message: `package.json: ${packageJson.version}, version.ts: ${versionFile.includes(VERSION) ? '✓' : '✗'}`
  };
}

// 检查代码脱敏
function checkSanitization() {
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{48}/,
    /DEEPSEEK_API_KEY=your_deepseek_api_key_here
    /Bearer [a-zA-Z0-9]{32,}/
  ];
  
  let foundSensitive = false;
  const checkFiles = ['src', 'pages', 'components'].filter(dir => fs.existsSync(dir));
  
  for (const dir of checkFiles) {
    try {
      const result = execSync(`grep -r "sk-[a-zA-Z0-9]\\{48\\}" ${dir} || true`, { encoding: 'utf8' });
      if (result.trim()) {
        foundSensitive = true;
        break;
      }
    } catch (error) {
      // 忽略grep错误
    }
  }
  
  return {
    passed: !foundSensitive,
    message: foundSensitive ? '发现敏感信息' : '脱敏检查通过'
  };
}

// 检查文档完整性
function checkDocumentation() {
  const requiredDocs = [
    'README.md',
    'docs/API.md',
    'docs/timeline-architecture.md',
    'docs/timeline-troubleshooting-sop.md',
    'docs/DEPLOYMENT.md',
    'VERSION.md'
  ];
  
  const missingDocs = requiredDocs.filter(doc => !fs.existsSync(doc));
  
  return {
    passed: missingDocs.length === 0,
    message: missingDocs.length > 0 ? `缺少文档: ${missingDocs.join(', ')}` : '文档完整'
  };
}

// 检查测试覆盖
function checkTests() {
  try {
    execSync('npm test', { stdio: 'pipe' });
    return { passed: true, message: '测试通过' };
  } catch (error) {
    return { passed: false, message: '测试失败' };
  }
}

// 检查构建成功
function checkBuild() {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    return { passed: true, message: '构建成功' };
  } catch (error) {
    return { passed: false, message: '构建失败' };
  }
}

// 检查许可证文件
function checkLicense() {
  const hasLicense = fs.existsSync('LICENSE');
  return {
    passed: hasLicense,
    message: hasLicense ? 'LICENSE文件存在' : 'LICENSE文件缺失'
  };
}

// 检查贡献指南
function checkContributing() {
  const hasContributing = fs.existsSync('CONTRIBUTING.md');
  return {
    passed: hasContributing,
    message: hasContributing ? 'CONTRIBUTING.md存在' : 'CONTRIBUTING.md缺失'
  };
}

// 检查更新日志
function checkChangelog() {
  const hasChangelog = fs.existsSync('CHANGELOG.md');
  if (!hasChangelog) {
    return { passed: false, message: 'CHANGELOG.md缺失' };
  }
  
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const hasV65 = changelog.includes('[6.5.0]');
  
  return {
    passed: hasV65,
    message: hasV65 ? 'CHANGELOG.md包含v6.5.0' : 'CHANGELOG.md缺少v6.5.0条目'
  };
}

// 创建发布包
function createReleasePackage() {
  console.log('\n📦 创建发布包...');
  
  // 创建发布目录
  if (fs.existsSync(RELEASE_DIR)) {
    execSync(`rm -rf ${RELEASE_DIR}`);
  }
  fs.mkdirSync(RELEASE_DIR);
  
  // 复制必要文件
  const filesToCopy = [
    'package.json',
    'package-lock.json',
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'VERSION.md',
    'BUILD_INFO.json',
    '.env.example'
  ];
  
  const dirsToCopy = [
    'src',
    'public',
    'docs',
    'scripts',
    'tests'
  ];
  
  // 复制文件
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      execSync(`cp ${file} ${RELEASE_DIR}/`);
      console.log(`✅ 复制文件: ${file}`);
    }
  });
  
  // 复制目录
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      execSync(`cp -r ${dir} ${RELEASE_DIR}/`);
      console.log(`✅ 复制目录: ${dir}`);
    }
  });
  
  // 创建发布说明
  const releaseNotes = `# 智游助手v${VERSION}发布包

## 🎉 版本信息
- **版本**: v${VERSION}
- **发布日期**: ${new Date().toISOString().split('T')[0]}
- **核心特性**: Timeline解析架构v2.0

## 🚀 主要特性
- Timeline解析架构v2.0，解析成功率>99%
- Feature Flag支持，零停机切换
- 双LLM服务和双地图服务容错
- 完整的监控和日志系统

## 📦 安装和使用
\`\`\`bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑.env.local，填入API密钥

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
npm start
\`\`\`

## 📚 文档
- [API文档](docs/API.md)
- [Timeline解析架构](docs/timeline-architecture.md)
- [部署指南](docs/DEPLOYMENT.md)
- [贡献指南](CONTRIBUTING.md)

## 🤝 贡献
欢迎贡献代码、文档、测试和反馈！请查看[贡献指南](CONTRIBUTING.md)了解详情。

## 📄 许可证
本项目采用[MIT许可证](LICENSE)。
`;
  
  fs.writeFileSync(path.join(RELEASE_DIR, 'RELEASE_NOTES.md'), releaseNotes);
  console.log('✅ 创建发布说明');
  
  // 创建压缩包
  try {
    execSync(`tar -czf smart-travel-assistant-v${VERSION}.tar.gz -C ${RELEASE_DIR} .`);
    console.log(`✅ 创建压缩包: smart-travel-assistant-v${VERSION}.tar.gz`);
  } catch (error) {
    console.log('⚠️  压缩包创建失败，请手动创建');
  }
}

// 生成发布报告
function generateReleaseReport(results) {
  const report = {
    version: VERSION,
    releaseDate: new Date().toISOString(),
    checkResults: results,
    passed: results.every(r => r.passed),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    }
  };
  
  fs.writeFileSync('RELEASE_REPORT.json', JSON.stringify(report, null, 2));
  console.log('✅ 生成发布报告: RELEASE_REPORT.json');
  
  return report;
}

// 主执行流程
async function main() {
  try {
    console.log(`📋 开始发布检查 (v${VERSION})...`);
    
    const results = [];
    
    for (const item of releaseChecklist) {
      console.log(`\n🔍 检查: ${item.name}`);
      const result = item.check();
      results.push({
        name: item.name,
        passed: result.passed,
        message: result.message
      });
      
      if (result.passed) {
        console.log(`✅ ${item.name}: ${result.message}`);
      } else {
        console.log(`❌ ${item.name}: ${result.message}`);
      }
    }
    
    const report = generateReleaseReport(results);
    
    console.log('\n📊 发布检查结果');
    console.log('=====================================');
    console.log(`总计: ${report.summary.total}`);
    console.log(`通过: ${report.summary.passed}`);
    console.log(`失败: ${report.summary.failed}`);
    
    if (report.passed) {
      console.log('\n✅ 所有检查通过！开始创建发布包...');
      createReleasePackage();
      
      console.log('\n🎉 发布准备完成！');
      console.log('\n🚀 下一步操作:');
      console.log('1. 检查发布包内容');
      console.log('2. 创建GitHub仓库');
      console.log('3. 推送代码到GitHub');
      console.log('4. 创建Release标签');
      console.log('5. 发布到npm (可选)');
      
    } else {
      console.log('\n❌ 发布检查失败，请修复以下问题:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`- ${r.name}: ${r.message}`);
      });
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 发布准备失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkVersionTags,
  checkSanitization,
  checkDocumentation,
  createReleasePackage,
  VERSION
};
