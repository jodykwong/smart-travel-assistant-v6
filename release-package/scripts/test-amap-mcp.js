#!/usr/bin/env node

/**
 * 智游助手v5.0 - 高德MCP测试脚本
 * 验证高德MCP官方服务的连接和功能
 */

const { AmapMCPOfficialClient } = require('../src/lib/mcp/amap-mcp-official-client.ts');
const { TravelMCPAdapter } = require('../src/lib/mcp/travel-mcp-adapter.ts');

// 颜色输出工具
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

// 测试配置
const TEST_CONFIG = {
  region: {
    name: '乌鲁木齐',
    priority: 1,
    estimatedDays: 3,
    complexity: 0.8,
    coordinates: [87.6168, 43.8256],
    description: '新疆首府，现代化都市',
  },
  userPreferences: {
    budget: 'mid-range',
    travelStyles: ['culture', 'food'],
    accommodation: 'hotel',
    groupSize: 2,
  },
};

async function testAmapMCPConnection() {
  log.title('高德MCP连接测试');

  try {
    // 检查环境变量
    const apiKey = process.env.AMAP_MCP_API_KEY;
    if (!apiKey) {
      log.error('AMAP_MCP_API_KEY 环境变量未设置');
      return false;
    }

    log.info(`API Key: ${apiKey.substring(0, 8)}...`);

    // 创建MCP客户端
    const mcpClient = new AmapMCPOfficialClient();
    
    // 测试初始化
    log.info('正在初始化MCP客户端...');
    await mcpClient.initialize();
    log.success('MCP客户端初始化成功');

    // 获取可用工具
    const tools = mcpClient.getAvailableTools();
    log.success(`发现 ${tools.length} 个可用工具:`);
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    return true;
  } catch (error) {
    log.error(`MCP连接失败: ${error.message}`);
    return false;
  }
}

async function testPOISearch() {
  log.title('POI搜索功能测试');

  try {
    const mcpClient = new AmapMCPOfficialClient();
    await mcpClient.initialize();

    // 测试景点搜索
    log.info('搜索乌鲁木齐景点...');
    const attractions = await mcpClient.searchPOI({
      keywords: '景点',
      region: '乌鲁木齐',
      category: 'attraction',
      limit: 5,
    });

    log.success(`找到 ${attractions.length} 个景点:`);
    attractions.forEach(poi => {
      console.log(`  - ${poi.name} (${poi.rating}⭐) - ${poi.address}`);
    });

    // 测试餐厅搜索
    log.info('搜索乌鲁木齐餐厅...');
    const restaurants = await mcpClient.searchPOI({
      keywords: '餐厅',
      region: '乌鲁木齐',
      category: 'restaurant',
      limit: 5,
    });

    log.success(`找到 ${restaurants.length} 个餐厅:`);
    restaurants.forEach(poi => {
      console.log(`  - ${poi.name} (${poi.rating}⭐) - ${poi.priceLevel}`);
    });

    return true;
  } catch (error) {
    log.error(`POI搜索失败: ${error.message}`);
    return false;
  }
}

async function testWeatherQuery() {
  log.title('天气查询功能测试');

  try {
    const mcpClient = new AmapMCPOfficialClient();
    await mcpClient.initialize();

    log.info('查询乌鲁木齐天气...');
    const weather = await mcpClient.getWeather({
      location: '乌鲁木齐',
    });

    log.success('天气查询成功:');
    console.log(`  - 温度: ${weather.temperature.min}°C - ${weather.temperature.max}°C`);
    console.log(`  - 天气: ${weather.condition}`);
    console.log(`  - 湿度: ${weather.humidity}%`);

    return true;
  } catch (error) {
    log.error(`天气查询失败: ${error.message}`);
    return false;
  }
}

async function testTravelAdapter() {
  log.title('旅行规划适配器测试');

  try {
    const adapter = new TravelMCPAdapter();

    log.info('收集乌鲁木齐完整旅行数据...');
    const regionData = await adapter.collectRegionData(
      TEST_CONFIG.region,
      TEST_CONFIG.userPreferences,
      {
        maxPOIsPerCategory: 5,
        includeWeather: true,
        cacheEnabled: false, // 测试时禁用缓存
      }
    );

    log.success('区域数据收集成功:');
    console.log(`  - 景点数量: ${regionData.attractions.length}`);
    console.log(`  - 餐厅数量: ${regionData.restaurants.length}`);
    console.log(`  - 酒店数量: ${regionData.hotels.length}`);
    console.log(`  - 数据质量: ${regionData.dataQuality}`);
    console.log(`  - 天气状况: ${regionData.weather.condition}`);

    // 测试数据质量报告
    const qualityReport = await adapter.getDataQualityReport(TEST_CONFIG.region.name);
    if (qualityReport) {
      log.success('数据质量报告:');
      console.log(`  - 总体评分: ${qualityReport.overallScore}`);
      console.log(`  - 建议: ${qualityReport.recommendations.join(', ')}`);
    }

    return true;
  } catch (error) {
    log.error(`旅行适配器测试失败: ${error.message}`);
    return false;
  }
}

async function testHealthCheck() {
  log.title('健康检查测试');

  try {
    const mcpClient = new AmapMCPOfficialClient();
    const adapter = new TravelMCPAdapter();

    // MCP客户端健康检查
    const mcpHealthy = await mcpClient.healthCheck();
    if (mcpHealthy) {
      log.success('MCP客户端健康状态良好');
    } else {
      log.error('MCP客户端健康检查失败');
    }

    // 适配器健康检查
    const adapterHealth = await adapter.healthCheck();
    log.success('适配器健康检查结果:');
    console.log(`  - 状态: ${adapterHealth.status}`);
    console.log(`  - MCP客户端: ${adapterHealth.mcpClient ? '正常' : '异常'}`);
    console.log(`  - 缓存大小: ${adapterHealth.cacheSize}`);
    console.log(`  - 可用工具: ${adapterHealth.details.availableTools.join(', ')}`);

    return mcpHealthy && adapterHealth.status === 'healthy';
  } catch (error) {
    log.error(`健康检查失败: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log.title('高德MCP完整功能测试');

  const tests = [
    { name: 'MCP连接测试', fn: testAmapMCPConnection },
    { name: 'POI搜索测试', fn: testPOISearch },
    { name: '天气查询测试', fn: testWeatherQuery },
    { name: '旅行适配器测试', fn: testTravelAdapter },
    { name: '健康检查测试', fn: testHealthCheck },
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    try {
      log.info(`开始执行: ${test.name}`);
      const result = await test.fn();
      
      if (result) {
        log.success(`${test.name} - 通过`);
        passedTests++;
      } else {
        log.error(`${test.name} - 失败`);
      }
    } catch (error) {
      log.error(`${test.name} - 异常: ${error.message}`);
    }
    
    console.log(''); // 空行分隔
  }

  // 测试结果汇总
  log.title('测试结果汇总');
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过测试: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`失败测试: ${colors.red}${totalTests - passedTests}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);

  if (successRate >= 80) {
    log.success('高德MCP集成测试通过！');
    console.log('\n🚀 可以开始使用高德MCP进行旅行规划了');
  } else {
    log.error('高德MCP集成测试失败！');
    console.log('\n🔧 请检查配置和网络连接');
  }

  return successRate >= 80;
}

// 主函数
async function main() {
  try {
    // 检查环境变量
    if (!process.env.AMAP_MCP_API_KEY) {
      log.error('请设置 AMAP_MCP_API_KEY 环境变量');
      process.exit(1);
    }

    const success = await runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log.error(`测试执行失败: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testAmapMCPConnection,
  testPOISearch,
  testWeatherQuery,
  testTravelAdapter,
  testHealthCheck,
  runAllTests,
};
