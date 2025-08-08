/**
 * 智游助手v6.2 - 腾讯地图旅行规划演示
 * 展示基于腾讯地图API的完整旅行规划功能
 */

async function demonstrateTencentTravelPlanning() {
  console.log('🗺️  智游助手v6.2 - 腾讯地图旅行规划演示\n');

  try {
    // 1. 初始化腾讯地图服务
    console.log('📍 步骤1: 初始化腾讯地图服务');
    const tencentService = await initializeTencentService();

    // 2. 演示地理编码功能
    console.log('\n🔍 步骤2: 地理编码演示');
    await demonstrateGeocoding(tencentService);

    // 3. 演示POI搜索功能
    console.log('\n🏢 步骤3: POI搜索演示');
    await demonstratePOISearch(tencentService);

    // 4. 演示路线规划功能
    console.log('\n🛣️  步骤4: 路线规划演示');
    await demonstrateRoutePlanning(tencentService);

    // 5. 演示完整旅行规划
    console.log('\n✈️  步骤5: 完整旅行规划演示');
    await demonstrateCompleteTravelPlan(tencentService);

    // 6. 演示服务质量对比
    console.log('\n📊 步骤6: 服务质量对比');
    await demonstrateServiceComparison(tencentService);

  } catch (error) {
    console.error('❌ 演示过程发生错误:', error.message);
  }
}

// ============= 模拟腾讯地图服务 =============

class MockTencentMapService {
  constructor() {
    this.apiKey = 'mock_tencent_api_key';
    this.baseUrl = 'https://apis.map.qq.com';
    console.log('  ✅ 腾讯地图服务初始化完成');
  }

  // 地理编码
  async geocoding(address) {
    console.log(`    🔍 地理编码查询: ${address}`);
    
    // 模拟腾讯地图API响应
    await this.simulateApiDelay();
    
    const mockResponse = {
      status: 0,
      message: 'query ok',
      result: {
        location: {
          lat: this.generateCoordinate(39.9, 0.1),
          lng: this.generateCoordinate(116.4, 0.1)
        },
        formatted_addresses: {
          recommend: address,
          rough: address.split('市')[0] + '市'
        },
        address_components: {
          province: this.extractProvince(address),
          city: this.extractCity(address),
          district: this.extractDistrict(address),
          street: '模拟街道',
          street_number: '123号'
        },
        similarity: 0.95,
        deviation: 100,
        reliability: 7
      }
    };

    console.log(`      📍 坐标: ${mockResponse.result.location.lat}, ${mockResponse.result.location.lng}`);
    console.log(`      🎯 相似度: ${mockResponse.result.similarity}`);
    
    return mockResponse;
  }

  // 逆地理编码
  async reverseGeocoding(lat, lng) {
    console.log(`    🔍 逆地理编码查询: ${lat}, ${lng}`);
    
    await this.simulateApiDelay();
    
    const mockResponse = {
      status: 0,
      message: 'query ok',
      result: {
        location: { lat, lng },
        formatted_addresses: {
          recommend: '北京市朝阳区建国路123号',
          rough: '北京市朝阳区'
        },
        address_components: {
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          street: '建国路',
          street_number: '123号'
        }
      }
    };

    console.log(`      📍 地址: ${mockResponse.result.formatted_addresses.recommend}`);
    
    return mockResponse;
  }

  // POI搜索
  async searchPOI(keyword, location, radius = 1000) {
    console.log(`    🔍 POI搜索: ${keyword} (范围: ${radius}m)`);
    
    await this.simulateApiDelay();
    
    const mockPOIs = this.generateMockPOIs(keyword, 5);
    
    const mockResponse = {
      status: 0,
      message: 'query ok',
      result: {
        data: mockPOIs,
        count: mockPOIs.length
      }
    };

    console.log(`      🏢 找到 ${mockPOIs.length} 个相关POI`);
    mockPOIs.forEach((poi, index) => {
      console.log(`        ${index + 1}. ${poi.title} - ${poi.category}`);
    });
    
    return mockResponse;
  }

  // 路线规划
  async routePlanning(origin, destination, mode = 'driving') {
    console.log(`    🛣️  路线规划: ${origin} → ${destination} (${mode})`);
    
    await this.simulateApiDelay(1500); // 路线规划稍慢
    
    const mockRoute = this.generateMockRoute(origin, destination, mode);
    
    const mockResponse = {
      status: 0,
      message: 'query ok',
      result: {
        routes: [mockRoute]
      }
    };

    console.log(`      📏 距离: ${mockRoute.distance}米`);
    console.log(`      ⏱️  预计时间: ${Math.round(mockRoute.duration / 60)}分钟`);
    console.log(`      🛤️  路线步骤: ${mockRoute.steps.length}步`);
    
    return mockResponse;
  }

  // 天气查询
  async getWeather(location) {
    console.log(`    🌤️  天气查询: ${location}`);
    
    await this.simulateApiDelay();
    
    const mockWeather = {
      status: 0,
      message: 'query ok',
      result: {
        now: {
          temperature: Math.round(Math.random() * 20 + 10),
          weather: ['晴', '多云', '小雨', '阴'][Math.floor(Math.random() * 4)],
          weather_code: 0,
          wind_direction: '东南风',
          wind_speed: Math.round(Math.random() * 10 + 5),
          humidity: Math.round(Math.random() * 30 + 50),
          visibility: Math.round(Math.random() * 10 + 10)
        },
        forecast: this.generateWeatherForecast(7)
      }
    };

    console.log(`      🌡️  当前温度: ${mockWeather.result.now.temperature}°C`);
    console.log(`      ☁️  天气状况: ${mockWeather.result.now.weather}`);
    
    return mockWeather;
  }

  // ============= 辅助方法 =============

  async simulateApiDelay(baseDelay = 800) {
    const delay = baseDelay + Math.random() * 400; // 800-1200ms 或自定义
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  generateCoordinate(base, range) {
    return parseFloat((base + (Math.random() - 0.5) * range).toFixed(6));
  }

  extractProvince(address) {
    if (address.includes('北京')) return '北京市';
    if (address.includes('上海')) return '上海市';
    if (address.includes('广州') || address.includes('深圳')) return '广东省';
    if (address.includes('杭州')) return '浙江省';
    if (address.includes('哈尔滨')) return '黑龙江省';
    if (address.includes('沈阳')) return '辽宁省';
    if (address.includes('长春')) return '吉林省';
    return '未知省份';
  }

  extractCity(address) {
    const cities = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '哈尔滨市', '沈阳市', '长春市'];
    return cities.find(city => address.includes(city.replace('市', ''))) || '未知城市';
  }

  extractDistrict(address) {
    const districts = ['朝阳区', '海淀区', '西城区', '东城区', '黄浦区', '浦东新区', '天河区', '越秀区'];
    return districts.find(district => address.includes(district)) || '未知区域';
  }

  generateMockPOIs(keyword, count) {
    const categories = {
      '景点': ['公园', '博物馆', '纪念馆', '风景区', '历史遗迹'],
      '餐厅': ['中餐厅', '西餐厅', '快餐店', '咖啡厅', '茶餐厅'],
      '酒店': ['五星酒店', '商务酒店', '经济酒店', '民宿', '青年旅社'],
      '购物': ['购物中心', '百货商店', '超市', '专卖店', '市场']
    };

    const categoryList = categories[keyword] || ['商店', '服务点', '办公楼', '住宅区', '其他'];
    const pois = [];

    for (let i = 0; i < count; i++) {
      pois.push({
        id: `poi_${i + 1}`,
        title: `${keyword}${i + 1}`,
        category: categoryList[Math.floor(Math.random() * categoryList.length)],
        location: {
          lat: this.generateCoordinate(39.9, 0.05),
          lng: this.generateCoordinate(116.4, 0.05)
        },
        address: `模拟地址${i + 1}号`,
        distance: Math.round(Math.random() * 2000 + 100),
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1))
      });
    }

    return pois;
  }

  generateMockRoute(origin, destination, mode) {
    const baseDuration = {
      'driving': 3600,    // 1小时
      'walking': 7200,    // 2小时
      'transit': 4800,    // 1.3小时
      'bicycling': 5400   // 1.5小时
    };

    const baseDistance = {
      'driving': 15000,   // 15km
      'walking': 8000,    // 8km
      'transit': 12000,   // 12km
      'bicycling': 10000  // 10km
    };

    const duration = baseDuration[mode] + Math.random() * 1800; // ±30分钟
    const distance = baseDistance[mode] + Math.random() * 5000; // ±5km

    return {
      mode,
      distance: Math.round(distance),
      duration: Math.round(duration),
      polyline: 'mock_polyline_data',
      steps: this.generateRouteSteps(mode, Math.floor(Math.random() * 8 + 5))
    };
  }

  generateRouteSteps(mode, stepCount) {
    const stepTemplates = {
      'driving': ['直行', '左转', '右转', '掉头', '进入环岛', '驶出环岛'],
      'walking': ['直行', '左转', '右转', '过马路', '上天桥', '下天桥'],
      'transit': ['步行至地铁站', '乘坐地铁', '换乘', '步行至公交站', '乘坐公交'],
      'bicycling': ['直行', '左转', '右转', '推行', '上坡', '下坡']
    };

    const templates = stepTemplates[mode];
    const steps = [];

    for (let i = 0; i < stepCount; i++) {
      steps.push({
        instruction: templates[Math.floor(Math.random() * templates.length)],
        distance: Math.round(Math.random() * 1000 + 200),
        duration: Math.round(Math.random() * 300 + 60),
        polyline: `step_${i}_polyline`
      });
    }

    return steps;
  }

  generateWeatherForecast(days) {
    const forecast = [];
    const weathers = ['晴', '多云', '小雨', '阴', '雷阵雨'];
    
    for (let i = 0; i < days; i++) {
      forecast.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        temp_max: Math.round(Math.random() * 15 + 20),
        temp_min: Math.round(Math.random() * 10 + 10),
        humidity: Math.round(Math.random() * 30 + 50)
      });
    }

    return forecast;
  }
}

// ============= 演示功能 =============

async function initializeTencentService() {
  const service = new MockTencentMapService();
  return service;
}

async function demonstrateGeocoding(service) {
  const addresses = [
    '哈尔滨市道里区中央大街',
    '沈阳市和平区太原街',
    '长春市朝阳区人民大街'
  ];

  for (const address of addresses) {
    const result = await service.geocoding(address);
    
    // 演示逆地理编码
    const reverseResult = await service.reverseGeocoding(
      result.result.location.lat, 
      result.result.location.lng
    );
  }
}

async function demonstratePOISearch(service) {
  const searchQueries = [
    { keyword: '景点', location: '哈尔滨市' },
    { keyword: '餐厅', location: '沈阳市' },
    { keyword: '酒店', location: '长春市' }
  ];

  for (const query of searchQueries) {
    await service.searchPOI(query.keyword, query.location, 2000);
  }
}

async function demonstrateRoutePlanning(service) {
  const routes = [
    { origin: '哈尔滨市', destination: '沈阳市', mode: 'driving' },
    { origin: '沈阳市', destination: '长春市', mode: 'transit' },
    { origin: '长春市中心', destination: '长春市机场', mode: 'driving' }
  ];

  for (const route of routes) {
    await service.routePlanning(route.origin, route.destination, route.mode);
  }
}

async function demonstrateCompleteTravelPlan(service) {
  console.log('  🎯 生成东三省3日游完整旅行计划...\n');

  const travelPlan = {
    title: '东三省文化探索之旅',
    duration: '3天2夜',
    cities: ['哈尔滨', '沈阳', '长春'],
    itinerary: []
  };

  // 第一天：哈尔滨
  console.log('    📅 第1天：哈尔滨市');
  const harbinPOIs = await service.searchPOI('景点', '哈尔滨市');
  const harbinWeather = await service.getWeather('哈尔滨市');
  
  travelPlan.itinerary.push({
    day: 1,
    city: '哈尔滨',
    weather: harbinWeather.result.now,
    activities: [
      '上午：中央大街漫步',
      '中午：品尝东北菜',
      '下午：圣索菲亚大教堂参观',
      '晚上：松花江夜景'
    ]
  });

  // 第二天：哈尔滨到沈阳
  console.log('\n    📅 第2天：哈尔滨 → 沈阳');
  const route1 = await service.routePlanning('哈尔滨市', '沈阳市', 'driving');
  const shenyangPOIs = await service.searchPOI('景点', '沈阳市');
  const shenyangWeather = await service.getWeather('沈阳市');

  travelPlan.itinerary.push({
    day: 2,
    route: {
      from: '哈尔滨',
      to: '沈阳',
      distance: route1.result.routes[0].distance,
      duration: route1.result.routes[0].duration
    },
    city: '沈阳',
    weather: shenyangWeather.result.now,
    activities: [
      '上午：驱车前往沈阳',
      '下午：沈阳故宫游览',
      '晚上：太原街购物美食'
    ]
  });

  // 第三天：沈阳到长春
  console.log('\n    📅 第3天：沈阳 → 长春');
  const route2 = await service.routePlanning('沈阳市', '长春市', 'driving');
  const changchunPOIs = await service.searchPOI('景点', '长春市');
  const changchunWeather = await service.getWeather('长春市');

  travelPlan.itinerary.push({
    day: 3,
    route: {
      from: '沈阳',
      to: '长春',
      distance: route2.result.routes[0].distance,
      duration: route2.result.routes[0].duration
    },
    city: '长春',
    weather: changchunWeather.result.now,
    activities: [
      '上午：前往长春',
      '下午：伪满皇宫博物院',
      '晚上：返程准备'
    ]
  });

  // 输出完整旅行计划
  console.log('\n  🎉 完整旅行计划生成成功！');
  console.log(`  📋 计划名称: ${travelPlan.title}`);
  console.log(`  ⏰ 行程时长: ${travelPlan.duration}`);
  console.log(`  🏙️  涉及城市: ${travelPlan.cities.join(' → ')}`);
  
  travelPlan.itinerary.forEach(day => {
    console.log(`\n    第${day.day}天 - ${day.city}`);
    if (day.route) {
      console.log(`      🚗 路线: ${day.route.from} → ${day.route.to}`);
      console.log(`      📏 距离: ${Math.round(day.route.distance/1000)}公里`);
      console.log(`      ⏱️  时间: ${Math.round(day.route.duration/3600)}小时`);
    }
    console.log(`      🌤️  天气: ${day.weather.temperature}°C, ${day.weather.weather}`);
    day.activities.forEach(activity => {
      console.log(`      • ${activity}`);
    });
  });

  return travelPlan;
}

async function demonstrateServiceComparison(service) {
  console.log('  📊 腾讯地图 vs 高德地图服务对比\n');

  // 模拟服务质量对比
  const comparison = {
    tencent: {
      name: '腾讯地图',
      responseTime: 850 + Math.random() * 300,
      accuracy: 0.92 + Math.random() * 0.06,
      coverage: 0.88 + Math.random() * 0.08,
      features: ['路线规划', 'POI搜索', '地理编码', '天气查询', '实时交通']
    },
    amap: {
      name: '高德地图',
      responseTime: 780 + Math.random() * 250,
      accuracy: 0.94 + Math.random() * 0.05,
      coverage: 0.91 + Math.random() * 0.07,
      features: ['路线规划', 'POI搜索', '地理编码', '天气查询', '实时交通', '室内导航']
    }
  };

  console.log('    🏁 性能对比:');
  console.log(`      腾讯地图 - 响应时间: ${comparison.tencent.responseTime.toFixed(0)}ms, 准确率: ${(comparison.tencent.accuracy*100).toFixed(1)}%`);
  console.log(`      高德地图 - 响应时间: ${comparison.amap.responseTime.toFixed(0)}ms, 准确率: ${(comparison.amap.accuracy*100).toFixed(1)}%`);

  console.log('\n    🎯 智能切换建议:');
  if (comparison.tencent.responseTime < comparison.amap.responseTime) {
    console.log('      推荐使用腾讯地图 (响应时间更快)');
  } else {
    console.log('      推荐使用高德地图 (响应时间更快)');
  }

  if (comparison.tencent.accuracy > comparison.amap.accuracy) {
    console.log('      腾讯地图准确率更高');
  } else {
    console.log('      高德地图准确率更高');
  }

  console.log('\n    🔄 双链路架构优势:');
  console.log('      • 服务冗余: 一个服务故障时自动切换');
  console.log('      • 质量优选: 实时选择性能更好的服务');
  console.log('      • 负载均衡: 分散请求压力');
  console.log('      • 成本优化: 根据价格和配额智能选择');
}

// 执行演示
demonstrateTencentTravelPlanning()
  .then(() => {
    console.log('\n🎉 腾讯地图旅行规划演示完成！');
    console.log('✨ 展示了完整的基于腾讯地图的旅行规划能力');
  })
  .catch(error => {
    console.error('\n💥 演示过程发生异常:', error);
  });
