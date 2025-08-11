/**
 * Timeline解析插件 - 基础接口
 * 遵循开闭原则，支持可插拔的解析策略
 */

import type { DayPlan, ParseContext, ParserPlugin } from '../types';

/**
 * 抽象解析器基类
 */
export abstract class BaseParser implements ParserPlugin {
  abstract name: string;
  abstract priority: number;

  abstract tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null>;
  abstract canHandle(raw: string): boolean;

  /**
   * 评分函数，用于选择最佳解析结果
   */
  score(result: DayPlan[]): number {
    let score = 0;
    
    // 基础分数：每天10分
    score += result.length * 10;
    
    // 内容完整性：每个时段5分
    result.forEach(day => {
      score += day.segments.length * 5;
      
      // 活动数量：每个活动2分
      day.segments.forEach(segment => {
        score += segment.activities.length * 2;
        
        // 活动质量：有描述+1分，有费用+1分
        segment.activities.forEach(activity => {
          if (activity.description && activity.description.length > 10) score += 1;
          if (activity.cost !== undefined) score += 1;
        });
      });
    });
    
    return score;
  }

  /**
   * 通用的文本清理函数
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\*\*|#+|__|~~|`/g, '') // 移除Markdown标记
      .replace(/\n+/g, '\n') // 合并多个换行
      .trim();
  }

  /**
   * 提取标题
   */
  protected extractTitle(content: string, fallback: string): string {
    // 尝试匹配 "Day X：标题" 格式
    const dayTitleMatch = content.match(/Day\s*\d+[：:]\s*([^*\n]+)/i);
    if (dayTitleMatch) {
      return this.cleanText(dayTitleMatch[1]);
    }
    
    // 尝试匹配第一行作为标题
    const firstLine = content.split('\n')[0];
    if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
      return this.cleanText(firstLine);
    }
    
    return fallback;
  }

  /**
   * 解析费用信息
   */
  protected extractCost(text: string): number | undefined {
    const costMatch = text.match(/(\d+)\s*元|¥\s*(\d+)|(\d+)\s*rmb/i);
    if (costMatch) {
      return parseInt(costMatch[1] || costMatch[2] || costMatch[3]);
    }
    return undefined;
  }

  /**
   * 生成合理的费用估算
   */
  protected generateReasonableCost(description: string): number {
    const text = description.toLowerCase();
    
    if (text.includes('门票') || text.includes('景点')) {
      return Math.floor(Math.random() * 100) + 50; // 50-150元
    }
    if (text.includes('餐') || text.includes('食')) {
      return Math.floor(Math.random() * 80) + 40; // 40-120元
    }
    if (text.includes('交通') || text.includes('打车')) {
      return Math.floor(Math.random() * 50) + 20; // 20-70元
    }
    if (text.includes('购物')) {
      return Math.floor(Math.random() * 200) + 100; // 100-300元
    }
    
    return Math.floor(Math.random() * 60) + 30; // 默认30-90元
  }

  /**
   * 推断时间段
   */
  protected inferPeriod(content: string, index: number = 0): 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' {
    const text = content.toLowerCase();
    
    if (text.includes('早') || text.includes('上午')) return 'morning';
    if (text.includes('午餐') || text.includes('中午')) return 'noon';
    if (text.includes('下午')) return 'afternoon';
    if (text.includes('傍晚') || text.includes('晚餐')) return 'evening';
    if (text.includes('晚上') || text.includes('夜')) return 'night';
    
    // 根据索引推断
    if (index === 0) return 'morning';
    if (index === 1) return 'afternoon';
    if (index === 2) return 'evening';
    
    return 'afternoon';
  }

  /**
   * 生成时间范围
   */
  protected generateTimeRange(period: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'): string {
    const timeMap = {
      'morning': '09:00-12:00',
      'noon': '12:00-14:00',
      'afternoon': '14:00-17:00',
      'evening': '18:00-21:00',
      'night': '21:00-23:00',
    };
    
    return timeMap[period];
  }

  /**
   * 日志记录
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '');
  }
}

/**
 * 解析器注册中心
 */
export class ParserRegistry {
  private parsers: ParserPlugin[] = [];

  /**
   * 注册解析器
   */
  register(parser: ParserPlugin): void {
    this.parsers.push(parser);
    // 按优先级排序
    this.parsers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取所有解析器
   */
  getAll(): ParserPlugin[] {
    return [...this.parsers];
  }

  /**
   * 获取可处理指定内容的解析器
   */
  getCapable(raw: string): ParserPlugin[] {
    return this.parsers.filter(parser => parser.canHandle(raw));
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.parsers = [];
  }
}

// 全局解析器注册中心实例
export const parserRegistry = new ParserRegistry();
