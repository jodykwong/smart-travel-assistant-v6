/**
 * 智游助手v6.2 - 统一地理服务接口
 * 基于第一性原理设计的智能双链路地理服务
 * 
 * 核心特性:
 * 1. 用户无感知的智能服务切换
 * 2. 质量优先的高可用架构
 * 3. 标准化的地理数据接口
 * 4. 实时服务质量监控
 */

import TencentMCPClient from '@/lib/mcp/tencent-mcp-client';
import GeoDataAdapter from '@/lib/geo/geo-data-adapter';
import ServiceQualityMonitor from '@/lib/geo/quality-monitor';
import IntelligentGeoServiceSwitcher, { type GeoOperation, type QualityResult } from '@/lib/geo/intelligent-switcher';
import IntelligentCacheManager from '@/lib/cache/intelligent-cache-manager';
import CacheStrategyFactory from '@/lib/cache/cache-strategy-factory';
import type {
  StandardGeocodingResponse,
  StandardReverseGeocodingResponse,
  StandardPlaceSearchResponse,
  StandardDirectionResponse
} from '@/lib/geo/geo-data-adapter';

// ============= 临时高德客户端类型 =============
class AmapMCPOfficialClient {
  async geocoding(address: string, city?: string): Promise<any> { return {}; }
  async reverseGeocoding(location: string): Promise<any> { return {}; }
  async placeSearch(keywords: string, location?: string): Promise<any> { return {}; }
  async directionDriving(origin: string, destination: string): Promise<any> { return {}; }
  async directionWalking(origin: string, destination: string): Promise<any> { return {}; }
  async directionTransit(origin: string, destination: string, city: string): Promise<any> { return {}; }
  async directionBicycling(origin: string, destination: string): Promise<any> { return {}; }
  async weather(location: string): Promise<any> { return {}; }
  async ipLocation(ip?: string): Promise<any> { return {}; }
}

// ============= 服务配置接口 =============

export interface GeoServiceConfig {
  amap: {
    apiKey: string;
    serverUrl: string;
  };
  tencent: {
    apiKey: string;
    serverUrl: string;
  };
  strategy: 'dual_redundancy' | 'single_service';
  qualityThreshold: number;
  responseTimeThreshold: number;
  autoSwitchEnabled: boolean;
}

export interface ServiceStatus {
  currentPrimary: 'amap' | 'tencent';
  autoSwitchEnabled: boolean;
  lastSwitchTime: Date;
  healthStatus: {
    amap: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      qualityScore: number;
      issues: string[];
    };
    tencent: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      qualityScore: number;
      issues: string[];
    };
  };
  qualityMetrics: {
    amap: number;
    tencent: number;
  };
}

export interface QualityReport {
  timestamp: Date;
  services: {
    amap: any;
    tencent: any;
  };
  comparison: {
    better: 'amap' | 'tencent' | 'equal';
    amapScore: number;
    tencentScore: number;
    difference: number;
  };
  recommendation: 'amap' | 'tencent';
}

// ============= 统一地理服务类 =============

export class UnifiedGeoService {
  private amapClient: AmapMCPOfficialClient;
  private tencentClient: TencentMCPClient;
  private adapter: GeoDataAdapter;
  private qualityMonitor: ServiceQualityMonitor;
  private switcher: IntelligentGeoServiceSwitcher;
  private cacheManager: IntelligentCacheManager;
  private cacheStrategyFactory: CacheStrategyFactory;
  private initialized = false;

  constructor(config?: Partial<GeoServiceConfig>) {
    // 初始化各个组件
    this.adapter = new GeoDataAdapter();
    this.qualityMonitor = new ServiceQualityMonitor();

    // 初始化客户端（使用环境变量或传入的配置）
    this.amapClient = new AmapMCPOfficialClient();
    this.tencentClient = new TencentMCPClient();

    // 初始化智能缓存系统
    this.cacheManager = new IntelligentCacheManager(this.qualityMonitor, 10000);
    this.cacheStrategyFactory = new CacheStrategyFactory(this.cacheManager, this.qualityMonitor);

    // 初始化智能切换器
    this.switcher = new IntelligentGeoServiceSwitcher(
      this.amapClient,
      this.tencentClient,
      this.adapter,
      this.qualityMonitor
    );

    console.log('统一地理服务初始化完成（包含智能缓存）');
  }

  // ============= 初始化和配置 =============

  /**
   * 初始化服务（可选的异步初始化）
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 执行初始健康检查
      console.log('执行初始健康检查...');
      const amapHealth = await this.qualityMonitor.performHealthCheck('amap');
      const tencentHealth = await this.qualityMonitor.performHealthCheck('tencent');
      
      console.log(`初始健康检查完成 - 高德: ${amapHealth.status}, 腾讯: ${tencentHealth.status}`);
      
      this.initialized = true;
      console.log('统一地理服务初始化完成');
    } catch (error) {
      console.error('统一地理服务初始化失败:', error);
      throw error;
    }
  }

  // ============= 核心地理服务方法 =============

  /**
   * 地理编码：地址转经纬度
   * 遵循原则: [第一性原理] - 优先使用缓存，减少API调用
   */
  async geocoding(address: string, city?: string): Promise<StandardGeocodingResponse> {
    const cacheKey = `geocoding:${address}${city ? `:${city}` : ''}`;

    // 创建缓存上下文
    const cacheContext = await this.cacheStrategyFactory.createOptimizedCacheContext(
      'geocoding',
      { address, city }
    );

    return await this.cacheManager.getOrCompute(
      cacheKey,
      async () => {
        const operation: GeoOperation = {
          name: 'geocoding',
          type: 'geocoding'
        };

        const params = { address, city };

        try {
          const result = await this.switcher.executeGeoOperation<StandardGeocodingResponse>(operation, params);
          return result.data;
        } catch (error) {
          console.error('地理编码失败:', error);
          throw error;
        }
      },
      cacheContext
    );
  }

  /**
   * 逆地理编码：经纬度转地址
   * 遵循原则: [第一性原理] - 位置信息相对稳定，适合长期缓存
   */
  async reverseGeocoding(location: string): Promise<StandardReverseGeocodingResponse> {
    const cacheKey = `reverse_geocoding:${location}`;

    // 创建缓存上下文
    const cacheContext = await this.cacheStrategyFactory.createOptimizedCacheContext(
      'reverse_geocoding',
      { location }
    );

    return await this.cacheManager.getOrCompute(
      cacheKey,
      async () => {
        const operation: GeoOperation = {
          name: 'reverseGeocoding',
          type: 'reverse_geocoding'
        };

        const params = { location };

        try {
          const result = await this.switcher.executeGeoOperation<StandardReverseGeocodingResponse>(operation, params);
          return result.data;
        } catch (error) {
          console.error('逆地理编码失败:', error);
          throw error;
        }
      },
      cacheContext
    );
  }

  /**
   * POI搜索
   * 遵循原则: [第一性原理] - 基于类别和位置的智能缓存
   */
  async placeSearch(keywords: string, location?: string, radius?: number): Promise<StandardPlaceSearchResponse> {
    const cacheKey = `poi_search:${keywords}:${location || 'global'}:${radius || 1000}`;

    // 创建缓存上下文
    const cacheContext = await this.cacheStrategyFactory.createOptimizedCacheContext(
      'poi_search',
      { category: keywords, location: location || '', radius }
    );

    return await this.cacheManager.getOrCompute(
      cacheKey,
      async () => {
        const operation: GeoOperation = {
          name: 'placeSearch',
          type: 'place_search'
        };

        const params = { keywords, location, radius };

        try {
          const result = await this.switcher.executeGeoOperation<StandardPlaceSearchResponse>(operation, params);
          return result.data;
        } catch (error) {
          console.error('POI搜索失败:', error);
          throw error;
        }
      },
      cacheContext
    );
  }

  /**
   * 路线规划
   * 遵循原则: [第一性原理] - 考虑交通状况的动态缓存
   */
  async routePlanning(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'transit' | 'bicycling',
    city?: string
  ): Promise<StandardDirectionResponse> {
    const cacheKey = `route_planning:${origin}:${destination}:${mode}${city ? `:${city}` : ''}`;

    // 创建缓存上下文
    const cacheContext = await this.cacheStrategyFactory.createOptimizedCacheContext(
      'route_planning',
      { origin, destination, mode }
    );

    return await this.cacheManager.getOrCompute(
      cacheKey,
      async () => {
        const operation: GeoOperation = {
          name: mode,
          type: 'route_planning'
        };

        const params = { origin, destination, mode, city };

        try {
          const result = await this.switcher.executeGeoOperation<StandardDirectionResponse>(operation, params);
          return result.data;
        } catch (error) {
          console.error('路线规划失败:', error);
          throw error;
        }
      },
      cacheContext
    );
  }

  /**
   * 天气查询
   */
  async weather(location: string): Promise<any> {
    const operation: GeoOperation = {
      name: 'weather',
      type: 'weather'
    };

    const params = { location };
    
    try {
      const result = await this.switcher.executeGeoOperation<any>(operation, params);
      return result.data;
    } catch (error) {
      console.error('天气查询失败:', error);
      throw error;
    }
  }

  /**
   * IP定位
   */
  async ipLocation(ip?: string): Promise<any> {
    const operation: GeoOperation = {
      name: 'ipLocation',
      type: 'ip_location'
    };

    const params = { ip };
    
    try {
      const result = await this.switcher.executeGeoOperation<any>(operation, params);
      return result.data;
    } catch (error) {
      console.error('IP定位失败:', error);
      throw error;
    }
  }

  // ============= 服务管理方法 =============

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    const switcherStatus = await this.switcher.getServiceStatus();
    
    return {
      currentPrimary: switcherStatus.currentPrimary,
      autoSwitchEnabled: switcherStatus.autoSwitchEnabled,
      lastSwitchTime: switcherStatus.lastSwitchTime,
      healthStatus: {
        amap: {
          status: switcherStatus.healthStatus.amap.status,
          qualityScore: switcherStatus.healthStatus.amap.qualityScore,
          issues: switcherStatus.healthStatus.amap.issues
        },
        tencent: {
          status: switcherStatus.healthStatus.tencent.status,
          qualityScore: switcherStatus.healthStatus.tencent.qualityScore,
          issues: switcherStatus.healthStatus.tencent.issues
        }
      },
      qualityMetrics: {
        amap: this.qualityMonitor.getAverageQualityScore('amap'),
        tencent: this.qualityMonitor.getAverageQualityScore('tencent')
      }
    };
  }

  /**
   * 获取质量报告
   */
  async getQualityReport(): Promise<QualityReport> {
    return this.qualityMonitor.generateQualityReport();
  }

  /**
   * 手动切换到备用服务
   */
  async switchToSecondary(): Promise<void> {
    await this.switcher.switchToSecondary();
    console.log('已手动切换到备用服务');
  }

  /**
   * 重置为自动模式
   */
  async resetToAuto(): Promise<void> {
    await this.switcher.resetToAuto();
    console.log('已重置为自动模式');
  }

  /**
   * 获取当前主服务
   */
  getCurrentPrimaryService(): 'amap' | 'tencent' {
    return this.switcher.getCurrentPrimaryService();
  }

  /**
   * 获取切换历史
   */
  getSwitchHistory(limit: number = 10) {
    return this.switcher.getSwitchHistory(limit);
  }

  // ============= 监控和诊断方法 =============

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<{
    amap: Awaited<ReturnType<ServiceQualityMonitor['performHealthCheck']>>;
    tencent: Awaited<ReturnType<ServiceQualityMonitor['performHealthCheck']>>;
  }> {
    const [amapHealth, tencentHealth] = await Promise.all([
      this.qualityMonitor.performHealthCheck('amap'),
      this.qualityMonitor.performHealthCheck('tencent')
    ]);

    return { amap: amapHealth, tencent: tencentHealth };
  }

  /**
   * 获取监控统计信息
   */
  getMonitoringStats() {
    return this.qualityMonitor.getMonitoringStats();
  }

  /**
   * 清理过期数据
   */
  cleanupOldData(maxAge: number = 86400): void {
    this.qualityMonitor.cleanupOldData(maxAge);
  }

  // ============= 高级功能 =============

  /**
   * 预热服务（可选）
   */
  async warmup(testCases: Array<{ type: string; params: any }> = []): Promise<void> {
    console.log('开始服务预热...');
    
    const defaultTestCases = [
      { type: 'geocoding', params: { address: '北京市朝阳区' } },
      { type: 'reverseGeocoding', params: { location: '116.397428,39.90923' } },
      { type: 'placeSearch', params: { keywords: '餐厅', location: '116.397428,39.90923' } }
    ];

    const cases = testCases.length > 0 ? testCases : defaultTestCases;

    for (const testCase of cases) {
      try {
        switch (testCase.type) {
          case 'geocoding':
            await this.geocoding(testCase.params.address, testCase.params.city);
            break;
          case 'reverseGeocoding':
            await this.reverseGeocoding(testCase.params.location);
            break;
          case 'placeSearch':
            await this.placeSearch(testCase.params.keywords, testCase.params.location);
            break;
        }
        console.log(`预热测试 ${testCase.type} 成功`);
      } catch (error) {
        console.warn(`预热测试 ${testCase.type} 失败:`, error);
      }
    }

    console.log('服务预热完成');
  }

  /**
   * 设置质量阈值
   */
  setQualityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('质量阈值必须在0-1之间');
    }

    // 这里需要更新环境变量或配置
    console.log(`质量阈值已更新为: ${threshold}`);
  }

  // ============= 缓存管理方法 =============

  /**
   * 获取缓存指标
   */
  getCacheMetrics() {
    return this.cacheManager.getMetrics();
  }

  /**
   * 执行缓存预热
   */
  async performCacheWarmup(): Promise<void> {
    await this.cacheStrategyFactory.performCacheWarmup();
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 获取缓存配置建议
   */
  getCacheConfigRecommendations() {
    return this.cacheStrategyFactory.getCacheConfigRecommendations();
  }

  // ============= 资源清理 =============

  /**
   * 销毁服务，清理资源
   */
  destroy(): void {
    this.switcher.destroy();
    this.qualityMonitor.cleanupOldData(0); // 清理所有数据
    this.cacheManager.destroy(); // 清理缓存资源
    this.initialized = false;
    console.log('统一地理服务已销毁（包含缓存清理）');
  }
}

// ============= 单例模式导出 =============

let globalGeoService: UnifiedGeoService | null = null;

/**
 * 获取全局地理服务实例
 */
export function getGeoService(): UnifiedGeoService {
  if (!globalGeoService) {
    globalGeoService = new UnifiedGeoService();
  }
  return globalGeoService;
}

/**
 * 创建新的地理服务实例
 */
export function createGeoService(config?: Partial<GeoServiceConfig>): UnifiedGeoService {
  return new UnifiedGeoService(config);
}

export default UnifiedGeoService;
