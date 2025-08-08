/**
 * 智游助手v6.2 - 智能缓存管理器
 * 遵循原则: [第一性原理] + [为失败而设计] + [高内聚低耦合]
 * 
 * 核心功能:
 * 1. 基于服务质量的动态TTL算法
 * 2. 多层级缓存策略
 * 3. 并行数据收集优化
 * 4. 智能缓存失效和预热
 */

import { ServiceQualityMonitor } from '@/lib/geo/quality-monitor';
import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';

// ============= 缓存接口定义 =============

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  quality: number;
  accessCount: number;
  lastAccessed: number;
  source: string;
  checksum?: string;
}

export interface CacheContext {
  type: CacheType;
  serviceQuality: ServiceQualityData;
  priority: CachePriority;
  region?: string;
  userId?: string;
}

export interface ServiceQualityData {
  service: string;
  responseTime: number;
  successRate: number;
  availability: boolean;
  score: number;
  timestamp: number;
}

export type CacheType = 
  | 'geocoding' 
  | 'reverse_geocoding'
  | 'poi_search' 
  | 'route_planning' 
  | 'weather' 
  | 'traffic';

export type CachePriority = 'low' | 'medium' | 'high' | 'critical';

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  cacheSize: number;
  evictionCount: number;
}

// ============= 智能缓存管理器实现 =============

export class IntelligentCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private qualityMonitor: ServiceQualityMonitor;
  private metrics: CacheMetrics;
  private maxCacheSize: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    qualityMonitor: ServiceQualityMonitor,
    maxCacheSize: number = 10000
  ) {
    this.qualityMonitor = qualityMonitor;
    this.maxCacheSize = maxCacheSize;
    this.metrics = this.initializeMetrics();
    this.startCleanupScheduler();
  }

  // ============= 核心缓存方法 =============

  /**
   * 获取或计算缓存数据
   * 遵循原则: [第一性原理] - 基于数据价值和质量决定缓存策略
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    context: CacheContext
  ): Promise<T> {
    const startTime = Date.now();
    
    // 1. 尝试从缓存获取
    const cached = this.getFromCache<T>(key);
    if (cached && !this.isExpired(cached, context)) {
      this.updateAccessMetrics(cached, true);
      this.recordMetrics(Date.now() - startTime, true);
      return cached.data;
    }

    // 2. 缓存未命中，计算新值
    try {
      const computeStartTime = Date.now();
      const data = await computeFn();
      const computeTime = Date.now() - computeStartTime;

      // 3. 基于服务质量动态计算TTL
      const ttl = await this.calculateDynamicTTL(context, computeTime);
      
      // 4. 存储到缓存
      await this.setCache(key, data, context, ttl, computeTime);
      
      this.recordMetrics(Date.now() - startTime, false);
      return data;

    } catch (error) {
      // 5. 计算失败时的降级策略
      const fallbackData = this.getFallbackData<T>(key, context);
      if (fallbackData) {
        console.warn(`缓存计算失败，使用降级数据: ${error}`);
        return fallbackData;
      }
      throw error;
    }
  }

  /**
   * 并行数据收集优化
   * 遵循原则: [为失败而设计] - 部分失败不影响整体结果
   */
  async getMultiple<T>(
    requests: Array<{
      key: string;
      computeFn: () => Promise<T>;
      context: CacheContext;
    }>
  ): Promise<Array<{ key: string; data: T; fromCache: boolean }>> {
    
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const startTime = Date.now();
        const cached = this.getFromCache<T>(request.key);
        
        if (cached && !this.isExpired(cached, request.context)) {
          return {
            key: request.key,
            data: cached.data,
            fromCache: true,
            responseTime: Date.now() - startTime
          };
        }

        // 并行计算未缓存的数据
        const data = await request.computeFn();
        const computeTime = Date.now() - startTime;
        
        const ttl = await this.calculateDynamicTTL(request.context, computeTime);
        await this.setCache(request.key, data, request.context, ttl, computeTime);
        
        return {
          key: request.key,
          data,
          fromCache: false,
          responseTime: computeTime
        };
      })
    );

    // 处理结果，即使部分失败也返回成功的数据
    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  // ============= 动态TTL算法 =============

  /**
   * 基于服务质量的动态TTL计算
   * 遵循原则: [第一性原理] - 高质量数据缓存更久，低质量数据缓存时间短
   */
  private async calculateDynamicTTL(
    context: CacheContext,
    computeTime: number
  ): Promise<number> {
    
    const qualityScore = context.serviceQuality.score;
    const responseTime = context.serviceQuality.responseTime;
    const successRate = context.serviceQuality.successRate;

    // 基础TTL配置（毫秒）
    const baseTTLConfig = {
      geocoding: 1800000,      // 30分钟
      reverse_geocoding: 3600000, // 1小时
      poi_search: 900000,      // 15分钟
      route_planning: 600000,  // 10分钟
      weather: 300000,         // 5分钟
      traffic: 180000          // 3分钟
    };

    const baseTTL = baseTTLConfig[context.type] || 600000;

    // 质量因子 (0.1 - 2.0)
    const qualityMultiplier = Math.max(0.1, Math.min(2.0, qualityScore * 2));
    
    // 响应时间因子 (0.5 - 1.5)
    const responseTimeMultiplier = responseTime < 1000 ? 1.5 : 
                                  responseTime < 3000 ? 1.0 : 0.5;
    
    // 成功率因子 (0.2 - 1.2)
    const successRateMultiplier = Math.max(0.2, successRate * 1.2);
    
    // 计算时间因子 (1.0 - 2.0) - 计算越耗时，缓存越久
    const computeTimeMultiplier = Math.min(2.0, 1.0 + (computeTime / 5000));
    
    // 优先级因子
    const priorityMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0
    }[context.priority];

    const finalTTL = baseTTL * 
                    qualityMultiplier * 
                    responseTimeMultiplier * 
                    successRateMultiplier * 
                    computeTimeMultiplier * 
                    priorityMultiplier;

    // 确保TTL在合理范围内
    return Math.max(60000, Math.min(7200000, finalTTL)); // 1分钟到2小时
  }

  // ============= 缓存操作方法 =============

  private getFromCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry as CacheEntry<T>;
    }
    return null;
  }

  private async setCache<T>(
    key: string,
    data: T,
    context: CacheContext,
    ttl: number,
    computeTime: number
  ): Promise<void> {
    
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLeastValuable();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      quality: context.serviceQuality.score,
      accessCount: 1,
      lastAccessed: Date.now(),
      source: context.serviceQuality.service,
      checksum: this.calculateChecksum(data)
    };

    this.cache.set(key, entry);
  }

  private isExpired(entry: CacheEntry, context: CacheContext): boolean {
    const age = Date.now() - entry.timestamp;
    
    // 基于当前服务质量调整过期判断
    const currentQuality = context.serviceQuality.score;
    const qualityDelta = Math.abs(currentQuality - entry.quality);
    
    // 如果服务质量变化较大，提前过期
    if (qualityDelta > 0.3) {
      return age > (entry.ttl * 0.5);
    }
    
    return age > entry.ttl;
  }

  // ============= 缓存清理和优化 =============

  private async evictLeastValuable(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // 计算每个条目的价值分数
    const scoredEntries = entries.map(([key, entry]) => ({
      key,
      entry,
      score: this.calculateValueScore(entry)
    }));

    // 按价值分数排序，移除价值最低的条目
    scoredEntries.sort((a, b) => a.score - b.score);
    const toEvict = scoredEntries.slice(0, Math.floor(this.maxCacheSize * 0.1));

    toEvict.forEach(({ key }) => {
      this.cache.delete(key);
      this.metrics.evictionCount++;
    });
  }

  private calculateValueScore(entry: CacheEntry): number {
    const age = Date.now() - entry.timestamp;
    const accessFrequency = entry.accessCount / Math.max(1, age / 3600000); // 每小时访问次数
    const recency = 1 / (1 + age / 3600000); // 最近访问权重
    const quality = entry.quality;
    
    return accessFrequency * 0.4 + recency * 0.3 + quality * 0.3;
  }

  private getFallbackData<T>(key: string, context: CacheContext): T | null {
    // 查找过期但仍可用的数据作为降级方案
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < (entry.ttl * 2)) {
      console.warn(`使用过期缓存数据作为降级方案: ${key}`);
      return entry.data as T;
    }
    return null;
  }

  // ============= 指标和监控 =============

  private initializeMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      evictionCount: 0
    };
  }

  private updateAccessMetrics(entry: CacheEntry, isHit: boolean): void {
    this.metrics.totalRequests++;
    
    if (isHit) {
      this.metrics.totalHits++;
    } else {
      this.metrics.totalMisses++;
    }
    
    this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests;
    this.metrics.missRate = this.metrics.totalMisses / this.metrics.totalRequests;
    this.metrics.cacheSize = this.cache.size;
  }

  private recordMetrics(responseTime: number, isHit: boolean): void {
    this.updateAccessMetrics({} as CacheEntry, isHit);
    
    // 更新平均响应时间
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private startCleanupScheduler(): void {
    // 每5分钟清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期缓存条目`);
    }
  }

  // ============= 公共接口方法 =============

  /**
   * 获取缓存指标
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.metrics = this.initializeMetrics();
  }

  /**
   * 预热缓存
   */
  async warmup(keys: string[], computeFns: (() => Promise<any>)[], contexts: CacheContext[]): Promise<void> {
    const warmupRequests = keys.map((key, index) => ({
      key,
      computeFn: computeFns[index] || (() => Promise.resolve(null)),
      context: contexts[index] || {
        type: 'geocoding',
        requestType: 'warmup',
        priority: 'low',
        userContext: {},
        serviceQuality: {
          service: 'default',
          responseTime: 1000,
          successRate: 1.0,
          availability: true,
          score: 1.0,
          timestamp: Date.now()
        }
      }
    }));

    await this.getMultiple(warmupRequests);
    console.log(`缓存预热完成，预热了 ${keys.length} 个条目`);
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export default IntelligentCacheManager;
