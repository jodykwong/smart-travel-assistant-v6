/**
 * 结构化时间格式解析器
 * 专门处理 "09:00-12:00" 这种具体时间格式
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';
import { TimelineActivityParser } from './timeline-activity-parser';

export class StructuredTimelineParser implements TimelineParser {
  private baseParser = new TimelineActivityParser();

  getName(): string {
    return 'StructuredTimelineParser';
  }

  getPriority(): number {
    return 80; // 中等优先级
  }

  canHandle(content: string): boolean {
    // 检查是否包含具体时间格式
    return /\d{1,2}:\d{2}[-~]\d{1,2}:\d{2}/.test(content);
  }

  parse(content: string, context: ParsingContext): ParseResult<TimelineActivity[]> {
    console.log(`🔍 [${this.getName()}] 开始解析结构化时间格式`);
    
    try {
      const activities: TimelineActivity[] = [];
      const specificTimePattern = /(\d{1,2}:\d{2}[-~]\d{1,2}:\d{2})[：:\s]*([^\\n]+)/g;
      let match;

      while ((match = specificTimePattern.exec(content)) !== null) {
        const timeStr = match[1];
        const description = match[2].trim();

        if (description && description.length > 10) {
          // 使用基础解析器的buildActivity方法
          const activity = this.buildActivityFromBaseParser(timeStr, description, context);
          activities.push(activity);
        }
      }

      if (activities.length === 0) {
        return ParseResult.failure(['未找到有效的结构化时间格式']);
      }

      console.log(`✅ [${this.getName()}] 解析完成，找到 ${activities.length} 个活动`);
      return ParseResult.success(activities);

    } catch (error) {
      console.error(`❌ [${this.getName()}] 解析失败:`, error);
      return ParseResult.failure([`解析错误: ${error.message}`]);
    }
  }

  /**
   * 使用基础解析器构建活动对象
   * 这是一个临时方案，理想情况下应该提取公共的活动构建逻辑
   */
  private buildActivityFromBaseParser(timeStr: string, description: string, context: ParsingContext): TimelineActivity {
    // 创建一个临时的基础解析器实例来构建活动
    // 这里我们直接构建活动对象，复用相同的逻辑
    return {
      time: this.normalizeTimeString(timeStr),
      period: this.getPeriodFromTime(timeStr),
      title: this.extractActivityTitle(description),
      description: this.enhanceActivityDescription(description, timeStr),
      icon: this.getActivityIcon(description),
      cost: this.extractCostFromDescription(description) || this.generateReasonableCost(description),
      duration: this.extractDurationFromDescription(description) || '约2-3小时',
      color: this.getActivityColor(timeStr)
    };
  }

  // 复用基础解析器的辅助方法
  private normalizeTimeString(timeStr: string): string {
    return timeStr.replace(/[点时]/g, ':').replace(/[-~]/g, '-');
  }

  private getPeriodFromTime(timeStr: string): string {
    const hour = parseInt(timeStr.split(':')[0] || '12');
    if (hour < 12) return '上午';
    if (hour < 18) return '下午';
    return '晚上';
  }

  private extractActivityTitle(description: string): string {
    const titleMatch = description.match(/^([^，。：:]+)/);
    return titleMatch ? titleMatch[1].trim() : description.substring(0, 20);
  }

  private getActivityIcon(description: string): string {
    if (description.includes('游览') || description.includes('参观')) return '🏛️';
    if (description.includes('美食') || description.includes('品尝') || description.includes('餐厅')) return '🍜';
    if (description.includes('购物') || description.includes('商场')) return '🛍️';
    if (description.includes('休息') || description.includes('酒店')) return '🏨';
    if (description.includes('交通') || description.includes('前往')) return '🚗';
    return '📍';
  }

  private extractCostFromDescription(description: string): number | null {
    const costMatch = description.match(/[￥¥](\d+)/);
    return costMatch ? parseInt(costMatch[1]) : null;
  }

  private generateReasonableCost(description: string): number {
    if (description.includes('门票') || description.includes('景点')) return Math.floor(Math.random() * 100) + 50;
    if (description.includes('美食') || description.includes('餐厅')) return Math.floor(Math.random() * 80) + 40;
    if (description.includes('交通')) return Math.floor(Math.random() * 30) + 10;
    return Math.floor(Math.random() * 60) + 30;
  }

  private extractDurationFromDescription(description: string): string | null {
    const durationMatch = description.match(/(\d+[小时分钟]+)/);
    return durationMatch ? durationMatch[1] : null;
  }

  private getActivityColor(timeStr: string): string {
    const hour = parseInt(timeStr.split(':')[0] || '12');
    if (hour < 12) return 'from-yellow-400 to-orange-400';
    if (hour < 18) return 'from-orange-400 to-red-400';
    return 'from-purple-400 to-indigo-500';
  }

  private enhanceActivityDescription(description: string, timeStr: string): string {
    // 简化版的描述增强，主要清理格式
    return description.trim().replace(/\*\*/g, '').replace(/^\-\s*/, '');
  }
}
