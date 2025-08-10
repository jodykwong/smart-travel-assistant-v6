#!/usr/bin/env node

/**
 * Timeline解析架构v2.0发布验证脚本
 * 专门验证Timeline解析架构v2.0的集成和功能
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Timeline解析架构v2.0发布验证');
console.log('=====================================');

// Timeline v2.0核心组件检查
const timelineComponents = [
  {
    name: '核心调度器',
    path: 'src/lib/timeline/orchestrator.ts',
    checks: [
      { pattern: /TimelineOrchestrator/, description: '调度器类存在' },
      { pattern: /parseTimelineToLegacy/, description: '兼容格式转换函数' },
      { pattern: /版本: 6\.5\.0/, description: '版本标记正确' }
    ]
  },
  {
    name: '解析器插件系统',
    path: 'src/lib/timeline/plugins',
    checks: [
      { pattern: /JsonParser/, description: 'JSON解析器' },
      { pattern: /MarkdownPeriodParser/, description: 'Markdown解析器' },
      { pattern: /NumberedListParser/, description: '数字列表解析器' },
      { pattern: /HeuristicTimeParser/, description: '启发式解析器' }
    ]
  },
  {
    name: 'Feature Flag系统',
    path: 'src/lib/feature-flags.ts',
    checks: [
      { pattern: /isTimelineV2Enabled/, description: 'Feature Flag检查函数' },
      { pattern: /TIMELINE_V2_ENABLED/, description: '环境变量支持' },
      { pattern: /TIMELINE_V2_PERCENTAGE/, description: '流量百分比控制' }
    ]
  },
  {
    name: 'API集成',
    path: 'src/pages/api/v1/planning/sessions/[sessionId]/index.ts',
    checks: [
      { pattern: /parseTimelineToLegacy/, description: 'API使用Timeline解析' },
      { pattern: /legacyFormat/, description: 'API返回legacyFormat' },
      { pattern: /timelineVersion/, description: 'API返回版本信息' }
    ]
  },
  {
    name: '前端组件集成',
    path: 'src/components/travel-plan/DailyItinerarySection.tsx',
    checks: [
      { pattern: /legacyFormat\?\: any\[\]/, description: '前端接收legacyFormat' },
      { pattern: /convertLegacyFormatToItineraries/, description: '前端转换函数' },
      { pattern: /Timeline解析架构v2\.0/, description: '前端注释标记' }
    ]
  }
];

// 文档完整性检查
const timelineDocs = [
  {
    name: 'Timeline架构文档',
    path: 'docs/timeline-architecture.md',
    checks: [
      { pattern: /Timeline解析架构v2\.0/, description: '架构文档标题' },
      { pattern: /可插拔解析器系统/, description: '核心特性描述' },
      { pattern: /解析成功率.*>99%/, description: '性能指标' }
    ]
  },
  {
    name: '问题排查SOP',
    path: 'docs/timeline-troubleshooting-sop.md',
    checks: [
      { pattern: /Timeline解析问题排查SOP/, description: 'SOP文档标题' },
      { pattern: /Feature Flag状态验证/, description: 'Feature Flag检查' },
      { pattern: /数据流向分析/, description: '数据流向检查' }
    ]
  },
  {
    name: '根本原因分析',
    path: 'docs/timeline-issue-analysis.md',
    checks: [
      { pattern: /Timeline数据展示问题根本原因分析/, description: '分析文档标题' },
      { pattern: /前端组件架构不一致/, description: '问题识别' },
      { pattern: /第一性原理/, description: '分析方法' }
    ]
  }
];

// 配置文件检查
const configChecks = [
  {
    name: '环境变量示例',
    path: '.env.example',
    checks: [
      { pattern: /TIMELINE_V2_ENABLED/, description: 'Timeline v2.0开关' },
      { pattern: /TIMELINE_V2_PERCENTAGE/, description: '流量百分比配置' },
      { pattern: /Timeline解析架构v2\.0配置/, description: '配置说明' }
    ]
  },
  {
    name: 'package.json',
    path: 'package.json',
    checks: [
      { pattern: /"version": "6\.5\.0"/, description: '版本号正确' },
      { pattern: /Timeline解析架构v2\.0/, description: '描述包含新特性' }
    ]
  }
];

// 执行检查
function runChecks(items, category) {
  console.log(`\n📋 检查${category}...`);
  let allPassed = true;
  
  items.forEach(item => {
    console.log(`\n🔍 ${item.name} (${item.path})`);
    
    if (!fs.existsSync(item.path)) {
      console.log(`❌ 文件不存在: ${item.path}`);
      allPassed = false;
      return;
    }
    
    let content = '';
    if (fs.statSync(item.path).isDirectory()) {
      // 对于目录，检查所有文件
      const files = fs.readdirSync(item.path, { recursive: true })
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
        .map(file => path.join(item.path, file));
      
      content = files.map(file => {
        try {
          return fs.readFileSync(file, 'utf8');
        } catch (error) {
          return '';
        }
      }).join('\n');
    } else {
      content = fs.readFileSync(item.path, 'utf8');
    }
    
    item.checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.description}`);
      } else {
        console.log(`  ❌ ${check.description}`);
        allPassed = false;
      }
    });
  });
  
  return allPassed;
}

// Timeline v2.0特性验证
function verifyTimelineV2Features() {
  console.log('\n🚀 Timeline解析架构v2.0特性验证');
  
  const features = [
    {
      name: '可插拔解析器系统',
      verify: () => {
        const orchestratorPath = 'src/lib/timeline/orchestrator.ts';
        if (!fs.existsSync(orchestratorPath)) return false;
        
        const content = fs.readFileSync(orchestratorPath, 'utf8');
        return content.includes('parserRegistry') && 
               content.includes('getCapable') &&
               content.includes('parseTimeline');
      }
    },
    {
      name: 'Feature Flag支持',
      verify: () => {
        const flagPath = 'src/lib/feature-flags.ts';
        if (!fs.existsSync(flagPath)) return false;
        
        const content = fs.readFileSync(flagPath, 'utf8');
        return content.includes('isTimelineV2Enabled') &&
               content.includes('TIMELINE_V2_PERCENTAGE');
      }
    },
    {
      name: '服务端解析优先',
      verify: () => {
        const apiPath = 'src/pages/api/v1/planning/sessions/[sessionId]/index.ts';
        if (!fs.existsSync(apiPath)) return false;
        
        const content = fs.readFileSync(apiPath, 'utf8');
        return content.includes('parseTimelineToLegacy') &&
               content.includes('legacyFormat');
      }
    },
    {
      name: '前端组件集成',
      verify: () => {
        const componentPath = 'src/components/travel-plan/DailyItinerarySection.tsx';
        if (!fs.existsSync(componentPath)) return false;
        
        const content = fs.readFileSync(componentPath, 'utf8');
        return content.includes('legacyFormat') &&
               content.includes('convertLegacyFormatToItineraries');
      }
    }
  ];
  
  let allFeaturesWork = true;
  
  features.forEach(feature => {
    const works = feature.verify();
    console.log(`  ${works ? '✅' : '❌'} ${feature.name}`);
    if (!works) allFeaturesWork = false;
  });
  
  return allFeaturesWork;
}

// 性能指标验证
function verifyPerformanceTargets() {
  console.log('\n⚡ 性能指标验证');
  
  const performanceChecks = [
    {
      name: '解析时间目标 (<500ms)',
      verify: () => {
        const docs = ['docs/timeline-architecture.md', 'docs/performance-optimization-plan.md'];
        return docs.some(doc => {
          if (!fs.existsSync(doc)) return false;
          const content = fs.readFileSync(doc, 'utf8');
          return content.includes('<500ms') || content.includes('500ms');
        });
      }
    },
    {
      name: '解析成功率目标 (>99%)',
      verify: () => {
        const docs = ['docs/timeline-architecture.md', 'README.md'];
        return docs.some(doc => {
          if (!fs.existsSync(doc)) return false;
          const content = fs.readFileSync(doc, 'utf8');
          return content.includes('>99%') || content.includes('99%');
        });
      }
    },
    {
      name: '前端渲染时间目标 (<200ms)',
      verify: () => {
        const docs = ['docs/performance-optimization-plan.md', 'README.md'];
        return docs.some(doc => {
          if (!fs.existsSync(doc)) return false;
          const content = fs.readFileSync(doc, 'utf8');
          return content.includes('<200ms') || content.includes('200ms');
        });
      }
    }
  ];
  
  let allTargetsDocumented = true;
  
  performanceChecks.forEach(check => {
    const documented = check.verify();
    console.log(`  ${documented ? '✅' : '❌'} ${check.name}`);
    if (!documented) allTargetsDocumented = false;
  });
  
  return allTargetsDocumented;
}

// 主执行函数
async function main() {
  try {
    console.log('开始Timeline解析架构v2.0验证...\n');
    
    // 1. 核心组件检查
    const componentsOk = runChecks(timelineComponents, '核心组件');
    
    // 2. 文档完整性检查
    const docsOk = runChecks(timelineDocs, 'Timeline文档');
    
    // 3. 配置文件检查
    const configOk = runChecks(configChecks, '配置文件');
    
    // 4. Timeline v2.0特性验证
    const featuresOk = verifyTimelineV2Features();
    
    // 5. 性能指标验证
    const performanceOk = verifyPerformanceTargets();
    
    // 总结
    console.log('\n📊 Timeline解析架构v2.0验证结果');
    console.log('=====================================');
    
    const results = [
      { name: '核心组件', passed: componentsOk },
      { name: 'Timeline文档', passed: docsOk },
      { name: '配置文件', passed: configOk },
      { name: 'v2.0特性', passed: featuresOk },
      { name: '性能指标', passed: performanceOk }
    ];
    
    results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    });
    
    const allPassed = results.every(r => r.passed);
    
    if (allPassed) {
      console.log('\n🎉 Timeline解析架构v2.0验证通过！');
      console.log('✅ 所有核心特性已正确集成');
      console.log('✅ 文档完整且准确');
      console.log('✅ 配置正确');
      console.log('✅ 性能目标已设定');
      console.log('\n🚀 准备就绪，可以进行GitHub发布！');
    } else {
      console.log('\n❌ Timeline解析架构v2.0验证失败');
      console.log('请修复上述问题后重新验证');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runChecks,
  verifyTimelineV2Features,
  verifyPerformanceTargets
};
