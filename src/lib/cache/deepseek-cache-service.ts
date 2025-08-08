/**
 * 智游助手v6.0 - DeepSeek API缓存服务
 * 为DeepSeek LLM API提供智能缓存机制
 */

import { getCacheService } from './cache-service';
import crypto from 'crypto';

interface DeepSeekRequest {
  model: string;
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: any[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface CacheConfig {
  planningTTL: number;      // 规划结果缓存时间
  commonQueryTTL: number;   // 常见查询缓存时间
  complexityTTL: number;    // 复杂度分析缓存时间
  enableSemanticCache: boolean; // 是否启用语义缓存
}

class DeepSeekCacheService {
  private cacheService = getCacheService();
  private config: CacheConfig;

  constructor() {
    this.config = {
      planningTTL: parseInt(process.env.CACHE_TTL_PLANNING || '86400'), // 24小时
      commonQueryTTL: parseInt(process.env.CACHE_TTL_COMMON_QUERY || '3600'), // 1小时
      complexityTTL: parseInt(process.env.CACHE_TTL_COMPLEXITY || '7200'), // 2小时
      enableSemanticCache: process.env.ENABLE_SEMANTIC_CACHE === 'true',
    };
  }

  /**
   * 生成请求的缓存键
   */
  private generateCacheKey(request: DeepSeekRequest, type: string): string {
    // 对于规划请求，使用语义化的键
    if (type === 'planning') {
      const planningInfo = this.extractPlanningInfo(request);
      return `deepseek:planning:${planningInfo}`;
    }

    // 对于其他请求，使用消息内容的哈希
    const messageContent = request.messages.map(m => m.content).join('|');
    const hash = crypto.createHash('md5').update(messageContent).digest('hex');
    return `deepseek:${type}:${hash}`;
  }

  /**
   * 从请求中提取规划信息用于缓存键
   */
  private extractPlanningInfo(request: DeepSeekRequest): string {
    const content = request.messages.map(m => m.content).join(' ');
    
    // 提取关键信息
    const destination = this.extractDestination(content);
    const days = this.extractDays(content);
    const budget = this.extractBudget(content);
    const style = this.extractTravelStyle(content);
    
    return `${destination}_${days}d_${budget}_${style}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  private extractDestination(content: string): string {
    // 简单的目的地提取逻辑
    const destinations = ['新疆', '北京', '上海', '广州', '深圳', '杭州', '成都', '西安', '重庆'];
    for (const dest of destinations) {
      if (content.includes(dest)) {
        return dest;
      }
    }
    return 'unknown';
  }

  private extractDays(content: string): number {
    const dayMatch = content.match(/(\d+)\s*天/);
    return dayMatch ? parseInt(dayMatch[1] || '0') : 0;
  }

  private extractBudget(content: string): string {
    if (content.includes('豪华') || content.includes('奢华')) return 'luxury';
    if (content.includes('经济') || content.includes('便宜')) return 'budget';
    return 'medium';
  }

  private extractTravelStyle(content: string): string {
    const styles = [];
    if (content.includes('冒险') || content.includes('探索')) styles.push('adventure');
    if (content.includes('文化') || content.includes('历史')) styles.push('culture');
    if (content.includes('自然') || content.includes('风光')) styles.push('nature');
    if (content.includes('美食')) styles.push('food');
    return styles.join('_') || 'general';
  }

  /**
   * 检查是否应该缓存此请求
   */
  private shouldCache(request: DeepSeekRequest, type: string): boolean {
    // 流式请求不缓存
    if (request.stream) {
      return false;
    }

    // 温度过高的请求不缓存（创造性太强）
    if (request.temperature && request.temperature > 0.7) {
      return false;
    }

    // 规划请求总是缓存
    if (type === 'planning') {
      return true;
    }

    // 其他类型根据配置决定
    return true;
  }

  /**
   * 缓存旅游规划请求
   */
  async cachePlanningRequest(request: DeepSeekRequest): Promise<DeepSeekResponse | null> {
    if (!this.shouldCache(request, 'planning')) {
      return null;
    }

    const cacheKey = this.generateCacheKey(request, 'planning');
    
    return this.cacheService.cacheApiResponse(
      'deepseek_planning',
      cacheKey,
      async () => {
        return this.callDeepSeekAPI(request);
      },
      this.config.planningTTL
    );
  }

  /**
   * 缓存复杂度分析请求
   */
  async cacheComplexityAnalysis(request: DeepSeekRequest): Promise<DeepSeekResponse | null> {
    if (!this.shouldCache(request, 'complexity')) {
      return null;
    }

    const cacheKey = this.generateCacheKey(request, 'complexity');
    
    return this.cacheService.cacheApiResponse(
      'deepseek_complexity',
      cacheKey,
      async () => {
        return this.callDeepSeekAPI(request);
      },
      this.config.complexityTTL
    );
  }

  /**
   * 缓存常见查询请求
   */
  async cacheCommonQuery(request: DeepSeekRequest): Promise<DeepSeekResponse | null> {
    if (!this.shouldCache(request, 'common')) {
      return null;
    }

    const cacheKey = this.generateCacheKey(request, 'common');
    
    return this.cacheService.cacheApiResponse(
      'deepseek_common',
      cacheKey,
      async () => {
        return this.callDeepSeekAPI(request);
      },
      this.config.commonQueryTTL
    );
  }

  /**
   * 智能缓存 - 自动判断请求类型并应用相应缓存策略
   */
  async smartCache(request: DeepSeekRequest): Promise<DeepSeekResponse> {
    const content = request.messages.map(m => m.content).join(' ').toLowerCase();
    
    // 判断请求类型
    if (content.includes('旅游规划') || content.includes('行程') || content.includes('旅行计划')) {
      const cached = await this.cachePlanningRequest(request);
      if (cached) return cached;
    } else if (content.includes('复杂度') || content.includes('分析')) {
      const cached = await this.cacheComplexityAnalysis(request);
      if (cached) return cached;
    } else {
      const cached = await this.cacheCommonQuery(request);
      if (cached) return cached;
    }

    // 如果没有缓存命中，直接调用API
    return this.callDeepSeekAPI(request);
  }

  /**
   * 实际调用DeepSeek API
   */
  private async callDeepSeekAPI(request: DeepSeekRequest): Promise<DeepSeekResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 预热缓存 - 为常见查询预先生成缓存
   */
  async warmupCache(): Promise<void> {
    const commonQueries = [
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '新疆旅游有什么推荐的景点？' }
        ],
        temperature: 0.3,
      },
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '制定一个7天的新疆旅游计划' }
        ],
        temperature: 0.3,
      },
    ];

    console.log('🔥 开始预热DeepSeek缓存...');
    
    for (const query of commonQueries) {
      try {
        await this.smartCache(query);
        console.log('✅ 预热查询完成');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ 预热查询失败:', errorMessage);
      }
    }
    
    console.log('🔥 DeepSeek缓存预热完成');
  }

  /**
   * 清理过期的规划缓存
   */
  async clearPlanningCache(destination?: string): Promise<void> {
    const pattern = destination ? `planning:${destination}` : 'planning';
    await this.cacheService.clear(pattern);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      ...this.cacheService.getStats(),
      config: this.config,
    };
  }

  /**
   * 估算缓存节省的成本
   */
  async getCostSavings(): Promise<{ tokensSaved: number, costSaved: number }> {
    // 这里可以实现成本计算逻辑
    // 基于缓存命中次数和平均token使用量
    return {
      tokensSaved: 0, // 实际实现中从缓存统计中计算
      costSaved: 0,   // 基于DeepSeek的定价计算
    };
  }
}

// 单例模式
let deepSeekCacheServiceInstance: DeepSeekCacheService | null = null;

export function getDeepSeekCacheService(): DeepSeekCacheService {
  if (!deepSeekCacheServiceInstance) {
    deepSeekCacheServiceInstance = new DeepSeekCacheService();
  }
  return deepSeekCacheServiceInstance;
}

export { DeepSeekCacheService };
