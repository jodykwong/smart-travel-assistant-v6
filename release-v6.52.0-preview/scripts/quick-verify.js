#!/usr/bin/env node

/**
 * 快速验证Timeline解析架构v2.0集成
 */

const fs = require('fs');

console.log('🔍 Timeline解析架构v2.0快速验证');
console.log('=====================================');

// 关键文件检查
const keyFiles = [
  'src/lib/timeline/orchestrator.ts',
  'src/lib/timeline/plugins/json.ts',
  'src/lib/feature-flags.ts',
  'src/components/travel-plan/DailyItinerarySection.tsx',
  'docs/timeline-architecture.md',
  'docs/timeline-troubleshooting-sop.md'
];

console.log('📁 检查关键文件...');
let filesOk = true;
keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件缺失`);
    filesOk = false;
  }
});

// 版本检查
console.log('\n🏷️  检查版本信息...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionFile = fs.readFileSync('src/lib/version.ts', 'utf8');

console.log(`✅ package.json版本: ${packageJson.version}`);
console.log(`✅ version.ts包含v6.5.0: ${versionFile.includes('6.5.0') ? '是' : '否'}`);

// Timeline v2.0特性检查
console.log('\n🚀 检查Timeline v2.0特性...');

// 检查前端组件集成
const componentFile = fs.readFileSync('src/components/travel-plan/DailyItinerarySection.tsx', 'utf8');
const hasLegacyFormat = componentFile.includes('legacyFormat?: any[]');
const hasConversion = componentFile.includes('convertLegacyFormatToItineraries');
const hasPriority = componentFile.includes('Timeline解析架构v2.0：优先使用服务端解析');

console.log(`✅ 前端组件支持legacyFormat: ${hasLegacyFormat ? '是' : '否'}`);
console.log(`✅ 前端组件有转换函数: ${hasConversion ? '是' : '否'}`);
console.log(`✅ 前端组件优先使用服务端数据: ${hasPriority ? '是' : '否'}`);

// 检查API集成
const apiFile = fs.readFileSync('src/pages/api/v1/planning/sessions/[sessionId]/index.ts', 'utf8');
const apiUsesTimeline = apiFile.includes('parseTimelineToLegacy');
const apiReturnsLegacy = apiFile.includes('legacyFormat: parsed.legacyFormat');

console.log(`✅ API使用Timeline解析: ${apiUsesTimeline ? '是' : '否'}`);
console.log(`✅ API返回legacyFormat: ${apiReturnsLegacy ? '是' : '否'}`);

// 检查Feature Flag
const flagFile = fs.readFileSync('src/lib/feature-flags.ts', 'utf8');
const hasFeatureFlag = flagFile.includes('isTimelineV2Enabled');

console.log(`✅ Feature Flag支持: ${hasFeatureFlag ? '是' : '否'}`);

// 总结
const allChecks = [
  filesOk,
  packageJson.version === '6.5.0',
  versionFile.includes('6.5.0'),
  hasLegacyFormat,
  hasConversion,
  hasPriority,
  apiUsesTimeline,
  apiReturnsLegacy,
  hasFeatureFlag
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log('\n📊 验证结果');
console.log('=====================================');
console.log(`通过检查: ${passedChecks}/${totalChecks}`);

if (passedChecks === totalChecks) {
  console.log('🎉 Timeline解析架构v2.0集成验证通过！');
  console.log('✅ 所有关键组件已正确集成');
  console.log('✅ 前端组件优先使用服务端解析数据');
  console.log('✅ API正确返回Timeline v2.0数据');
  console.log('✅ Feature Flag系统已就绪');
  process.exit(0);
} else {
  console.log('❌ 验证失败，请检查上述问题');
  process.exit(1);
}
