/**
 * 智游助手v6.2 - 缓存策略工厂
 * 遵循原则: [第一性原理] + [工厂模式] + [策略模式]
 * 
 * 核心功能:
 * 1. 基于业务场景的缓存策略选择
 * 2. 地理服务专用缓存优化
 * 3. 缓存预热和失效策略
 */

import IntelligentCacheManager, { CacheContext, CacheType, CachePriority } from './intelligent-cache-manager';
import { ServiceQualityMonitor } from '@/lib/geo/quality-monitor';
import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';

// ============= 缓存策略接口 =============

export interface CacheStrategy {
  name: string;
  description: string;
  isApplicable(context: CacheStrategyContext): boolean;
  createCacheContext(request: any): CacheContext;
  getPrewarmKeys?(): string[];
}

export interface CacheStrategyContext {
  requestType: string;
  userType: 'anonymous' | 'registered' | 'premium';
  region: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isWeekend: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface GeoServiceCacheConfig {
  geocoding: {
    baseTTL: number;
    priority: CachePriority;
    preloadCommonCities: boolean;
  };
  poiSearch: {
    baseTTL: number;
    priority: CachePriority;
    categorySpecificTTL: Record<string, number>;
  };
  routePlanning: {
    baseTTL: number;
    priority: CachePriority;
    trafficAwareTTL: boolean;
  };
  weather: {
    baseTTL: number;
    priority: CachePriority;
    locationSpecificTTL: boolean;
  };
}

// ============= 缓存策略实现 =============

/**
 * 地理编码缓存策略
 * 特点：地址相对稳定，可以长时间缓存
 */
export class GeocodingCacheStrategy implements CacheStrategy {
  name = 'geocoding_strategy';
  description = '地理编码专用缓存策略，针对地址稳定性优化';

  isApplicable(context: CacheStrategyContext): boolean {
    return context.requestType === 'geocoding' || context.requestType === 'reverse_geocoding';
  }

  createCacheContext(request: { address?: string; location?: string }): CacheContext {
    // 热门城市和地标使用更高优先级
    const isPopularLocation = this.isPopularLocation(request.address || request.location || '');
    
    return {
      type: request.address ? 'geocoding' : 'reverse_geocoding',
      serviceQuality: this.getDefaultQuality(),
      priority: isPopularLocation ? 'high' : 'medium',
      region: this.extractRegion(request.address || request.location || '')
    };
  }

  getPrewarmKeys(): string[] {
    // 预热热门城市和地标
    return [
      'geocoding:北京市',
      'geocoding:上海市',
      'geocoding:广州市',
      'geocoding:深圳市',
      'geocoding:杭州市',
      'geocoding:南京市',
      'geocoding:成都市',
      'geocoding:西安市',
      'geocoding:天安门广场',
      'geocoding:外滩',
      'geocoding:西湖'
    ];
  }

  private isPopularLocation(location: string): boolean {
    const popularKeywords = ['北京', '上海', '广州', '深圳', '杭州', '天安门', '外滩', '西湖'];
    return popularKeywords.some(keyword => location.includes(keyword));
  }

  private extractRegion(location: string): string {
    // 简化的地区提取逻辑
    if (location.includes('北京')) return 'beijing';
    if (location.includes('上海')) return 'shanghai';
    if (location.includes('广州') || location.includes('深圳')) return 'guangdong';
    return 'other';
  }

  private getDefaultQuality() {
    return {
      service: 'amap',
      responseTime: 1000,
      successRate: 0.95,
      availability: true,
      score: 0.9,
      timestamp: Date.now()
    };
  }
}

/**
 * POI搜索缓存策略
 * 特点：基于类别和时间的动态缓存
 */
export class POISearchCacheStrategy implements CacheStrategy {
  name = 'poi_search_strategy';
  description = 'POI搜索专用缓存策略，基于类别和时间动态调整';

  isApplicable(context: CacheStrategyContext): boolean {
    return context.requestType === 'poi_search';
  }

  createCacheContext(request: { category: string; location: string; radius?: number }): CacheContext {
    const priority = this.getCategoryPriority(request.category);
    const isTimesensitive = this.isTimeSensitiveCategory(request.category);
    
    return {
      type: 'poi_search',
      serviceQuality: this.getDefaultQuality(),
      priority,
      region: this.extractRegion(request.location)
    };
  }

  private getCategoryPriority(category: string): CachePriority {
    const highPriorityCategories = ['景点', '酒店', '餐厅', '购物'];
    const mediumPriorityCategories = ['加油站', '银行', '医院'];
    
    if (highPriorityCategories.includes(category)) return 'high';
    if (mediumPriorityCategories.includes(category)) return 'medium';
    return 'low';
  }

  private isTimeSensitiveCategory(category: string): boolean {
    const timeSensitiveCategories = ['餐厅', '娱乐', '购物'];
    return timeSensitiveCategories.includes(category);
  }

  private extractRegion(location: string): string {
    if (location.includes('北京')) return 'beijing';
    if (location.includes('上海')) return 'shanghai';
    if (location.includes('广州') || location.includes('深圳')) return 'guangdong';
    return 'other';
  }

  private getDefaultQuality() {
    return {
      service: 'amap',
      responseTime: 1500,
      successRate: 0.92,
      availability: true,
      score: 0.85,
      timestamp: Date.now()
    };
  }
}

/**
 * 路线规划缓存策略
 * 特点：考虑交通状况的短期缓存
 */
export class RoutePlanningCacheStrategy implements CacheStrategy {
  name = 'route_planning_strategy';
  description = '路线规划专用缓存策略，考虑交通状况动态调整';

  isApplicable(context: CacheStrategyContext): boolean {
    return context.requestType === 'route_planning';
  }

  createCacheContext(request: { origin: string; destination: string; mode: string }): CacheContext {
    const isRushHour = this.isRushHour();
    const priority = isRushHour ? 'medium' : 'high'; // 高峰期降低优先级，因为变化快
    
    return {
      type: 'route_planning',
      serviceQuality: this.getDefaultQuality(),
      priority,
      region: this.extractRegion(request.origin, request.destination)
    };
  }

  private isRushHour(): boolean {
    const hour = new Date().getHours();
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  }

  private extractRegion(origin: string, destination: string): string {
    // 基于起点和终点确定区域
    const locations = [origin, destination];
    
    if (locations.some(loc => loc.includes('北京'))) return 'beijing';
    if (locations.some(loc => loc.includes('上海'))) return 'shanghai';
    if (locations.some(loc => loc.includes('广州') || loc.includes('深圳'))) return 'guangdong';
    return 'other';
  }

  private getDefaultQuality() {
    return {
      service: 'amap',
      responseTime: 2000,
      successRate: 0.88,
      availability: true,
      score: 0.8,
      timestamp: Date.now()
    };
  }
}

/**
 * 天气缓存策略
 * 特点：基于时间和地理位置的缓存
 */
export class WeatherCacheStrategy implements CacheStrategy {
  name = 'weather_strategy';
  description = '天气数据专用缓存策略，基于时间和位置优化';

  isApplicable(context: CacheStrategyContext): boolean {
    return context.requestType === 'weather';
  }

  createCacheContext(request: { location: string; type: 'current' | 'forecast' }): CacheContext {
    const priority = request.type === 'current' ? 'high' : 'medium';
    
    return {
      type: 'weather',
      serviceQuality: this.getDefaultQuality(),
      priority,
      region: this.extractRegion(request.location)
    };
  }

  private extractRegion(location: string): string {
    if (location.includes('北京')) return 'beijing';
    if (location.includes('上海')) return 'shanghai';
    if (location.includes('广州') || location.includes('深圳')) return 'guangdong';
    return 'other';
  }

  private getDefaultQuality() {
    return {
      service: 'amap',
      responseTime: 800,
      successRate: 0.96,
      availability: true,
      score: 0.92,
      timestamp: Date.now()
    };
  }
}

// ============= 缓存策略工厂 =============

export class CacheStrategyFactory {
  private strategies: CacheStrategy[] = [];
  private cacheManager: IntelligentCacheManager;
  private qualityMonitor: ServiceQualityMonitor;

  constructor(
    cacheManager: IntelligentCacheManager,
    qualityMonitor: ServiceQualityMonitor
  ) {
    this.cacheManager = cacheManager;
    this.qualityMonitor = qualityMonitor;
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies = [
      new GeocodingCacheStrategy(),
      new POISearchCacheStrategy(),
      new RoutePlanningCacheStrategy(),
      new WeatherCacheStrategy()
    ];
  }

  /**
   * 根据请求上下文选择最适合的缓存策略
   */
  selectStrategy(context: CacheStrategyContext): CacheStrategy | null {
    return this.strategies.find(strategy => strategy.isApplicable(context)) || null;
  }

  /**
   * 创建优化的缓存上下文
   */
  async createOptimizedCacheContext(
    requestType: string,
    request: any,
    userContext?: Partial<CacheStrategyContext>
  ): Promise<CacheContext> {
    
    const strategyContext: CacheStrategyContext = {
      requestType,
      userType: userContext?.userType || 'anonymous',
      region: userContext?.region || 'other',
      timeOfDay: this.getTimeOfDay(),
      isWeekend: this.isWeekend(),
      urgency: userContext?.urgency || 'medium'
    };

    const strategy = this.selectStrategy(strategyContext);
    if (!strategy) {
      // 默认缓存上下文
      return {
        type: requestType as CacheType,
        serviceQuality: {
          service: 'amap',
          responseTime: 1000,
          successRate: 0.95,
          availability: true,
          score: this.qualityMonitor.getAverageQualityScore('amap'),
          timestamp: Date.now()
        },
        priority: 'medium'
      };
    }

    const cacheContext = strategy.createCacheContext(request);
    
    // 使用实时服务质量数据
    cacheContext.serviceQuality = {
      service: 'amap',
      responseTime: 1000,
      successRate: 0.95,
      availability: true,
      score: this.qualityMonitor.getAverageQualityScore('amap'),
      timestamp: Date.now()
    };
    
    return cacheContext;
  }

  /**
   * 执行缓存预热
   */
  async performCacheWarmup(): Promise<void> {
    console.log('开始执行缓存预热...');
    
    const warmupTasks = this.strategies
      .filter(strategy => strategy.getPrewarmKeys)
      .map(async (strategy) => {
        const keys = strategy.getPrewarmKeys!();
        console.log(`预热策略 ${strategy.name}: ${keys.length} 个条目`);
        
        // 这里应该调用实际的数据获取函数
        // 为了演示，我们使用模拟数据
        const computeFns = keys.map(() => async () => ({ mock: 'data' }));
        const contexts = keys.map(() => ({
          type: 'geocoding' as CacheType,
          serviceQuality: {
            service: 'amap',
            responseTime: 1000,
            successRate: 0.95,
            availability: true,
            score: 0.9,
            timestamp: Date.now()
          },
          priority: 'medium' as CachePriority
        }));
        
        await this.cacheManager.warmup(keys, computeFns, contexts);
      });

    await Promise.all(warmupTasks);
    console.log('缓存预热完成');
  }

  /**
   * 获取缓存配置建议
   */
  getCacheConfigRecommendations(): GeoServiceCacheConfig {
    return {
      geocoding: {
        baseTTL: 1800000, // 30分钟
        priority: 'high',
        preloadCommonCities: true
      },
      poiSearch: {
        baseTTL: 900000, // 15分钟
        priority: 'medium',
        categorySpecificTTL: {
          '景点': 3600000,    // 1小时
          '餐厅': 600000,     // 10分钟
          '酒店': 1800000,    // 30分钟
          '购物': 900000      // 15分钟
        }
      },
      routePlanning: {
        baseTTL: 600000, // 10分钟
        priority: 'medium',
        trafficAwareTTL: true
      },
      weather: {
        baseTTL: 300000, // 5分钟
        priority: 'high',
        locationSpecificTTL: true
      }
    };
  }

  // ============= 辅助方法 =============

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  /**
   * 获取策略统计信息
   */
  getStrategyStats(): Array<{ name: string; description: string; applicable: boolean }> {
    const mockContext: CacheStrategyContext = {
      requestType: 'test',
      userType: 'anonymous',
      region: 'other',
      timeOfDay: this.getTimeOfDay(),
      isWeekend: this.isWeekend(),
      urgency: 'medium'
    };

    return this.strategies.map(strategy => ({
      name: strategy.name,
      description: strategy.description,
      applicable: strategy.isApplicable(mockContext)
    }));
  }
}

export default CacheStrategyFactory;
