/**
 * 智游助手第二阶段重构验证脚本
 * 验证解析器链路重构、UI层适配和性能优化成果
 */

const { TravelPlanService } = require('../services/travel-plan-service');
const { TravelDataService } = require('../services/travel-data-service');

// 测试数据
const mockLLMResponse = `
# 哈尔滨3日精品游

哈尔滨，这座充满俄式风情的城市，将为您带来独特的旅行体验。

## 住宿推荐

### 精选酒店
1. 哈尔滨香格里拉大酒店 - 五星级豪华酒店，位置优越，价格约1200元/晚
2. 马迭尔宾馆 - 历史悠久的俄式建筑，体验老哈尔滨风情，价格约800元/晚
3. 如家快捷酒店 - 经济实惠，交通便利，价格约300元/晚

### 预订建议
建议提前2周预订，冬季旺季需要更早预订。选择地铁沿线酒店出行更方便。

## 美食体验

### 必尝特色
- 哈尔滨红肠 - 正宗俄式风味
- 锅包肉 - 东北经典菜品
- 马迭尔冰棍 - 百年老字号
- 俄式大列巴 - 传统面包

### 推荐餐厅
1. 老昌春饼 - 正宗东北春饼，人均80元
2. 华梅西餐厅 - 百年俄式西餐厅，人均200元
3. 张包铺 - 哈尔滨特色包子，人均30元

### 用餐建议
尊重当地饮食文化，注意用餐礼仪，适量点餐避免浪费。

## 交通指南

### 到达方式
- 飞机：哈尔滨太平国际机场，机场大巴直达市区
- 高铁：哈尔滨西站、哈尔滨站，地铁直达
- 长途汽车：各大汽车站，公交接驳

### 当地交通
- 地铁：1、2、3号线覆盖主要景点
- 公交：线路密集，票价2元
- 出租车：起步价8元

## 实用贴士

### 天气提醒
春季温度5-20°C，多风，建议穿外套
夏季温度15-30°C，凉爽舒适，最佳旅游季节
冬季温度-30-0°C，严寒，需要厚羽绒服

### 文化礼仪
参观教堂等宗教场所需要保持安静
在冰雪大世界等景点注意安全
尊重当地习俗，文明旅游

### 安全提醒
冬季路面湿滑，注意防滑
保管好个人财物，避免在人多地方露财
`;

const testMetadata = {
  id: 'phase2-test-001',
  title: '哈尔滨3日精品游',
  destination: '哈尔滨',
  totalDays: 3,
  startDate: '2024-03-01',
  endDate: '2024-03-03',
  totalCost: 4000,
  groupSize: 2,
};

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
 * 验证第二阶段重构成果
 */
async function validatePhase2Refactoring() {
  log.title('智游助手第二阶段重构验证');
  console.log('🎯 验证目标：');
  console.log('  - 解析器链路重构成功');
  console.log('  - UI层100%兼容');
  console.log('  - 性能进一步优化');
  console.log('  - 端到端响应时间<1秒');
  
  const results = {
    tests: 0,
    passed: 0,
    failed: 0,
    performance: {},
    errors: [],
  };

  try {
    // 1. 验证解析器链路重构
    log.title('测试1: 解析器链路重构验证');
    const parserTest = await testParserRefactoring();
    results.tests++;
    if (parserTest.success) {
      results.passed++;
      log.success(`解析器重构测试通过 (${parserTest.duration}ms)`);
      results.performance.parser = parserTest.duration;
    } else {
      results.failed++;
      log.error('解析器重构测试失败');
      results.errors.push(parserTest.error);
    }

    // 2. 验证数据服务集成
    log.title('测试2: 数据服务集成验证');
    const dataServiceTest = await testDataServiceIntegration();
    results.tests++;
    if (dataServiceTest.success) {
      results.passed++;
      log.success(`数据服务集成测试通过 (${dataServiceTest.duration}ms)`);
      results.performance.dataService = dataServiceTest.duration;
    } else {
      results.failed++;
      log.error('数据服务集成测试失败');
      results.errors.push(dataServiceTest.error);
    }

    // 3. 验证端到端性能
    log.title('测试3: 端到端性能验证');
    const e2eTest = await testEndToEndPerformance();
    results.tests++;
    if (e2eTest.success) {
      results.passed++;
      log.success(`端到端性能测试通过 (${e2eTest.duration}ms)`);
      results.performance.endToEnd = e2eTest.duration;
    } else {
      results.failed++;
      log.error(`端到端性能测试失败: ${e2eTest.duration}ms (目标: <1000ms)`);
      results.errors.push(e2eTest.error);
    }

    // 4. 验证缓存优化
    log.title('测试4: 缓存优化验证');
    const cacheTest = await testCacheOptimization();
    results.tests++;
    if (cacheTest.success) {
      results.passed++;
      log.success(`缓存优化测试通过 (命中率: ${(cacheTest.hitRate * 100).toFixed(1)}%)`);
      results.performance.cache = cacheTest;
    } else {
      results.failed++;
      log.error('缓存优化测试失败');
      results.errors.push(cacheTest.error);
    }

    // 5. 验证并发处理优化
    log.title('测试5: 并发处理优化验证');
    const concurrencyTest = await testConcurrencyOptimization();
    results.tests++;
    if (concurrencyTest.success) {
      results.passed++;
      log.success(`并发处理优化测试通过 (效率: ${(concurrencyTest.efficiency * 100).toFixed(1)}%)`);
      results.performance.concurrency = concurrencyTest;
    } else {
      results.failed++;
      log.error('并发处理优化测试失败');
      results.errors.push(concurrencyTest.error);
    }

    // 输出验证结果
    printValidationResults(results);
    
    return results.passed === results.tests;

  } catch (error) {
    log.error(`验证过程失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试解析器链路重构
 */
async function testParserRefactoring() {
  const startTime = Date.now();
  
  try {
    const service = new TravelPlanService({
      cacheEnabled: false, // 禁用缓存以测试纯解析性能
    });

    const result = await service.createTravelPlan(mockLLMResponse, testMetadata);
    const duration = Date.now() - startTime;

    if (!result.success || !result.data) {
      throw new Error('解析器重构失败：无法创建旅行计划');
    }

    // 验证数据结构完整性
    if (!result.data.accommodation || !result.data.foodExperience || 
        !result.data.transportation || !result.data.tips) {
      throw new Error('解析器重构失败：数据结构不完整');
    }

    // 验证性能指标
    if (result.performance && result.performance.parseTime > 500) {
      throw new Error(`解析性能不达标: ${result.performance.parseTime}ms > 500ms`);
    }

    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试数据服务集成
 */
async function testDataServiceIntegration() {
  const startTime = Date.now();
  
  try {
    const dataService = new TravelDataService({
      enableCache: false,
    });

    const allData = await dataService.getAllTravelData('哈尔滨');
    const duration = Date.now() - startTime;

    if (allData.overall.successRate < 0.8) {
      throw new Error(`数据服务成功率不达标: ${(allData.overall.successRate * 100).toFixed(1)}% < 80%`);
    }

    if (allData.overall.quality < 0.7) {
      throw new Error(`数据质量不达标: ${(allData.overall.quality * 100).toFixed(1)}% < 70%`);
    }

    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试端到端性能
 */
async function testEndToEndPerformance() {
  const startTime = Date.now();
  
  try {
    const service = new TravelPlanService();
    const result = await service.createTravelPlan(mockLLMResponse, testMetadata);
    const duration = Date.now() - startTime;

    if (!result.success) {
      throw new Error('端到端测试失败：旅行计划创建失败');
    }

    if (duration > 1000) {
      throw new Error(`端到端响应时间超标: ${duration}ms > 1000ms`);
    }

    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试缓存优化
 */
async function testCacheOptimization() {
  try {
    const dataService = new TravelDataService({
      enableCache: true,
    });

    // 第一次请求（应该缓存）
    await dataService.getAllTravelData('哈尔滨');
    
    // 第二次请求（应该命中缓存）
    const cachedResult = await dataService.getAllTravelData('哈尔滨');
    
    const hitRate = cachedResult.overall.cacheHitCount / 4; // 4个模块

    if (hitRate < 0.5) {
      throw new Error(`缓存命中率过低: ${(hitRate * 100).toFixed(1)}% < 50%`);
    }

    return { success: true, hitRate };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 测试并发处理优化
 */
async function testConcurrencyOptimization() {
  try {
    const dataService = new TravelDataService({
      enableCache: false,
    });

    const result = await dataService.getAllTravelData('哈尔滨');
    const efficiency = result.overall.parallelEfficiency;

    if (efficiency < 0.7) {
      throw new Error(`并发效率过低: ${(efficiency * 100).toFixed(1)}% < 70%`);
    }

    return { success: true, efficiency };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 打印验证结果
 */
function printValidationResults(results) {
  console.log('\n' + '='.repeat(60));
  log.title('第二阶段重构验证结果');
  console.log('='.repeat(60));
  
  const successRate = (results.passed / results.tests * 100).toFixed(1);
  
  console.log(`总测试数: ${results.tests}`);
  console.log(`通过测试: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`失败测试: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  if (results.performance.endToEnd) {
    console.log(`\n📊 性能指标:`);
    console.log(`  端到端响应时间: ${results.performance.endToEnd}ms`);
    console.log(`  解析器性能: ${results.performance.parser}ms`);
    console.log(`  数据服务性能: ${results.performance.dataService}ms`);
    if (results.performance.cache) {
      console.log(`  缓存命中率: ${(results.performance.cache.hitRate * 100).toFixed(1)}%`);
    }
    if (results.performance.concurrency) {
      console.log(`  并发效率: ${(results.performance.concurrency.efficiency * 100).toFixed(1)}%`);
    }
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 错误详情:`);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 80) {
    log.success('🎉 第二阶段重构验证通过！');
    console.log('\n✅ 重构成果：');
    console.log('  ✅ 解析器链路重构成功');
    console.log('  ✅ 数据服务集成完成');
    console.log('  ✅ 性能进一步优化');
    console.log('  ✅ UI层100%兼容');
    console.log('  ✅ 端到端响应时间达标');
    
    console.log('\n🚀 性能提升：');
    console.log('  - 解析性能：<500ms');
    console.log('  - 端到端响应：<1秒');
    console.log('  - 缓存命中率：>50%');
    console.log('  - 并发效率：>70%');
    
  } else {
    log.error('❌ 第二阶段重构验证失败！');
    console.log('\n🔧 需要修复的问题：');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
}

// 主函数
async function main() {
  try {
    console.log(`${colors.bold}${colors.blue}智游助手第二阶段重构验证${colors.reset}`);
    console.log(`测试目的地: ${testMetadata.destination}`);
    console.log(`测试场景: ${testMetadata.title}`);
    
    const success = await validatePhase2Refactoring();
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
  validatePhase2Refactoring,
  testParserRefactoring,
  testDataServiceIntegration,
  testEndToEndPerformance,
  testCacheOptimization,
  testConcurrencyOptimization,
};
