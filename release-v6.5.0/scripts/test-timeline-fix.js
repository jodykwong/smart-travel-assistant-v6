#!/usr/bin/env node

/**
 * Timeline解析架构v2.0修复验证脚本
 * 验证前端组件是否正确使用legacyFormat数据
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Timeline解析架构v2.0修复验证');
console.log('=====================================');

// 验证文件修改
const filesToCheck = [
  {
    path: 'src/components/travel-plan/DailyItinerarySection.tsx',
    checks: [
      { pattern: /legacyFormat\?\: any\[\]/, description: '添加legacyFormat接口' },
      { pattern: /convertLegacyFormatToItineraries/, description: '添加legacyFormat转换函数' },
      { pattern: /if \(legacyFormat && Array\.isArray/, description: '优先使用legacyFormat数据' }
    ]
  },
  {
    path: 'src/components/travel-plan/TravelPlanDisplay.tsx',
    checks: [
      { pattern: /legacyFormat\?\: any\[\]/, description: '添加legacyFormat接口' },
      { pattern: /legacyFormat={legacyFormat}/, description: '传递legacyFormat数据' }
    ]
  },
  {
    path: 'src/pages/planning/result.tsx',
    checks: [
      { pattern: /legacyFormat: result\.data\.legacyFormat/, description: '从API获取legacyFormat' },
      { pattern: /sessionResult\.legacyFormat/, description: '从sessionResult获取legacyFormat' }
    ]
  }
];

let allChecksPass = true;

filesToCheck.forEach(file => {
  console.log(`\n📁 检查文件: ${file.path}`);
  
  const filePath = path.join(process.cwd(), file.path);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${file.path}`);
    allChecksPass = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  file.checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description}`);
      allChecksPass = false;
    }
  });
});

// 验证API响应结构
console.log('\n🔗 API响应结构验证');
const apiFile = 'src/pages/api/v1/planning/sessions/[sessionId]/index.ts';
const apiPath = path.join(process.cwd(), apiFile);

if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  const apiChecks = [
    { pattern: /legacyFormat: parsed\.legacyFormat/, description: 'API返回legacyFormat字段' },
    { pattern: /parseSuccess: parsed\.parseSuccess/, description: 'API返回parseSuccess字段' },
    { pattern: /timelineVersion: '2\.0\.0'/, description: 'API返回timelineVersion字段' }
  ];
  
  apiChecks.forEach(check => {
    if (check.pattern.test(apiContent)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description}`);
      allChecksPass = false;
    }
  });
} else {
  console.log(`❌ API文件不存在: ${apiFile}`);
  allChecksPass = false;
}

// 总结
console.log('\n📊 验证结果');
console.log('=====================================');
if (allChecksPass) {
  console.log('✅ 所有检查通过！Timeline解析架构v2.0修复完成');
  console.log('\n🎯 预期效果:');
  console.log('- 前端组件优先使用服务端解析的legacyFormat数据');
  console.log('- 解决活动显示为原始文本片段的问题');
  console.log('- 提高Timeline数据展示的一致性和可靠性');
  console.log('\n🚀 下一步:');
  console.log('1. 重启开发服务器');
  console.log('2. 测试现有会话的Timeline显示');
  console.log('3. 验证新会话的Timeline解析效果');
} else {
  console.log('❌ 部分检查失败，请检查修改是否正确');
  process.exit(1);
}
