/**
 * 时间线解析服务
 * 提供统一的解析接口，支持特性开关和向后兼容
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { RobustTimelineParser } from './robust-timeline-parser';
import { TimelineActivityParser } from './timeline-activity-parser';

// 简单的LRU缓存实现
interface CacheEntry {
  data: TimelineActivity[];
  timestamp: number;
  warnings?: string[];
}

class SimpleLRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number; // 生存时间（毫秒）

  constructor(maxSize = 100, ttlHours = 24) {
    this.maxSize = maxSize;
    this.ttl = ttlHours * 60 * 60 * 1000; // 转换为毫秒
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 重新插入到末尾
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  set(key: string, data: TimelineActivity[], warnings?: string[]): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      warnings
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 清理过期条目
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export class TimelineParsingService {
  private robustParser: RobustTimelineParser;
  private syncParser: TimelineActivityParser;
  private cache: SimpleLRUCache;

  constructor() {
    this.robustParser = new RobustTimelineParser();
    this.syncParser = new TimelineActivityParser();
    this.cache = new SimpleLRUCache(100, 24); // 100个条目，24小时TTL
  }

  /**
   * 解析时间线活动
   * 主要入口方法，支持特性开关和缓存
   */
  async parseTimeline(
    content: string,
    context: ParsingContext
  ): Promise<ParseResult<TimelineActivity[]>> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(content, context);

    // 尝试从缓存获取
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry) {
      console.log('🎯 缓存命中，直接返回缓存结果');
      return ParseResult.success(cachedEntry.data, [
        ...(cachedEntry.warnings || []),
        '使用了缓存结果'
      ]);
    }

    // 检查特性开关
    const useNewParser = process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER === 'true';

    let result: ParseResult<TimelineActivity[]>;

    if (useNewParser) {
      console.log('🚀 使用新的时间线解析器');
      result = await this.robustParser.parse(content, context);
    } else {
      console.log('📝 使用传统解析方式（兼容模式）');
      // 在兼容模式下，我们仍然使用新解析器，但不显示新功能的日志
      result = await this.robustParser.parse(content, context);
    }

    // 如果解析成功，缓存结果
    if (result.success && result.data) {
      this.cache.set(cacheKey, result.data, result.warnings);
      console.log('💾 解析结果已缓存');
    }

    return result;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(content: string, context: ParsingContext): string {
    // 使用内容哈希和上下文信息生成缓存键
    const contentHash = this.simpleHash(content);
    const contextStr = JSON.stringify({
      destination: context.destination,
      // 只包含影响解析结果的上下文字段
    });
    return `${contentHash}_${this.simpleHash(contextStr)}`;
  }

  /**
   * 简单的字符串哈希函数
   */
  private simpleHash(str: string | null | undefined): string {
    if (!str) return '0';

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 向后兼容的解析方法
   * 保持与原始parseTimelineActivities函数相同的签名
   * 注意：这是一个同步方法，但内部使用异步解析器，所以可能不会返回最佳结果
   */
  parseTimelineActivities(
    dayContent: string,
    destination: string
  ): TimelineActivity[] {
    const context: ParsingContext = { destination };

    try {
      // 使用同步解析器保持向后兼容
      const result = this.syncParser.parse(dayContent, context);

      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('解析失败，返回空数组:', result.errors);
        return [];
      }
    } catch (error) {
      console.error('解析过程中发生错误:', error);
      return [];
    }
  }

  /**
   * 获取解析器统计信息（用于监控和调试）
   */
  getParserStats() {
    return this.robustParser.getParserStats();
  }

  /**
   * 测试解析器能力（用于调试）
   */
  testParsers(content: string) {
    return this.robustParser.testParsers(content);
  }

  /**
   * 缓存管理方法
   */

  // 清空缓存
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ 缓存已清空');
  }

  // 获取缓存统计信息
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: 100 // 从构造函数中获取
    };
  }

  // 清理过期缓存条目
  cleanupCache(): void {
    this.cache.cleanup();
    console.log('🧹 过期缓存条目已清理');
  }

  // 预热缓存（可选）
  async warmupCache(commonContents: Array<{ content: string; context: ParsingContext }>): Promise<void> {
    console.log('🔥 开始预热缓存...');

    for (const { content, context } of commonContents) {
      try {
        await this.parseTimeline(content, context);
      } catch (error) {
        console.warn('预热缓存时出错:', error);
      }
    }

    console.log(`🎯 缓存预热完成，当前缓存大小: ${this.cache.size()}`);
  }
}
