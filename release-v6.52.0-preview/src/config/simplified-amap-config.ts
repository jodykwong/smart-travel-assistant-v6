/**
 * 智游助手v5.0 - 基于验证结果的简化高德API配置
 * 采用高德API为主导的单一数据源架构
 */

// 基于验证结果的服务配置
export const SIMPLIFIED_AMAP_CONFIG = {
  // API配置
  apiKey: process.env.AMAP_MCP_API_KEY || '122e7e01e2b31768d91052d296e57c20',
  baseUrl: 'https://restapi.amap.com/v3',
  timeout: 8000,
  retryAttempts: 2,
  
  // 服务启用配置（基于验证结果）
  services: {
    geocoding: {
      enabled: true,
      confidence: 1.0,
      endpoint: '/geocode/geo',
    },
    accommodation: {
      enabled: true,
      confidence: 0.9,
      endpoint: '/place/text',
      types: '100000', // 酒店类型
      fallbackEnabled: false, // 高德数据质量足够高
    },
    food: {
      enabled: true,
      confidence: 0.9,
      endpoint: '/place/text',
      types: '050000', // 餐饮服务类型
      fallbackEnabled: false,
    },
    transport: {
      enabled: true,
      confidence: 1.0,
      endpoints: {
        driving: '/direction/driving',
        walking: '/direction/walking',
        transit: '/direction/transit',
      },
      fallbackEnabled: false, // 高德在交通领域绝对优势
    },
    weather: {
      enabled: true,
      confidence: 0.95,
      endpoint: '/weather/weatherInfo',
      fallbackEnabled: false, // 天气数据准确及时
    },
    nearby: {
      enabled: true,
      confidence: 0.9,
      endpoint: '/place/around',
    },
  },
  
  // 数据质量阈值
  qualityThresholds: {
    minimum: 0.7,
    good: 0.8,
    excellent: 0.9,
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    ttl: {
      geocoding: 86400, // 24小时
      accommodation: 3600, // 1小时
      food: 3600, // 1小时
      weather: 1800, // 30分钟
      nearby: 7200, // 2小时
    },
  },
  
  // 限流配置
  rateLimit: {
    requestsPerSecond: 10,
    burstLimit: 50,
    backoffStrategy: 'exponential',
  },
};

// 数据映射配置
export const DATA_MAPPING_CONFIG = {
  accommodation: {
    // 基于验证结果的字段映射
    nameField: 'name',
    addressField: 'address',
    ratingField: 'biz_ext.rating',
    phoneField: 'tel',
    locationField: 'location',
    typeMapping: {
      '酒店': 'hotel',
      '宾馆': 'hotel',
      '旅馆': 'guesthouse',
      '公寓': 'apartment',
      '度假村': 'resort',
    },
  },
  food: {
    nameField: 'name',
    addressField: 'address',
    ratingField: 'biz_ext.rating',
    phoneField: 'tel',
    typeField: 'type',
    cuisineMapping: {
      '川菜': '四川菜',
      '粤菜': '广东菜',
      '海鲜': '海鲜料理',
      '火锅': '火锅',
      '烧烤': '烧烤',
    },
  },
  weather: {
    cityField: 'city',
    updateTimeField: 'reporttime',
    forecastField: 'casts',
    temperatureFields: {
      day: 'daytemp',
      night: 'nighttemp',
    },
    weatherField: 'dayweather',
  },
};

// 错误处理配置
export const ERROR_HANDLING_CONFIG = {
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMIT_EXCEEDED',
    'SERVER_ERROR',
  ],
  fallbackStrategies: {
    accommodation: 'use_cache_or_default',
    food: 'use_cache_or_default',
    transport: 'use_cache_only', // 交通数据不使用默认值
    weather: 'use_cache_or_default',
  },
  defaultData: {
    accommodation: {
      name: '推荐住宿',
      type: 'hotel',
      amenities: ['基础设施'],
      priceRange: '价格咨询',
    },
    food: {
      name: '当地特色餐厅',
      type: 'restaurant',
      cuisine: '当地菜系',
      priceRange: '价格适中',
    },
    weather: {
      season: '全年',
      temperature: '适宜',
      rainfall: '正常',
      clothing: ['根据季节准备'],
    },
  },
};

// 性能监控配置
export const MONITORING_CONFIG = {
  metrics: {
    responseTime: true,
    successRate: true,
    errorRate: true,
    cacheHitRate: true,
  },
  alerts: {
    responseTimeThreshold: 5000, // 5秒
    errorRateThreshold: 0.1, // 10%
    successRateThreshold: 0.9, // 90%
  },
  logging: {
    level: 'info',
    includeRequestDetails: false,
    includeResponseDetails: false,
  },
};

// 功能开关
export const FEATURE_FLAGS = {
  // 基于验证结果的功能开关
  ENHANCED_ACCOMMODATION_SEARCH: true,
  DETAILED_FOOD_INFORMATION: true,
  REAL_TIME_WEATHER: true,
  ADVANCED_ROUTE_PLANNING: true,
  NEARBY_ATTRACTIONS: true,
  
  // 实验性功能
  SMART_RECOMMENDATIONS: false,
  PERSONALIZED_RESULTS: false,
  MULTI_LANGUAGE_SUPPORT: false,
  
  // 第三方集成（暂时禁用）
  BOOKING_INTEGRATION: false,
  YELP_INTEGRATION: false,
  OPENWEATHER_INTEGRATION: false,
};

// 导出统一配置
export const UNIFIED_CONFIG = {
  amap: SIMPLIFIED_AMAP_CONFIG,
  dataMapping: DATA_MAPPING_CONFIG,
  errorHandling: ERROR_HANDLING_CONFIG,
  monitoring: MONITORING_CONFIG,
  features: FEATURE_FLAGS,
};

export default UNIFIED_CONFIG;
