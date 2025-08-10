#!/usr/bin/env node

/**
 * 发布后验证脚本
 * 验证GitHub发布的完整性和功能性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 智游助手v6.5发布后验证');
console.log('=====================================');

const VERSION = '6.5.0';
const TAG_NAME = `v${VERSION}-preview`;
const REPO_NAME = 'smart-travel-assistant-v6';

// 验证GitHub Release
function verifyGitHubRelease() {
  console.log('🚀 验证GitHub Release...');
  
  try {
    // 检查Release是否存在
    const releaseInfo = execSync(`gh release view ${TAG_NAME}`, { encoding: 'utf8' });
    console.log('✅ GitHub Release存在');
    
    // 检查Release资产
    const assets = execSync(`gh release view ${TAG_NAME} --json assets -q '.assets[].name'`, { encoding: 'utf8' });
    const assetList = assets.trim().split('\n').filter(Boolean);
    
    console.log('📦 Release资产:');
    assetList.forEach(asset => {
      console.log(`  ✅ ${asset}`);
    });
    
    // 验证必需资产
    const requiredAssets = [
      `smart-travel-assistant-v${VERSION}.tar.gz`,
      'timeline-architecture.md',
      'API.md'
    ];
    
    const missingAssets = requiredAssets.filter(asset => 
      !assetList.some(existing => existing.includes(asset.split('.')[0]))
    );
    
    if (missingAssets.length > 0) {
      console.log('⚠️  缺失资产:', missingAssets.join(', '));
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ GitHub Release验证失败:', error.message);
    return false;
  }
}

// 验证克隆和安装
function verifyCloneAndInstall() {
  console.log('\n🔄 验证克隆和安装...');
  
  const testDir = 'test-clone';
  
  try {
    // 清理测试目录
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
    
    // 获取仓库URL
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    const repoUrl = `https://github.com/${username}/${REPO_NAME}.git`;
    
    console.log(`📥 克隆仓库: ${repoUrl}`);
    execSync(`git clone ${repoUrl} ${testDir}`, { stdio: 'pipe' });
    console.log('✅ 仓库克隆成功');
    
    // 切换到测试目录
    process.chdir(testDir);
    
    // 检查关键文件
    const keyFiles = [
      'package.json',
      'README.md',
      'src/lib/timeline/orchestrator.ts',
      'docs/timeline-architecture.md',
      '.env.example'
    ];
    
    console.log('📁 检查关键文件:');
    let allFilesPresent = true;
    keyFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file} - 缺失`);
        allFilesPresent = false;
      }
    });
    
    if (!allFilesPresent) {
      return false;
    }
    
    // 安装依赖
    console.log('📦 安装依赖...');
    execSync('npm install', { stdio: 'pipe' });
    console.log('✅ 依赖安装成功');
    
    // 运行类型检查
    console.log('🧪 运行类型检查...');
    execSync('npm run type-check', { stdio: 'pipe' });
    console.log('✅ 类型检查通过');
    
    // 返回原目录
    process.chdir('..');
    
    // 清理测试目录
    execSync(`rm -rf ${testDir}`);
    
    return true;
  } catch (error) {
    console.log('❌ 克隆和安装验证失败:', error.message);
    
    // 清理测试目录
    try {
      process.chdir('..');
      execSync(`rm -rf ${testDir}`);
    } catch (cleanupError) {
      // 忽略清理错误
    }
    
    return false;
  }
}

// 验证文档链接
function verifyDocumentationLinks() {
  console.log('\n📚 验证文档链接...');
  
  const docsToCheck = [
    'README.md',
    'docs/timeline-architecture.md',
    'docs/API.md',
    'QUICK_START.md'
  ];
  
  let allLinksValid = true;
  
  docsToCheck.forEach(doc => {
    if (fs.existsSync(doc)) {
      console.log(`📄 检查 ${doc}:`);
      
      const content = fs.readFileSync(doc, 'utf8');
      
      // 检查内部链接
      const internalLinks = content.match(/\[.*?\]\((?!http)[^)]+\)/g) || [];
      internalLinks.forEach(link => {
        const linkPath = link.match(/\(([^)]+)\)/)[1];
        const fullPath = path.resolve(path.dirname(doc), linkPath);
        
        if (fs.existsSync(fullPath)) {
          console.log(`    ✅ ${linkPath}`);
        } else {
          console.log(`    ❌ ${linkPath} - 链接失效`);
          allLinksValid = false;
        }
      });
      
      // 检查Timeline v2.0相关内容
      const hasTimelineV2 = content.includes('Timeline解析架构v2.0');
      const hasFeatureFlag = content.includes('Feature Flag');
      const hasPerformance = content.includes('>99%') || content.includes('<500ms');
      
      console.log(`    ${hasTimelineV2 ? '✅' : '❌'} Timeline v2.0内容`);
      console.log(`    ${hasFeatureFlag ? '✅' : '❌'} Feature Flag说明`);
      console.log(`    ${hasPerformance ? '✅' : '❌'} 性能指标`);
      
      if (!hasTimelineV2 || !hasFeatureFlag || !hasPerformance) {
        allLinksValid = false;
      }
    } else {
      console.log(`❌ ${doc} - 文档缺失`);
      allLinksValid = false;
    }
  });
  
  return allLinksValid;
}

// 验证Timeline v2.0特性
function verifyTimelineV2Features() {
  console.log('\n🚀 验证Timeline v2.0特性...');
  
  const featureChecks = [
    {
      name: '核心调度器',
      file: 'src/lib/timeline/orchestrator.ts',
      patterns: ['TimelineOrchestrator', 'parseTimelineToLegacy']
    },
    {
      name: '解析器插件',
      file: 'src/lib/timeline/plugins',
      patterns: ['JsonParser', 'MarkdownPeriodParser', 'HeuristicTimeParser']
    },
    {
      name: 'Feature Flag',
      file: 'src/lib/feature-flags.ts',
      patterns: ['isTimelineV2Enabled', 'TIMELINE_V2_ENABLED']
    },
    {
      name: '前端集成',
      file: 'src/components/travel-plan/DailyItinerarySection.tsx',
      patterns: ['legacyFormat', 'convertLegacyFormatToItineraries']
    },
    {
      name: 'API集成',
      file: 'src/pages/api/v1/planning/sessions/[sessionId]/index.ts',
      patterns: ['parseTimelineToLegacy', 'timelineVersion']
    }
  ];
  
  let allFeaturesPresent = true;
  
  featureChecks.forEach(check => {
    console.log(`🔍 检查 ${check.name}:`);
    
    if (!fs.existsSync(check.file)) {
      console.log(`  ❌ 文件不存在: ${check.file}`);
      allFeaturesPresent = false;
      return;
    }
    
    let content = '';
    if (fs.statSync(check.file).isDirectory()) {
      // 对于目录，检查所有文件
      const files = fs.readdirSync(check.file, { recursive: true })
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
        .map(file => path.join(check.file, file));
      
      content = files.map(file => {
        try {
          return fs.readFileSync(file, 'utf8');
        } catch (error) {
          return '';
        }
      }).join('\n');
    } else {
      content = fs.readFileSync(check.file, 'utf8');
    }
    
    check.patterns.forEach(pattern => {
      if (content.includes(pattern)) {
        console.log(`    ✅ ${pattern}`);
      } else {
        console.log(`    ❌ ${pattern} - 缺失`);
        allFeaturesPresent = false;
      }
    });
  });
  
  return allFeaturesPresent;
}

// 验证环境变量配置
function verifyEnvironmentConfig() {
  console.log('\n⚙️  验证环境变量配置...');
  
  if (!fs.existsSync('.env.example')) {
    console.log('❌ .env.example文件缺失');
    return false;
  }
  
  const envContent = fs.readFileSync('.env.example', 'utf8');
  
  const requiredVars = [
    'DEEPSEEK_API_KEY',
    'AMAP_API_KEY',
    'TIMELINE_V2_ENABLED',
    'TIMELINE_V2_PERCENTAGE'
  ];
  
  const optionalVars = [
    'SILICONFLOW_API_KEY',
    'TENCENT_MAP_API_KEY',
    'REDIS_URL'
  ];
  
  console.log('📋 必需环境变量:');
  let allRequiredPresent = true;
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ❌ ${varName} - 缺失`);
      allRequiredPresent = false;
    }
  });
  
  console.log('📋 可选环境变量:');
  optionalVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ⚠️  ${varName} - 缺失`);
    }
  });
  
  // 检查Timeline v2.0配置说明
  const hasTimelineConfig = envContent.includes('Timeline解析架构v2.0配置');
  console.log(`📋 Timeline v2.0配置说明: ${hasTimelineConfig ? '✅' : '❌'}`);
  
  return allRequiredPresent && hasTimelineConfig;
}

// 生成验证报告
function generateVerificationReport(results) {
  const report = {
    version: VERSION,
    tagName: TAG_NAME,
    verificationDate: new Date().toISOString(),
    results: results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(Boolean).length,
      failed: Object.values(results).filter(r => !r).length
    },
    overallStatus: Object.values(results).every(Boolean) ? 'PASSED' : 'FAILED'
  };
  
  fs.writeFileSync('VERIFICATION_REPORT.json', JSON.stringify(report, null, 2));
  console.log('\n📊 验证报告已生成: VERIFICATION_REPORT.json');
  
  return report;
}

// 主执行函数
async function main() {
  try {
    console.log(`开始验证v${VERSION}发布...\n`);
    
    const results = {};
    
    // 1. 验证GitHub Release
    results.githubRelease = verifyGitHubRelease();
    
    // 2. 验证克隆和安装
    results.cloneAndInstall = verifyCloneAndInstall();
    
    // 3. 验证文档链接
    results.documentationLinks = verifyDocumentationLinks();
    
    // 4. 验证Timeline v2.0特性
    results.timelineV2Features = verifyTimelineV2Features();
    
    // 5. 验证环境变量配置
    results.environmentConfig = verifyEnvironmentConfig();
    
    // 6. 生成验证报告
    const report = generateVerificationReport(results);
    
    console.log('\n📊 发布验证结果');
    console.log('=====================================');
    console.log(`总计检查: ${report.summary.total}`);
    console.log(`通过检查: ${report.summary.passed}`);
    console.log(`失败检查: ${report.summary.failed}`);
    console.log(`整体状态: ${report.overallStatus}`);
    
    if (report.overallStatus === 'PASSED') {
      console.log('\n🎉 发布验证通过！');
      console.log('✅ GitHub Release正常');
      console.log('✅ 代码可以正常克隆和安装');
      console.log('✅ 文档链接有效');
      console.log('✅ Timeline解析架构v2.0特性完整');
      console.log('✅ 环境变量配置正确');
      
      console.log('\n🚀 发布已就绪，可以公开发布！');
    } else {
      console.log('\n❌ 发布验证失败');
      console.log('请修复以下问题:');
      Object.entries(results).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`- ${check}`);
        }
      });
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 发布验证失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  verifyGitHubRelease,
  verifyCloneAndInstall,
  verifyTimelineV2Features,
  generateVerificationReport
};
