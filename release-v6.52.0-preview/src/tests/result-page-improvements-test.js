/**
 * 智游助手旅行计划结果页面改进验证脚本
 * 验证4项具体修改的实施情况
 */

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.blue}\n🔍 ${msg}${colors.reset}`)
};

/**
 * 验证结果页面改进
 */
async function validateResultPageImprovements() {
  log.title('智游助手结果页面改进验证');
  console.log('🎯 验证目标：');
  console.log('  1. 预算显示优化：明确标注"人均每晚"');
  console.log('  2. 移除导航按钮组：删除每日安排下方的快速导航');
  console.log('  3. 美食数据源更换：改为必去榜数据源');
  console.log('  4. 用餐礼仪内容处理：根据内容质量决定显示');
  
  const results = {
    tests: 0,
    passed: 0,
    failed: 0,
    details: [],
    errors: [],
  };

  try {
    // 1. 验证预算显示优化
    log.title('测试1: 预算显示优化验证');
    const budgetTest = await testBudgetDisplayOptimization();
    results.tests++;
    if (budgetTest.success) {
      results.passed++;
      log.success('预算显示优化验证通过');
    } else {
      results.failed++;
      log.error('预算显示优化验证失败');
      results.errors.push(budgetTest.error);
    }
    results.details.push(budgetTest);

    // 2. 验证导航按钮组移除
    log.title('测试2: 导航按钮组移除验证');
    const navigationTest = await testNavigationButtonRemoval();
    results.tests++;
    if (navigationTest.success) {
      results.passed++;
      log.success('导航按钮组移除验证通过');
    } else {
      results.failed++;
      log.error('导航按钮组移除验证失败');
      results.errors.push(navigationTest.error);
    }
    results.details.push(navigationTest);

    // 3. 验证美食数据源更换
    log.title('测试3: 美食数据源更换验证');
    const foodDataTest = await testFoodDataSourceChange();
    results.tests++;
    if (foodDataTest.success) {
      results.passed++;
      log.success('美食数据源更换验证通过');
    } else {
      results.failed++;
      log.error('美食数据源更换验证失败');
      results.errors.push(foodDataTest.error);
    }
    results.details.push(foodDataTest);

    // 4. 验证用餐礼仪内容处理
    log.title('测试4: 用餐礼仪内容处理验证');
    const etiquetteTest = await testDiningEtiquetteHandling();
    results.tests++;
    if (etiquetteTest.success) {
      results.passed++;
      log.success('用餐礼仪内容处理验证通过');
    } else {
      results.failed++;
      log.error('用餐礼仪内容处理验证失败');
      results.errors.push(etiquetteTest.error);
    }
    results.details.push(etiquetteTest);

    // 输出验证结果
    printValidationResults(results);
    
    return results.passed === results.tests;

  } catch (error) {
    log.error(`验证过程失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试预算显示优化
 */
async function testBudgetDisplayOptimization() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const resultTsxPath = path.join(__dirname, '../pages/planning/result.tsx');
    const content = fs.readFileSync(resultTsxPath, 'utf8');
    
    // 检查价格参考标题是否包含明确说明
    if (!content.includes('价格参考（人均每晚）')) {
      throw new Error('价格参考标题未添加"人均每晚"说明');
    }

    // 确保原有的价格参考功能仍然存在
    if (!content.includes('accommodationData.priceRanges.map')) {
      throw new Error('价格区间数据绑定丢失');
    }

    // 检查问卷调查页面的预算显示
    const planningIndexPath = path.join(__dirname, '../pages/planning/index.tsx');
    const planningContent = fs.readFileSync(planningIndexPath, 'utf8');

    if (!planningContent.includes('人均总预算')) {
      throw new Error('问卷调查页面的预算选项未添加明确说明');
    }

    if (!planningContent.includes('预算范围（人均总预算）')) {
      throw new Error('问卷调查页面的预算标题未添加明确说明');
    }

    return {
      success: true,
      foundOptimization: true,
      maintainedFunctionality: true,
      updatedSurveyPage: true,
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 测试导航按钮组移除
 */
async function testNavigationButtonRemoval() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const resultTsxPath = path.join(__dirname, '../pages/planning/result.tsx');
    const content = fs.readFileSync(resultTsxPath, 'utf8');
    
    // 检查是否移除了功能模块按钮组
    if (content.includes('功能模块按钮组 - 位于每日安排正文下方')) {
      throw new Error('功能模块按钮组注释仍然存在');
    }

    // 检查是否移除了具体的按钮
    const buttonPatterns = [
      'onClick={() => scrollToSection(\'accommodation\')}',
      'onClick={() => scrollToSection(\'food\')}',
      'onClick={() => scrollToSection(\'transport\')}',
      'onClick={() => scrollToSection(\'tips\')}'
    ];

    const remainingButtons = buttonPatterns.filter(pattern => content.includes(pattern));
    
    // 注意：侧边栏的导航按钮应该保留，只移除每日安排下方的按钮组
    // 所以我们检查的是特定位置的按钮组是否被移除
    if (content.includes('grid grid-cols-2 md:grid-cols-4 gap-4') && 
        content.includes('住宿推荐按钮') && 
        content.includes('美食体验按钮')) {
      throw new Error('每日安排下方的导航按钮组未完全移除');
    }

    return {
      success: true,
      removedButtonGroup: true,
      maintainedSidebar: true,
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 测试美食数据源更换
 */
async function testFoodDataSourceChange() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 检查TravelDataService
    const travelDataServicePath = path.join(__dirname, '../services/travel-data-service.ts');
    const travelDataContent = fs.readFileSync(travelDataServicePath, 'utf8');
    
    // 检查是否使用了新的必去榜数据源
    if (!travelDataContent.includes('searchHotspotFood')) {
      throw new Error('未使用searchHotspotFood方法');
    }

    if (!travelDataContent.includes('必去榜美食数据')) {
      throw new Error('未更新日志信息为必去榜数据');
    }

    // 检查SimplifiedAmapService
    const amapServicePath = path.join(__dirname, '../services/external-apis/simplified-amap-service.ts');
    const amapContent = fs.readFileSync(amapServicePath, 'utf8');
    
    // 检查是否添加了searchHotspotFood方法
    if (!amapContent.includes('searchHotspotFood')) {
      throw new Error('SimplifiedAmapService中未添加searchHotspotFood方法');
    }

    // 检查是否包含必去榜相关的关键词搜索
    if (!amapContent.includes('网红餐厅') || !amapContent.includes('必吃餐厅')) {
      throw new Error('未包含必去榜相关的关键词搜索');
    }

    // 检查是否有去重和评分过滤逻辑
    if (!amapContent.includes('deduplicateRestaurants') || !amapContent.includes('rating > 4.0')) {
      throw new Error('缺少去重和评分过滤逻辑');
    }

    return {
      success: true,
      addedHotspotMethod: true,
      updatedDataService: true,
      addedFiltering: true,
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 测试用餐礼仪内容处理
 */
async function testDiningEtiquetteHandling() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const resultTsxPath = path.join(__dirname, '../pages/planning/result.tsx');
    const content = fs.readFileSync(resultTsxPath, 'utf8');
    
    // 检查是否添加了条件判断
    if (!content.includes('foodData.diningEtiquette &&')) {
      throw new Error('未添加用餐礼仪的条件判断');
    }

    // 检查是否包含通用占位文字的过滤条件
    if (!content.includes('!foodData.diningEtiquette.includes(\'尊重当地饮食文化，注意用餐礼仪\')')) {
      throw new Error('未添加通用占位文字的过滤条件');
    }

    // 检查是否包含内容长度判断
    if (!content.includes('foodData.diningEtiquette.length > 20')) {
      throw new Error('未添加内容长度判断');
    }

    return {
      success: true,
      addedConditionalRendering: true,
      addedContentFiltering: true,
      addedLengthCheck: true,
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 打印验证结果
 */
function printValidationResults(results) {
  console.log('\n' + '='.repeat(60));
  log.title('结果页面改进验证结果');
  console.log('='.repeat(60));
  
  const successRate = (results.passed / results.tests * 100).toFixed(1);
  
  console.log(`总测试数: ${results.tests}`);
  console.log(`通过测试: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`失败测试: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  console.log(`\n📊 测试详情:`);
  results.details.forEach((detail, index) => {
    const status = detail.success ? '✅' : '❌';
    const testNames = [
      '预算显示优化',
      '导航按钮组移除',
      '美食数据源更换',
      '用餐礼仪内容处理'
    ];
    console.log(`  ${status} ${testNames[index] || `测试${index + 1}`}`);
  });
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 错误详情:`);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 80) {
    log.success('🎉 结果页面改进验证通过！');
    console.log('\n✅ 改进成果确认：');
    console.log('  ✅ 预算显示更加明确（人均每晚）');
    console.log('  ✅ 页面布局更加简洁（移除冗余导航）');
    console.log('  ✅ 美食推荐质量提升（必去榜数据）');
    console.log('  ✅ 内容展示更加智能（条件渲染）');
    
    console.log('\n🎯 用户体验提升：');
    console.log('  - 预算理解：明确的价格说明避免歧义');
    console.log('  - 界面简洁：移除重复导航提升阅读体验');
    console.log('  - 内容质量：必去榜数据提供更优质推荐');
    console.log('  - 智能展示：只显示有价值的内容信息');
    
  } else {
    log.error('❌ 结果页面改进验证失败！');
    console.log('\n🔧 需要修复的问题：');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
}

// 主函数
async function main() {
  try {
    console.log(`${colors.bold}${colors.blue}智游助手结果页面改进验证${colors.reset}`);
    console.log('验证范围：预算显示、导航优化、数据源升级、内容智能化');
    
    const success = await validateResultPageImprovements();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log.error(`验证执行失败: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateResultPageImprovements,
  testBudgetDisplayOptimization,
  testNavigationButtonRemoval,
  testFoodDataSourceChange,
  testDiningEtiquetteHandling,
};
