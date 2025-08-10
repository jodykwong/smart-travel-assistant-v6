/**
 * 智游助手v6.0 - 缓存服务
 * 提供多层缓存机制，支持内存缓存和Redis缓存
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number;
  maxMemoryItems: number;
  enableRedis: boolean;
  redisUrl?: string;
}

class CacheService {
  private memoryCache: Map<string, CacheItem<any>>;
  private config: CacheConfig;
  private redis: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 3600, // 1小时
      maxMemoryItems: 1000,
      enableRedis: process.env.CACHE_ENABLED === 'true',
      redisUrl: process.env.REDIS_URL,
      ...config,
    };

    this.memoryCache = new Map();
    this.initializeRedis();
    this.startCleanupTimer();
  }

  private async initializeRedis() {
    if (!this.config.enableRedis || !this.config.redisUrl) {
      console.log('📦 缓存服务启动 (仅内存模式)');
      return;
    }

    try {
      // 动态导入Redis，避免在没有Redis时报错
      const Redis = await import('ioredis');
      this.redis = new Redis.default(this.config.redisUrl);
      
      await this.redis.ping();
      console.log('📦 缓存服务启动 (Redis + 内存模式)');
    } catch (error) {
      console.warn('⚠️ Redis连接失败，使用内存缓存:', error.message);
      this.redis = null;
    }
  }

  private startCleanupTimer() {
    // 每5分钟清理过期的内存缓存
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl * 1000) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // 如果内存缓存项目过多，删除最旧的项目
    if (this.memoryCache.size > this.config.maxMemoryItems) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - this.config.maxMemoryItems);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
      cleanedCount += toDelete.length;
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  private generateKey(prefix: string, params: any): string {
    const paramStr = typeof params === 'string' ? params : JSON.stringify(params);
    return `${prefix}:${Buffer.from(paramStr).toString('base64').slice(0, 32)}`;
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. 先检查内存缓存
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      const now = Date.now();
      if (now - memoryItem.timestamp < memoryItem.ttl * 1000) {
        return memoryItem.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. 检查Redis缓存
    if (this.redis) {
      try {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const parsed = JSON.parse(redisData);
          
          // 将Redis数据同步到内存缓存
          this.memoryCache.set(key, {
            data: parsed,
            timestamp: Date.now(),
            ttl: this.config.defaultTTL,
          });
          
          return parsed as T;
        }
      } catch (error) {
        console.warn('⚠️ Redis读取失败:', error.message);
      }
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl: number = this.config.defaultTTL): Promise<void> {
    const now = Date.now();

    // 1. 设置内存缓存
    this.memoryCache.set(key, {
      data,
      timestamp: now,
      ttl,
    });

    // 2. 设置Redis缓存
    if (this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(data));
      } catch (error) {
        console.warn('⚠️ Redis写入失败:', error.message);
      }
    }
  }

  async delete(key: string): Promise<void> {
    // 删除内存缓存
    this.memoryCache.delete(key);

    // 删除Redis缓存
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn('⚠️ Redis删除失败:', error.message);
      }
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      // 清理匹配模式的缓存
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      if (this.redis) {
        try {
          const keys = await this.redis.keys(`*${pattern}*`);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } catch (error) {
          console.warn('⚠️ Redis批量删除失败:', error.message);
        }
      }
    } else {
      // 清理所有缓存
      this.memoryCache.clear();
      
      if (this.redis) {
        try {
          await this.redis.flushdb();
        } catch (error) {
          console.warn('⚠️ Redis清空失败:', error.message);
        }
      }
    }
  }

  // 专用缓存方法
  async cacheApiResponse<T>(
    apiName: string, 
    params: any, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const key = this.generateKey(`api:${apiName}`, params);
    
    // 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached) {
      console.log(`🎯 缓存命中: ${apiName}`);
      return cached;
    }

    // 缓存未命中，调用API
    console.log(`🌐 API调用: ${apiName}`);
    const result = await fetcher();
    
    // 存储到缓存
    await this.set(key, result, ttl);
    
    return result;
  }

  // 获取缓存统计信息
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.config.maxMemoryItems,
      redisEnabled: !!this.redis,
      config: this.config,
    };
  }
}

// 单例模式
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

export { CacheService };
