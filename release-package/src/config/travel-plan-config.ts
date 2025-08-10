/**
 * 智游助手v5.0 - 旅行计划配置系统
 * 提供灵活的配置驱动架构
 */

import { ParseConfig, ExternalServiceConfig } from '../types/travel-plan';

// 默认解析配置
export const DEFAULT_PARSE_CONFIG: ParseConfig = {
  enabledModules: ['accommodation', 'food', 'transport', 'tips'],
  strictMode: false,
  fallbackToDefault: true,
  customKeywords: {
    accommodation: ['住宿', '酒店', '旅馆', '民宿', '客栈', 'hotel', 'accommodation'],
    food: ['美食', '餐厅', '小吃', '特色菜', '料理', 'food', 'restaurant'],
    transport: ['交通', '出行', '路线', '车票', '机票', 'transport', 'travel'],
    tips: ['贴士', '建议', '注意', '提醒', '小贴士', 'tips', 'advice'],
  },
};

// 简化的服务配置 - 基于验证结果（100%成功率）
// 唯一数据源：高德MCP，移除所有第三方API集成
export const SIMPLIFIED_SERVICES_CONFIG = {
  // 统一使用高德MCP作为唯一数据源
  provider: 'amap',
  apiKey: process.env.AMAP_MCP_API_KEY || '122e7e01e2b31768d91052d296e57c20',

  // 服务质量配置（基于验证结果）
  services: {
    accommodation: {
      enabled: true,
      confidence: 0.9,
      provider: 'amap', // 强制使用高德MCP
      fallbackEnabled: false // 禁用任何备用服务
    },
    food: {
      enabled: true,
      confidence: 0.9,
      provider: 'amap', // 强制使用高德MCP
      fallbackEnabled: false // 禁用任何备用服务
    },
    transport: {
      enabled: true,
      confidence: 1.0,
      provider: 'amap', // 强制使用高德MCP
      fallbackEnabled: false // 禁用任何备用服务
    },
    weather: {
      enabled: true,
      confidence: 0.95,
      provider: 'amap', // 强制使用高德MCP
      fallbackEnabled: false // 禁用任何备用服务
    },
  },

  // 性能配置（优化目标：2-4秒响应时间）
  timeout: 5000, // 减少到5秒
  retries: 1, // 减少重试次数
  cacheEnabled: true,
  cacheTTL: 1800, // 减少到30分钟，提高数据新鲜度
};

// 模块配置接口
export interface ModuleConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  enabled: boolean;
  priority: number;
  dependencies?: string[];
  customSettings?: Record<string, any>;
}

// 简化的模块注册表 - 移除复杂配置，专注核心功能
export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  accommodation: {
    name: 'accommodation',
    displayName: '住宿推荐',
    icon: 'fas fa-bed',
    color: 'green',
    enabled: true,
    priority: 1,
    dependencies: [], // 移除依赖
    customSettings: {
      dataSource: 'amap', // 强制高德数据源
      maxRecommendations: 5,
    },
  },
  food: {
    name: 'food',
    displayName: '美食体验',
    icon: 'fas fa-utensils',
    color: 'orange',
    enabled: true,
    priority: 2,
    dependencies: [], // 移除依赖
    customSettings: {
      dataSource: 'amap', // 强制高德数据源
      maxRestaurants: 8,
    },
  },
  transport: {
    name: 'transport',
    displayName: '交通指南',
    icon: 'fas fa-car',
    color: 'purple',
    enabled: true,
    priority: 3,
    dependencies: [], // 移除依赖
    customSettings: {
      dataSource: 'amap', // 强制高德数据源
      realTimeEnabled: true, // 高德实时数据
    },
  },
  tips: {
    name: 'tips',
    displayName: '实用贴士',
    icon: 'fas fa-lightbulb',
    color: 'yellow',
    enabled: true,
    priority: 4,
    dependencies: [], // 移除依赖
    customSettings: {
      dataSource: 'amap', // 强制高德数据源
      weatherEnabled: true,
    },
  },
};

// 插件接口
export interface TravelPlanPlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  
  // 生命周期钩子
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
  
  // 数据处理钩子
  onBeforeParse?: (content: string) => Promise<string>;
  onAfterParse?: (data: any) => Promise<any>;
  
  // UI扩展钩子
  renderCustomSection?: (data: any) => React.ReactNode;
  renderCustomActions?: (data: any) => React.ReactNode;
  
  // 配置
  config?: Record<string, any>;
  dependencies?: string[];
}

// 插件管理器
export class PluginManager {
  private plugins: Map<string, TravelPlanPlugin> = new Map();
  private initialized = false;

  /**
   * 注册插件
   */
  register(plugin: TravelPlanPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`插件 ${plugin.name} 已存在，将被覆盖`);
    }
    
    this.plugins.set(plugin.name, plugin);
    console.log(`插件 ${plugin.name} v${plugin.version} 注册成功`);
  }

  /**
   * 卸载插件
   */
  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && plugin.onDestroy) {
      plugin.onDestroy();
    }
    this.plugins.delete(name);
  }

  /**
   * 初始化所有插件
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const [name, plugin] of this.plugins) {
      try {
        if (plugin.onInit) {
          await plugin.onInit();
        }
        console.log(`插件 ${name} 初始化成功`);
      } catch (error) {
        console.error(`插件 ${name} 初始化失败:`, error);
      }
    }

    this.initialized = true;
  }

  /**
   * 执行解析前钩子
   */
  async executeBeforeParse(content: string): Promise<string> {
    let processedContent = content;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.onBeforeParse) {
        try {
          processedContent = await plugin.onBeforeParse(processedContent);
        } catch (error) {
          console.error(`插件 ${plugin.name} 解析前处理失败:`, error);
        }
      }
    }
    
    return processedContent;
  }

  /**
   * 执行解析后钩子
   */
  async executeAfterParse(data: any): Promise<any> {
    let processedData = data;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.onAfterParse) {
        try {
          processedData = await plugin.onAfterParse(processedData);
        } catch (error) {
          console.error(`插件 ${plugin.name} 解析后处理失败:`, error);
        }
      }
    }
    
    return processedData;
  }

  /**
   * 获取所有插件
   */
  getPlugins(): TravelPlanPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取特定插件
   */
  getPlugin(name: string): TravelPlanPlugin | undefined {
    return this.plugins.get(name);
  }
}

// 全局插件管理器实例
export const pluginManager = new PluginManager();

// 配置管理器
export class ConfigManager {
  private config: Record<string, any> = {};

  /**
   * 设置配置
   */
  set(key: string, value: any): void {
    this.config[key] = value;
  }

  /**
   * 获取配置
   */
  get<T = any>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue;
  }

  /**
   * 批量设置配置
   */
  setMany(configs: Record<string, any>): void {
    Object.assign(this.config, configs);
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * 重置配置
   */
  reset(): void {
    this.config = {};
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnv(): void {
    // 加载外部服务API密钥
    if (process.env.BOOKING_API_KEY) {
      this.set('externalServices.accommodation.apiKey', process.env.BOOKING_API_KEY);
      this.set('externalServices.accommodation.enabled', true);
    }
    
    if (process.env.YELP_API_KEY) {
      this.set('externalServices.food.apiKey', process.env.YELP_API_KEY);
      this.set('externalServices.food.enabled', true);
    }
    
    if (process.env.AMAP_API_KEY) {
      this.set('externalServices.transport.apiKey', process.env.AMAP_API_KEY);
      this.set('externalServices.transport.enabled', true);
    }

    // 加载其他配置
    if (process.env.TRAVEL_PLAN_CACHE_TTL) {
      this.set('cache.ttl', parseInt(process.env.TRAVEL_PLAN_CACHE_TTL));
    }
    
    if (process.env.TRAVEL_PLAN_STRICT_MODE) {
      this.set('parse.strictMode', process.env.TRAVEL_PLAN_STRICT_MODE === 'true');
    }
  }
}

// 全局配置管理器实例
export const configManager = new ConfigManager();

// 初始化配置
configManager.loadFromEnv();

// 特性开关
export const FEATURE_FLAGS = {
  ENHANCED_PARSING: configManager.get('features.enhancedParsing', true),
  EXTERNAL_API_INTEGRATION: configManager.get('features.externalApiIntegration', false),
  REAL_TIME_UPDATES: configManager.get('features.realTimeUpdates', false),
  ADVANCED_ANALYTICS: configManager.get('features.advancedAnalytics', false),
  PLUGIN_SYSTEM: configManager.get('features.pluginSystem', true),
  CUSTOM_THEMES: configManager.get('features.customThemes', false),
};

// 主题配置
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}

export const DEFAULT_THEME: ThemeConfig = {
  name: 'default',
  colors: {
    primary: '#ec4899', // pink-500
    secondary: '#8b5cf6', // violet-500
    accent: '#f59e0b', // amber-500
    background: '#fefefe',
    surface: '#ffffff',
    text: '#1f2937', // gray-800
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
};
