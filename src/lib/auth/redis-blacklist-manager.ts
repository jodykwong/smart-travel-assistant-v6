/**
 * 智游助手v6.2 - Redis JWT黑名单管理器
 * 解决内存泄漏问题，提供分布式黑名单管理
 */

import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

export interface BlacklistManager {
  isBlacklisted(token: string): Promise<boolean>;
  addToBlacklist(token: string): Promise<void>;
  removeFromBlacklist(token: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Redis黑名单管理器
 * 使用Redis存储黑名单，自动TTL过期
 */
export class RedisBlacklistManager implements BlacklistManager {
  private redis: Redis;
  private keyPrefix = 'jwt_blacklist:';

  constructor(redisUrl?: string) {
    if (redisUrl || process.env.REDIS_URL) {
      this.redis = new Redis(redisUrl || process.env.REDIS_URL!);
      console.log('✅ Redis黑名单管理器已启用');
    } else {
      // 如果没有Redis，回退到内存管理器
      throw new Error('Redis URL未配置，无法启用Redis黑名单管理器');
    }
  }

  /**
   * 检查token是否在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = this.getRedisKey(token);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ 检查黑名单失败:', error);
      // 安全起见，如果Redis出错，假设token有效
      return false;
    }
  }

  /**
   * 将token添加到黑名单
   * 自动设置TTL为token的剩余有效期
   */
  async addToBlacklist(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        console.warn('⚠️ 无法解析token过期时间，使用默认TTL');
        const key = this.getRedisKey(token);
        await this.redis.setex(key, 3600, '1'); // 默认1小时
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      if (expiresIn > 0) {
        const key = this.getRedisKey(token);
        await this.redis.setex(key, expiresIn, '1');
        console.log(`✅ Token已加入黑名单，TTL: ${expiresIn}秒`);
      } else {
        console.log('⚠️ Token已过期，无需加入黑名单');
      }
    } catch (error) {
      console.error('❌ 添加到黑名单失败:', error);
      throw new Error('添加到黑名单失败');
    }
  }

  /**
   * 从黑名单中移除token（通常不需要，因为有TTL）
   */
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      const key = this.getRedisKey(token);
      await this.redis.del(key);
      console.log('✅ Token已从黑名单移除');
    } catch (error) {
      console.error('❌ 从黑名单移除失败:', error);
      throw new Error('从黑名单移除失败');
    }
  }

  /**
   * 清理过期的黑名单条目（Redis TTL自动处理，此方法用于统计）
   */
  async cleanup(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      console.log(`📊 当前黑名单条目数: ${keys.length}`);
      
      // Redis TTL会自动清理过期条目，这里只做统计
      if (keys.length > 50000) {
        console.warn('⚠️ 黑名单条目过多，建议检查token过期策略');
      }
    } catch (error) {
      console.error('❌ 黑名单清理检查失败:', error);
    }
  }

  /**
   * 生成Redis键名
   */
  private getRedisKey(token: string): string {
    // 使用token的哈希值作为键，避免存储完整token
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `${this.keyPrefix}${hash}`;
  }

  /**
   * 关闭Redis连接
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      console.log('✅ Redis连接已关闭');
    }
  }

  /**
   * 获取黑名单统计信息
   */
  async getStats(): Promise<{
    totalEntries: number;
    memoryUsage: string;
  }> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      const memoryUsage = await this.redis.memory('USAGE', pattern);
      
      return {
        totalEntries: keys.length,
        memoryUsage: `${Math.round((memoryUsage || 0) / 1024)} KB`
      };
    } catch (error) {
      console.error('❌ 获取黑名单统计失败:', error);
      return {
        totalEntries: 0,
        memoryUsage: '未知'
      };
    }
  }
}

/**
 * 内存黑名单管理器（回退方案）
 * 仅在Redis不可用时使用
 */
export class MemoryBlacklistManager implements BlacklistManager {
  private blacklistedTokens: Map<string, number> = new Map();
  private maxSize = 10000;

  async isBlacklisted(token: string): Promise<boolean> {
    const expiry = this.blacklistedTokens.get(token);
    if (!expiry) return false;
    
    if (Date.now() > expiry) {
      this.blacklistedTokens.delete(token);
      return false;
    }
    
    return true;
  }

  async addToBlacklist(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      const expiry = decoded?.exp ? decoded.exp * 1000 : Date.now() + 3600000; // 默认1小时
      
      // 防止内存泄漏
      if (this.blacklistedTokens.size >= this.maxSize) {
        await this.cleanup();
      }
      
      this.blacklistedTokens.set(token, expiry);
      console.log('✅ Token已加入内存黑名单');
    } catch (error) {
      console.error('❌ 添加到内存黑名单失败:', error);
      throw new Error('添加到黑名单失败');
    }
  }

  async removeFromBlacklist(token: string): Promise<void> {
    this.blacklistedTokens.delete(token);
    console.log('✅ Token已从内存黑名单移除');
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, expiry] of this.blacklistedTokens.entries()) {
      if (now > expiry) {
        this.blacklistedTokens.delete(token);
        cleanedCount++;
      }
    }
    
    console.log(`✅ 内存黑名单清理完成，移除 ${cleanedCount} 个过期条目`);
  }
}

/**
 * 创建黑名单管理器
 * 优先使用Redis，回退到内存管理器
 */
export function createBlacklistManager(): BlacklistManager {
  try {
    if (process.env.REDIS_URL) {
      return new RedisBlacklistManager();
    } else {
      console.warn('⚠️ Redis未配置，使用内存黑名单管理器（不推荐生产环境）');
      return new MemoryBlacklistManager();
    }
  } catch (error) {
    console.error('❌ 创建Redis黑名单管理器失败，回退到内存管理器:', error);
    return new MemoryBlacklistManager();
  }
}
