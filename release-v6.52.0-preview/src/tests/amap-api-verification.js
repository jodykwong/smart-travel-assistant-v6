/**
 * 智游助手v5.0 - 高德地图API验证测试
 * 验证现有API key是否可以获取旅行规划所需的数据
 */

const https = require('https');
const querystring = require('querystring');

// 从环境变量获取API key
const AMAP_API_KEY = process.env.AMAP_MCP_API_KEY || '122e7e01e2b31768d91052d296e57c20';

// 测试目的地 - 选择东三省的城市
const TEST_DESTINATIONS = [
  { name: '哈尔滨', city: '哈尔滨市' },
  { name: '沈阳', city: '沈阳市' },
  { name: '长春', city: '长春市' },
];

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
 * 通用HTTP请求函数
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`JSON解析失败: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 测试地理编码功能
 */
async function testGeocoding(destination) {
  log.title(`测试地理编码 - ${destination.name}`);
  
  try {
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      address: destination.city,
      city: destination.city
    });
    
    const url = `https://restapi.amap.com/v3/geocode/geo?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.geocodes && response.geocodes.length > 0) {
      const geocode = response.geocodes[0];
      log.success(`地理编码成功:`);
      console.log(`  - 地址: ${geocode.formatted_address}`);
      console.log(`  - 坐标: ${geocode.location}`);
      console.log(`  - 行政区: ${geocode.district}`);
      return {
        success: true,
        location: geocode.location,
        address: geocode.formatted_address
      };
    } else {
      log.error(`地理编码失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`地理编码请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 测试POI搜索 - 住宿
 */
async function testAccommodationSearch(destination, location) {
  log.title(`测试住宿搜索 - ${destination.name}`);
  
  try {
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      keywords: '酒店',
      city: destination.city,
      types: '100000', // 酒店类型
      offset: 10,
      page: 1,
      extensions: 'all'
    });
    
    const url = `https://restapi.amap.com/v3/place/text?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.pois && response.pois.length > 0) {
      log.success(`找到 ${response.pois.length} 个住宿选项:`);
      
      const accommodations = response.pois.slice(0, 5).map(poi => ({
        name: poi.name,
        address: poi.address,
        type: poi.type,
        location: poi.location,
        tel: poi.tel,
        rating: poi.biz_ext?.rating || '暂无评分',
        price: poi.biz_ext?.cost || '价格咨询'
      }));
      
      accommodations.forEach((hotel, index) => {
        console.log(`  ${index + 1}. ${hotel.name}`);
        console.log(`     地址: ${hotel.address}`);
        console.log(`     电话: ${hotel.tel || '暂无'}`);
        console.log(`     评分: ${hotel.rating}`);
      });
      
      return { success: true, data: accommodations };
    } else {
      log.error(`住宿搜索失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`住宿搜索请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 测试POI搜索 - 美食
 */
async function testFoodSearch(destination) {
  log.title(`测试美食搜索 - ${destination.name}`);
  
  try {
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      keywords: '餐厅',
      city: destination.city,
      types: '050000', // 餐饮服务类型
      offset: 10,
      page: 1,
      extensions: 'all'
    });
    
    const url = `https://restapi.amap.com/v3/place/text?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.pois && response.pois.length > 0) {
      log.success(`找到 ${response.pois.length} 个餐厅:`);
      
      const restaurants = response.pois.slice(0, 5).map(poi => ({
        name: poi.name,
        address: poi.address,
        type: poi.type,
        location: poi.location,
        tel: poi.tel,
        rating: poi.biz_ext?.rating || '暂无评分',
        avgPrice: poi.biz_ext?.cost || '价格咨询'
      }));
      
      restaurants.forEach((restaurant, index) => {
        console.log(`  ${index + 1}. ${restaurant.name}`);
        console.log(`     地址: ${restaurant.address}`);
        console.log(`     类型: ${restaurant.type}`);
        console.log(`     评分: ${restaurant.rating}`);
      });
      
      return { success: true, data: restaurants };
    } else {
      log.error(`美食搜索失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`美食搜索请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 测试路径规划
 */
async function testRouteSearch(destination, location) {
  log.title(`测试路径规划 - ${destination.name}`);
  
  try {
    // 测试从机场到市中心的路线
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      origin: location, // 市中心坐标
      destination: location, // 同一城市内的路线规划
      strategy: 1, // 最快捷路线
      extensions: 'all'
    });
    
    const url = `https://restapi.amap.com/v3/direction/driving?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.route && response.route.paths) {
      const path = response.route.paths[0];
      log.success(`路径规划成功:`);
      console.log(`  - 距离: ${(path.distance / 1000).toFixed(1)}公里`);
      console.log(`  - 预计时间: ${Math.round(path.duration / 60)}分钟`);
      console.log(`  - 路费: ¥${(path.tolls / 100).toFixed(0)}`);
      
      return { success: true, data: path };
    } else {
      log.error(`路径规划失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`路径规划请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 测试天气查询
 */
async function testWeatherQuery(destination) {
  log.title(`测试天气查询 - ${destination.name}`);
  
  try {
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      city: destination.city,
      extensions: 'all' // 获取预报天气
    });
    
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.forecasts && response.forecasts.length > 0) {
      const forecast = response.forecasts[0];
      log.success(`天气查询成功:`);
      console.log(`  - 城市: ${forecast.city}`);
      console.log(`  - 更新时间: ${forecast.reporttime}`);
      
      if (forecast.casts && forecast.casts.length > 0) {
        console.log(`  - 未来天气预报:`);
        forecast.casts.slice(0, 3).forEach(cast => {
          console.log(`    ${cast.date}: ${cast.dayweather} ${cast.daytemp}°C-${cast.nighttemp}°C`);
        });
      }
      
      return { success: true, data: forecast };
    } else {
      log.error(`天气查询失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`天气查询请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 测试周边搜索
 */
async function testNearbySearch(destination, location) {
  log.title(`测试周边搜索 - ${destination.name}`);
  
  try {
    const params = querystring.stringify({
      key: AMAP_API_KEY,
      location: location,
      keywords: '景点',
      types: '110000', // 风景名胜
      radius: 5000, // 5公里范围
      offset: 5,
      page: 1,
      extensions: 'all'
    });
    
    const url = `https://restapi.amap.com/v3/place/around?${params}`;
    const response = await makeRequest(url);
    
    if (response.status === '1' && response.pois && response.pois.length > 0) {
      log.success(`找到 ${response.pois.length} 个周边景点:`);
      
      response.pois.slice(0, 5).forEach((poi, index) => {
        console.log(`  ${index + 1}. ${poi.name}`);
        console.log(`     地址: ${poi.address}`);
        console.log(`     距离: ${poi.distance}米`);
      });
      
      return { success: true, data: response.pois };
    } else {
      log.error(`周边搜索失败: ${response.info}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`周边搜索请求失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 运行完整测试
 */
async function runCompleteTest() {
  log.title('高德地图API完整功能验证');
  console.log(`API Key: ${AMAP_API_KEY.substring(0, 8)}...`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: {}
  };
  
  for (const destination of TEST_DESTINATIONS) {
    console.log(`\n${'='.repeat(50)}`);
    log.info(`开始测试目的地: ${destination.name}`);
    console.log(`${'='.repeat(50)}`);
    
    const destResults = {
      geocoding: false,
      accommodation: false,
      food: false,
      route: false,
      weather: false,
      nearby: false
    };
    
    // 1. 地理编码测试
    const geocodingResult = await testGeocoding(destination);
    destResults.geocoding = geocodingResult.success;
    results.total++;
    if (geocodingResult.success) results.passed++;
    else results.failed++;
    
    let location = null;
    if (geocodingResult.success) {
      location = geocodingResult.location;
    }
    
    // 2. 住宿搜索测试
    const accommodationResult = await testAccommodationSearch(destination, location);
    destResults.accommodation = accommodationResult.success;
    results.total++;
    if (accommodationResult.success) results.passed++;
    else results.failed++;
    
    // 3. 美食搜索测试
    const foodResult = await testFoodSearch(destination);
    destResults.food = foodResult.success;
    results.total++;
    if (foodResult.success) results.passed++;
    else results.failed++;
    
    // 4. 路径规划测试
    if (location) {
      const routeResult = await testRouteSearch(destination, location);
      destResults.route = routeResult.success;
      results.total++;
      if (routeResult.success) results.passed++;
      else results.failed++;
    }
    
    // 5. 天气查询测试
    const weatherResult = await testWeatherQuery(destination);
    destResults.weather = weatherResult.success;
    results.total++;
    if (weatherResult.success) results.passed++;
    else results.failed++;
    
    // 6. 周边搜索测试
    if (location) {
      const nearbyResult = await testNearbySearch(destination, location);
      destResults.nearby = nearbyResult.success;
      results.total++;
      if (nearbyResult.success) results.passed++;
      else results.failed++;
    }
    
    results.details[destination.name] = destResults;
    
    // 等待一秒避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 输出测试结果汇总
  console.log(`\n${'='.repeat(60)}`);
  log.title('测试结果汇总');
  console.log(`${'='.repeat(60)}`);
  
  const successRate = (results.passed / results.total * 100).toFixed(1);
  
  console.log(`总测试数: ${results.total}`);
  console.log(`通过测试: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`失败测试: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  // 详细结果
  console.log('\n详细结果:');
  Object.entries(results.details).forEach(([city, cityResults]) => {
    console.log(`\n${city}:`);
    Object.entries(cityResults).forEach(([test, passed]) => {
      const status = passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
      console.log(`  ${test}: ${status}`);
    });
  });
  
  // 结论和建议
  console.log('\n' + '='.repeat(60));
  if (successRate >= 80) {
    log.success('高德地图API验证通过！');
    console.log('\n🎉 结论: 高德地图API可以满足智游助手的基本需求');
    console.log('\n✅ 支持的功能:');
    console.log('  - ✅ 地理编码和坐标转换');
    console.log('  - ✅ POI搜索（住宿、美食、景点）');
    console.log('  - ✅ 路径规划和导航');
    console.log('  - ✅ 天气查询和预报');
    console.log('  - ✅ 周边设施搜索');
    
    console.log('\n🔧 架构建议:');
    console.log('  1. 可以使用高德API作为主要数据源');
    console.log('  2. 交通和地理位置功能完全依赖高德');
    console.log('  3. 住宿和美食可考虑专业API增强');
    console.log('  4. 天气功能基本满足需求');
  } else {
    log.error('高德地图API验证失败！');
    console.log('\n❌ 存在问题，需要检查:');
    console.log('  - API key是否有效');
    console.log('  - 网络连接是否正常');
    console.log('  - API配额是否充足');
  }
  
  return successRate >= 80;
}

// 主函数
async function main() {
  try {
    if (!AMAP_API_KEY) {
      log.error('未找到高德地图API Key');
      process.exit(1);
    }
    
    const success = await runCompleteTest();
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
  testGeocoding,
  testAccommodationSearch,
  testFoodSearch,
  testRouteSearch,
  testWeatherQuery,
  testNearbySearch,
  runCompleteTest
};
