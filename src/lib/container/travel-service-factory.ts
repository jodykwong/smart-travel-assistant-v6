/**
 * 智游助手v6.2 - 旅行服务工厂
 * 遵循原则: [工厂模式] + [SOLID-单一职责] + [配置驱动]
 * 
 * 核心功能:
 * 1. 统一创建和配置所有服务
 * 2. 处理服务间的依赖关系
 * 3. 支持不同环境的配置
 * 4. 提供服务预设配置
 */

import TravelServiceContainer, { ITravelServiceContainer } from './travel-service-container';
import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import { ServiceQualityMonitor } from '@/lib/geo/quality-monitor';
import { IntelligentGeoQueue } from '@/lib/queue/intelligent-queue';
import { UserFriendlyErrorHandler } from '@/lib/error/user-friendly-error-handler';
import IntelligentCacheManager from '@/lib/cache/intelligent-cache-manager';
import CacheStrategyFactory from '@/lib/cache/cache-strategy-factory';
import TravelStateManager from '@/lib/langgraph/state-manager';
import LangGraphErrorMiddleware from '@/lib/langgraph/error-middleware';

// ============= 配置接口定义 =============

export interface TravelServiceConfig {
  environment: 'development' | 'staging' | 'production';
  cache: {
    enabled: boolean;
    maxSize: number;
    defaultTTL: number;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    qualityThreshold: number;
  };
  queue: {
    enabled: boolean;
    maxConcurrency: number;
    retryAttempts: number;
  };
  geo: {
    primaryService: 'amap' | 'tencent';
    fallbackEnabled: boolean;
    timeout: number;
  };
  errorHandling: {
    userFriendlyMessages: boolean;
    detailedLogging: boolean;
    autoRecovery: boolean;
  };
}

export interface ServicePreset {
  name: string;
  description: string;
  config: TravelServiceConfig;
}

// ============= 默认配置 =============

const DEFAULT_CONFIG: TravelServiceConfig = {
  environment: 'development',
  cache: {
    enabled: true,
    maxSize: 10000,
    defaultTTL: 1800000 // 30分钟
  },
  monitoring: {
    enabled: true,
    interval: 30000, // 30秒
    qualityThreshold: 0.8
  },
  queue: {
    enabled: true,
    maxConcurrency: 10,
    retryAttempts: 3
  },
  geo: {
    primaryService: 'amap',
    fallbackEnabled: true,
    timeout: 30000 // 30秒
  },
  errorHandling: {
    userFriendlyMessages: true,
    detailedLogging: true,
    autoRecovery: true
  }
};

// ============= 预设配置 =============

const SERVICE_PRESETS: ServicePreset[] = [
  {
    name: 'development',
    description: '开发环境配置 - 详细日志，较短缓存',
    config: {
      ...DEFAULT_CONFIG,
      environment: 'development',
      cache: {
        enabled: true,
        maxSize: 1000,
        defaultTTL: 300000 // 5分钟
      },
      monitoring: {
        enabled: true,
        interval: 10000, // 10秒
        qualityThreshold: 0.7
      }
    }
  },
  {
    name: 'production',
    description: '生产环境配置 - 高性能，长缓存',
    config: {
      ...DEFAULT_CONFIG,
      environment: 'production',
      cache: {
        enabled: true,
        maxSize: 50000,
        defaultTTL: 3600000 // 1小时
      },
      monitoring: {
        enabled: true,
        interval: 60000, // 1分钟
        qualityThreshold: 0.9
      },
      queue: {
        enabled: true,
        maxConcurrency: 50,
        retryAttempts: 5
      },
      errorHandling: {
        userFriendlyMessages: true,
        detailedLogging: false, // 生产环境减少日志
        autoRecovery: true
      }
    }
  },
  {
    name: 'high_performance',
    description: '高性能配置 - 最大化缓存和并发',
    config: {
      ...DEFAULT_CONFIG,
      environment: 'production',
      cache: {
        enabled: true,
        maxSize: 100000,
        defaultTTL: 7200000 // 2小时
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        qualityThreshold: 0.95
      },
      queue: {
        enabled: true,
        maxConcurrency: 100,
        retryAttempts: 3
      }
    }
  }
];

// ============= 服务工厂实现 =============

export class TravelServiceFactory {
  private static instance: TravelServiceFactory;
  private containers: Map<string, ITravelServiceContainer> = new Map();

  private constructor() {
    console.log('旅行服务工厂初始化');
  }

  /**
   * 获取工厂单例
   * 遵循原则: [单例模式] - 确保全局唯一的工厂实例
   */
  static getInstance(): TravelServiceFactory {
    if (!TravelServiceFactory.instance) {
      TravelServiceFactory.instance = new TravelServiceFactory();
    }
    return TravelServiceFactory.instance;
  }

  /**
   * 创建服务容器
   * 遵循原则: [工厂模式] - 封装复杂的对象创建逻辑
   */
  async createContainer(
    name: string = 'default',
    config?: Partial<TravelServiceConfig>
  ): Promise<ITravelServiceContainer> {
    
    if (this.containers.has(name)) {
      console.log(`返回已存在的容器: ${name}`);
      return this.containers.get(name)!;
    }

    console.log(`创建新的服务容器: ${name}`);
    
    // 合并配置
    const finalConfig = this.mergeConfig(config);
    
    // 创建容器
    const container = new TravelServiceContainer();
    
    // 注册所有服务
    await this.registerServices(container, finalConfig);
    
    // 初始化容器
    await container.initialize();
    
    // 缓存容器
    this.containers.set(name, container);
    
    console.log(`✅ 服务容器 ${name} 创建完成`);
    return container;
  }

  /**
   * 使用预设配置创建容器
   */
  async createContainerWithPreset(
    presetName: string,
    containerName: string = presetName
  ): Promise<ITravelServiceContainer> {
    
    const preset = SERVICE_PRESETS.find(p => p.name === presetName);
    if (!preset) {
      throw new Error(`未找到预设配置: ${presetName}`);
    }

    console.log(`使用预设配置创建容器: ${presetName} - ${preset.description}`);
    return await this.createContainer(containerName, preset.config);
  }

  /**
   * 注册所有服务到容器
   * 遵循原则: [SOLID-依赖倒置] - 依赖注入而非直接创建
   */
  private async registerServices(
    container: TravelServiceContainer,
    config: TravelServiceConfig
  ): Promise<void> {
    
    console.log('开始注册服务...');

    // 1. 创建基础服务（无依赖）
    const qualityMonitor = this.createQualityMonitor(config);
    container.registerQualityMonitor(qualityMonitor);

    // 2. 创建缓存服务（依赖质量监控）
    const cacheManager = this.createCacheManager(config, qualityMonitor);
    container.registerCacheManager(cacheManager);

    // 3. 创建地理服务（依赖质量监控和缓存）
    const geoService = this.createGeoService(config, qualityMonitor, cacheManager);
    container.registerGeoService(geoService);

    // 4. 创建队列服务（依赖地理服务）
    const queue = this.createQueue(config, geoService);
    container.registerQueue(queue);

    // 5. 创建错误处理服务
    const errorHandler = this.createErrorHandler(config);
    container.registerErrorHandler(errorHandler);

    // 6. 创建状态管理服务
    const stateManager = this.createStateManager(config);
    container.registerStateManager(stateManager);

    console.log('✅ 所有服务注册完成');
  }

  // ============= 服务创建方法 =============

  private createQualityMonitor(config: TravelServiceConfig): ServiceQualityMonitor {
    console.log('创建服务质量监控器...');
    
    const monitor = new ServiceQualityMonitor();
    
    // 配置监控参数
    if (config.monitoring.enabled) {
      // 这里可以设置监控间隔等参数
      console.log(`质量监控已启用，间隔: ${config.monitoring.interval}ms`);
    }
    
    return monitor;
  }

  private createCacheManager(
    config: TravelServiceConfig,
    qualityMonitor: ServiceQualityMonitor
  ): IntelligentCacheManager {
    console.log('创建智能缓存管理器...');
    
    if (!config.cache.enabled) {
      console.log('缓存已禁用，创建空缓存管理器');
      // 可以创建一个无操作的缓存管理器
    }
    
    const cacheManager = new IntelligentCacheManager(
      qualityMonitor,
      config.cache.maxSize
    );
    
    console.log(`缓存管理器已创建，最大大小: ${config.cache.maxSize}`);
    return cacheManager;
  }

  private createGeoService(
    config: TravelServiceConfig,
    qualityMonitor: ServiceQualityMonitor,
    cacheManager: IntelligentCacheManager
  ): UnifiedGeoService {
    console.log('创建统一地理服务...');
    
    // 根据UnifiedGeoService的GeoServiceConfig接口创建配置
    const geoServiceConfig = {
      strategy: config.geo.fallbackEnabled ? 'dual_redundancy' as const : 'single_service' as const,
      qualityThreshold: config.monitoring.qualityThreshold,
      responseTimeThreshold: config.geo.timeout,
      autoSwitchEnabled: config.geo.fallbackEnabled,
      amap: {
        apiKey: process.env.AMAP_MCP_API_KEY || '',
        serverUrl: process.env.AMAP_MCP_SERVER_URL || ''
      },
      tencent: {
        apiKey: process.env.TENCENT_MCP_API_KEY || '',
        serverUrl: process.env.TENCENT_MCP_SERVER_URL || ''
      }
    };

    const geoService = new UnifiedGeoService(geoServiceConfig);
    
    console.log(`地理服务已创建，主服务: ${config.geo.primaryService}`);
    return geoService;
  }

  private createQueue(
    config: TravelServiceConfig,
    geoService: UnifiedGeoService
  ): IntelligentGeoQueue {
    console.log('创建智能地理队列...');

    // 获取质量监控器（从地理服务中获取）
    const qualityMonitor = new ServiceQualityMonitor();

    // 根据IntelligentGeoQueue的构造函数创建队列
    const queue = new IntelligentGeoQueue(
      geoService,
      qualityMonitor,
      {
        maxConcurrent: config.queue.maxConcurrency,
        maxQueueSize: 1000,
        defaultTimeout: 30000,
        defaultMaxRetries: config.queue.retryAttempts,
        priorityLevels: 10,
        loadBalancingStrategy: 'quality_based',
        enableDeduplication: true,
        enableCaching: config.cache.enabled
      }
    );

    console.log(`地理队列已创建，最大并发: ${config.queue.maxConcurrency}`);
    return queue;
  }

  private createErrorHandler(config: TravelServiceConfig): UserFriendlyErrorHandler {
    console.log('创建用户友好错误处理器...');

    // UserFriendlyErrorHandler需要geoService和transparencyManager
    // 这里创建一个简化版本，实际使用时需要传入正确的依赖
    const geoService = new UnifiedGeoService();
    const transparencyManager = null as any; // 临时处理，实际需要正确的透明度管理器

    const errorHandler = new UserFriendlyErrorHandler(
      geoService,
      transparencyManager
    );

    console.log('错误处理器已创建');
    return errorHandler;
  }

  private createStateManager(config: TravelServiceConfig): TravelStateManager {
    console.log('创建旅行状态管理器...');

    // 创建初始状态
    const initialState = {
      planning: {
        context: {
          sessionId: 'default-session',
          requestId: 'default-request',
          timestamp: Date.now()
        },
        request: {
          origin: '',
          destination: '',
          travelDate: new Date(),
          duration: 1,
          travelers: 1,
          preferences: {
            travelStyle: 'comfort' as const,
            interests: [],
            transportation: 'mixed' as const,
            accommodation: 'hotel' as const,
            dining: 'any' as const
          }
        },
        status: 'pending' as const
      },
      analysis: {},
      execution: {},
      monitoring: {
        errors: [],
        recoveryAttempts: 0
      },
      metadata: {
        version: 1,
        lastUpdated: Date.now()
      }
    };

    const stateManager = new TravelStateManager(initialState);

    console.log('状态管理器已创建');
    return stateManager;
  }

  // ============= 配置管理方法 =============

  private mergeConfig(userConfig?: Partial<TravelServiceConfig>): TravelServiceConfig {
    if (!userConfig) {
      return { ...DEFAULT_CONFIG };
    }

    return {
      environment: userConfig.environment || DEFAULT_CONFIG.environment,
      cache: { ...DEFAULT_CONFIG.cache, ...userConfig.cache },
      monitoring: { ...DEFAULT_CONFIG.monitoring, ...userConfig.monitoring },
      queue: { ...DEFAULT_CONFIG.queue, ...userConfig.queue },
      geo: { ...DEFAULT_CONFIG.geo, ...userConfig.geo },
      errorHandling: { ...DEFAULT_CONFIG.errorHandling, ...userConfig.errorHandling }
    };
  }

  /**
   * 获取可用的预设配置
   */
  getAvailablePresets(): ServicePreset[] {
    return [...SERVICE_PRESETS];
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): TravelServiceConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 获取已创建的容器
   */
  getContainer(name: string): ITravelServiceContainer | undefined {
    return this.containers.get(name);
  }

  /**
   * 销毁容器
   */
  async destroyContainer(name: string): Promise<void> {
    const container = this.containers.get(name);
    if (container) {
      await container.destroy();
      this.containers.delete(name);
      console.log(`✅ 容器 ${name} 已销毁`);
    }
  }

  /**
   * 销毁所有容器
   */
  async destroyAllContainers(): Promise<void> {
    console.log('销毁所有服务容器...');
    
    const destroyPromises = Array.from(this.containers.entries()).map(
      async ([name, container]) => {
        try {
          await container.destroy();
          console.log(`✅ 容器 ${name} 已销毁`);
        } catch (error) {
          console.error(`⚠️  容器 ${name} 销毁失败:`, error);
        }
      }
    );

    await Promise.all(destroyPromises);
    this.containers.clear();
    console.log('🎉 所有容器已销毁');
  }

  /**
   * 获取工厂统计信息
   */
  getFactoryStats() {
    return {
      totalContainers: this.containers.size,
      containerNames: Array.from(this.containers.keys()),
      availablePresets: SERVICE_PRESETS.map(p => p.name)
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config: Partial<TravelServiceConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.cache?.maxSize && config.cache.maxSize <= 0) {
      errors.push('缓存最大大小必须大于0');
    }

    if (config.monitoring?.interval && config.monitoring.interval < 1000) {
      errors.push('监控间隔不能小于1秒');
    }

    if (config.queue?.maxConcurrency && config.queue.maxConcurrency <= 0) {
      errors.push('队列最大并发数必须大于0');
    }

    if (config.geo?.timeout && config.geo.timeout < 1000) {
      errors.push('地理服务超时时间不能小于1秒');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============= 便捷导出 =============

/**
 * 获取服务工厂实例
 */
export function getTravelServiceFactory(): TravelServiceFactory {
  return TravelServiceFactory.getInstance();
}

/**
 * 快速创建开发环境容器
 */
export async function createDevelopmentContainer(): Promise<ITravelServiceContainer> {
  const factory = getTravelServiceFactory();
  return await factory.createContainerWithPreset('development');
}

/**
 * 快速创建生产环境容器
 */
export async function createProductionContainer(): Promise<ITravelServiceContainer> {
  const factory = getTravelServiceFactory();
  return await factory.createContainerWithPreset('production');
}

export default TravelServiceFactory;
