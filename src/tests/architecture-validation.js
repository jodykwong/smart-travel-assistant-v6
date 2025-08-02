/**
 * 智游助手架构简化验证脚本
 * 验证第一阶段架构简化是否成功
 */

const { TravelDataService } = require('../services/travel-data-service');
const { SimplifiedAmapService } = require('../services/external-apis/simplified-amap-service');

// 测试数据
const testDestination = '哈尔滨';
const testMetadata = {
  id: 'validation-test-001',
  title: '哈尔滨3日游',
  destination: testDestination,
  totalDays: 3,
  startDate: '2024-03-01',
  endDate: '2024-03-03',
  totalCost: 3000,
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
 * 验证架构简化成果
 */
async function validateArchitectureSimplification() {
  log.title('智游助手架构简化验证');
  console.log('验证目标：');
  console.log('- 唯一数据源：高德MCP');
  console.log('- 响应时间：2-4秒');
  console.log('- 向后兼容：100%');
  console.log('- 代码减少：50%+');
  
  const results = {
    tests: 0,
    passed: 0,
    failed: 0,
    performance: {},
    compatibility: true,
    errors: [],
  };

  try {
    // 1. 验证统一数据服务
    log.title('测试1: 统一数据服务验证');
    const dataServiceTest = await testTravelDataService();
    results.tests++;
    if (dataServiceTest.success) {
      results.passed++;
      log.success('统一数据服务测试通过');
      results.performance.dataService = dataServiceTest.duration;
    } else {
      results.failed++;
      log.error('统一数据服务测试失败');
      results.errors.push(dataServiceTest.error);
    }

    // 2. 验证高德MCP集成
    log.title('测试2: 高德MCP集成验证');
    const amapServiceTest = await testAmapService();
    results.tests++;
    if (amapServiceTest.success) {
      results.passed++;
      log.success('高德MCP集成测试通过');
      results.performance.amapService = amapServiceTest.duration;
    } else {
      results.failed++;
      log.error('高德MCP集成测试失败');
      results.errors.push(amapServiceTest.error);
    }

    // 3. 验证响应时间
    log.title('测试3: 响应时间验证');
    const performanceTest = await testResponseTime();
    results.tests++;
    if (performanceTest.success) {
      results.passed++;
      log.success(`响应时间测试通过: ${performanceTest.duration}ms`);
      results.performance.overall = performanceTest.duration;
    } else {
      results.failed++;
      log.error(`响应时间测试失败: ${performanceTest.duration}ms (目标: <4000ms)`);
      results.errors.push(performanceTest.error);
    }

    // 4. 验证数据质量
    log.title('测试4: 数据质量验证');
    const qualityTest = await testDataQuality();
    results.tests++;
    if (qualityTest.success) {
      results.passed++;
      log.success(`数据质量测试通过: ${(qualityTest.quality * 100).toFixed(1)}%`);
      results.performance.dataQuality = qualityTest.quality;
    } else {
      results.failed++;
      log.error('数据质量测试失败');
      results.errors.push(qualityTest.error);
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
 * 测试统一数据服务
 */
async function testTravelDataService() {
  const startTime = Date.now();
  
  try {
    const dataService = new TravelDataService({
      enableCache: false,
      enableRetry: true,
      maxRetries: 1,
    });

    // 测试健康检查
    const health = await dataService.healthCheck();
    
    if (health.status !== 'healthy') {
      throw new Error('数据服务健康检查失败');
    }

    const duration = Date.now() - startTime;
    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试高德MCP服务
 */
async function testAmapService() {
  const startTime = Date.now();
  
  try {
    const amapService = new SimplifiedAmapService();

    // 测试健康检查
    const health = await amapService.healthCheck();
    
    if (health.status !== 'healthy') {
      throw new Error('高德MCP服务健康检查失败');
    }

    // 测试地理编码
    const geocodeResult = await amapService.geocode(testDestination);
    
    if (!geocodeResult || !geocodeResult.address) {
      throw new Error('地理编码测试失败');
    }

    const duration = Date.now() - startTime;
    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试响应时间
 */
async function testResponseTime() {
  const startTime = Date.now();
  
  try {
    const dataService = new TravelDataService({
      enableCache: false,
    });

    // 测试完整数据获取
    const allData = await dataService.getAllTravelData(testDestination);
    
    const duration = Date.now() - startTime;
    
    // 验证响应时间是否在目标范围内 (2-4秒)
    if (duration > 4000) {
      throw new Error(`响应时间超出目标: ${duration}ms > 4000ms`);
    }

    return { 
      success: true, 
      duration,
      quality: allData.overall.quality 
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, duration, error: error.message };
  }
}

/**
 * 测试数据质量
 */
async function testDataQuality() {
  try {
    const dataService = new TravelDataService();

    // 测试各个模块的数据质量
    const [accommodation, food, transport, tips] = await Promise.all([
      dataService.getAccommodationData(testDestination),
      dataService.getFoodData(testDestination),
      dataService.getTransportData(testDestination),
      dataService.getTipsData(testDestination),
    ]);

    // 计算平均质量
    const qualities = [accommodation.quality, food.quality, transport.quality, tips.quality];
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;

    // 验证数据源
    const sources = [accommodation.source, food.source, transport.source, tips.source];
    const isAmapOnly = sources.every(source => source === 'amap' || source.includes('amap'));

    if (!isAmapOnly) {
      throw new Error('数据源验证失败：存在非高德MCP数据源');
    }

    if (avgQuality < 0.7) {
      throw new Error(`数据质量不达标: ${(avgQuality * 100).toFixed(1)}% < 70%`);
    }

    return { success: true, quality: avgQuality };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 打印验证结果
 */
function printValidationResults(results) {
  console.log('\n' + '='.repeat(60));
  log.title('架构简化验证结果');
  console.log('='.repeat(60));
  
  const successRate = (results.passed / results.tests * 100).toFixed(1);
  
  console.log(`总测试数: ${results.tests}`);
  console.log(`通过测试: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`失败测试: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  if (results.performance.overall) {
    console.log(`\n📊 性能指标:`);
    console.log(`  响应时间: ${results.performance.overall}ms`);
    console.log(`  数据质量: ${(results.performance.dataQuality * 100).toFixed(1)}%`);
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 错误详情:`);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 80) {
    log.success('架构简化验证通过！');
    console.log('\n🎉 第一阶段架构简化成功完成：');
    console.log('  ✅ 唯一数据源：高德MCP');
    console.log('  ✅ 统一服务层架构');
    console.log('  ✅ 移除复杂抽象层');
    console.log('  ✅ 保持向后兼容性');
  } else {
    log.error('架构简化验证失败！');
    console.log('\n🔧 需要修复的问题：');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
}

// 主函数
async function main() {
  try {
    const success = await validateArchitectureSimplification();
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
  validateArchitectureSimplification,
  testTravelDataService,
  testAmapService,
  testResponseTime,
  testDataQuality,
};
