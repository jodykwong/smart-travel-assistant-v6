/**
 * 兜底时间线解析器
 * 当其他解析器都无法处理时，提供基本的解析能力和合理的默认数据
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';

export class FallbackTimelineParser implements TimelineParser {

  getName(): string {
    return 'FallbackTimelineParser';
  }

  getPriority(): number {
    return 10; // 最低优先级
  }

  canHandle(content: string): boolean {
    // 兜底解析器总是可以处理任何内容
    return true;
  }

  parse(content: string, context: ParsingContext): ParseResult<TimelineActivity[]> {
    console.log(`🔍 [${this.getName()}] 使用兜底解析器处理内容`);
    
    const warnings = ['使用兜底解析器，可能无法准确解析所有内容'];
    
    try {
      const activities = this.generateDefaultActivities(content, context);
      
      console.log(`✅ [${this.getName()}] 生成了 ${activities.length} 个默认活动`);
      return ParseResult.successWithWarnings(activities, warnings);

    } catch (error) {
      console.error(`❌ [${this.getName()}] 兜底解析也失败了:`, error);
      
      // 即使兜底解析失败，也要提供最基本的数据
      const basicActivities = this.generateBasicActivities(context);
      return ParseResult.failure([`兜底解析失败: ${error.message}`], basicActivities);
    }
  }

  /**
   * 基于内容生成默认活动
   */
  private generateDefaultActivities(content: string, context: ParsingContext): TimelineActivity[] {
    const activities: TimelineActivity[] = [];
    const periods = ['上午', '下午', '晚上'];
    
    // 尝试从内容中提取一些关键词
    const keywords = this.extractKeywords(content);
    
    periods.forEach((period, index) => {
      const description = this.generateSmartDescription(period, context.destination, keywords, content);
      
      activities.push({
        time: this.normalizeTimeString(period),
        period: period,
        title: `${context.destination}${period}行程`,
        description: description,
        icon: this.getDefaultIcon(period),
        cost: this.getDefaultCost(period),
        duration: '约2-3小时',
        color: this.getActivityColor(period)
      });
    });

    return activities;
  }

  /**
   * 生成最基本的活动（当一切都失败时）
   */
  private generateBasicActivities(context: ParsingContext): TimelineActivity[] {
    return [{
      time: '09:00-21:00',
      period: '全天',
      title: `${context.destination}一日游`,
      description: `探索${context.destination}的精彩之处\n• 游览当地著名景点\n• 体验当地文化特色\n💡 建议：保持开放的心态，享受旅行的乐趣`,
      icon: '🗺️',
      cost: 200,
      duration: '全天',
      color: 'from-blue-400 to-purple-500'
    }];
  }

  /**
   * 从内容中提取关键词
   */
  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // 景点相关关键词
    const attractions = content.match(/[游览参观]([^，。\n]{2,10})/g);
    if (attractions) {
      keywords.push(...attractions.map(a => a.replace(/[游览参观]/, '')));
    }
    
    // 美食相关关键词
    const food = content.match(/[品尝享用]([^，。\n]{2,10})/g);
    if (food) {
      keywords.push(...food.map(f => f.replace(/[品尝享用]/, '')));
    }
    
    return keywords.slice(0, 5); // 最多保留5个关键词
  }

  /**
   * 生成智能描述
   */
  private generateSmartDescription(period: string, destination: string, keywords: string[], originalContent: string): string {
    const descriptions = [];
    
    if (period === '上午') {
      descriptions.push(`开始${destination}的精彩一天`);
      if (keywords.length > 0) {
        descriptions.push(`• 重点游览：${keywords[0]}`);
      } else {
        descriptions.push('• 游览当地著名景点');
      }
      descriptions.push('💡 建议：早起避开人流高峰');
    } else if (period === '下午') {
      descriptions.push(`继续深度探索${destination}`);
      if (keywords.length > 1) {
        descriptions.push(`• 体验：${keywords[1]}`);
      } else {
        descriptions.push('• 深入体验当地文化');
      }
      descriptions.push('🚗 交通：建议使用公共交通');
    } else {
      descriptions.push(`享受${destination}的夜晚时光`);
      if (keywords.some(k => k.includes('美食') || k.includes('餐厅'))) {
        descriptions.push('• 品尝当地特色美食');
      } else {
        descriptions.push('• 欣赏城市夜景');
      }
      descriptions.push('💰 预算：人均100-200元');
    }
    
    return descriptions.join('\n');
  }

  // 辅助方法
  private normalizeTimeString(period: string): string {
    if (period === '上午') return '09:00-12:00';
    if (period === '下午') return '14:00-17:00';
    if (period === '晚上') return '19:00-21:00';
    return '09:00-17:00';
  }

  private getDefaultIcon(period: string): string {
    if (period === '上午') return '🌅';
    if (period === '下午') return '🏛️';
    if (period === '晚上') return '🌃';
    return '📍';
  }

  private getDefaultCost(period: string): number {
    if (period === '上午') return 80;
    if (period === '下午') return 120;
    if (period === '晚上') return 150;
    return 100;
  }

  private getActivityColor(period: string): string {
    if (period === '上午') return 'from-yellow-400 to-orange-400';
    if (period === '下午') return 'from-orange-400 to-red-400';
    if (period === '晚上') return 'from-purple-400 to-indigo-500';
    return 'from-blue-400 to-cyan-400';
  }
}
