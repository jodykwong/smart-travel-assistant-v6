/**
 * Timeline解析插件 - 数字列表解析器
 * 处理 "1. **午餐**："、"2. **上午**：" 等数字列表格式
 */

import { BaseParser } from './base';
import { normalizeNumberedListOutput } from '../normalizer';
import type { DayPlan, ParseContext, Segment, Activity } from '../types';

export class NumberedListParser extends BaseParser {
  name = 'NumberedListParser';
  priority = 70;

  /**
   * 检查是否可以处理该内容
   */
  canHandle(raw: string): boolean {
    // 检查是否包含数字列表格式
    return /\d+\.\s*\*\*[^*]+\*\*[：:]/g.test(raw);
  }

  /**
   * 尝试解析数字列表格式
   */
  async tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null> {
    this.log('开始数字列表解析', { contentLength: raw.length });

    try {
      // 按天分割内容
      const dayContents = this.splitByDays(raw, context.totalDays);
      if (dayContents.length === 0) {
        this.log('未能分割出天数内容');
        return null;
      }

      const dayPlans: DayPlan[] = [];

      for (let i = 0; i < dayContents.length; i++) {
        const dayContent = dayContents[i];
        const dayNumber = i + 1;

        this.log(`解析第${dayNumber}天`, { contentLength: dayContent.length });

        // 提取标题
        const title = this.extractTitle(dayContent, `第${dayNumber}天`);

        // 解析数字列表项
        const segments = this.parseNumberedItems(dayContent);

        if (segments.length === 0) {
          this.log(`第${dayNumber}天未找到数字列表项`);
          continue;
        }

        // 计算日期
        const dayDate = this.calculateDayDate(context.startDate, i);

        dayPlans.push({
          day: dayNumber,
          title,
          date: dayDate,
          segments,
          location: context.destination,
          weather: this.generateWeatherInfo(dayNumber, context.destination),
          totalCost: this.calculateTotalCost(segments),
          progress: Math.floor(Math.random() * 30) + 70,
          image: '',
          tags: this.extractTags(title, segments),
        });

        this.log(`第${dayNumber}天解析完成`, { 
          segmentsCount: segments.length,
          activitiesCount: segments.reduce((sum, s) => sum + s.activities.length, 0)
        });
      }

      this.log('数字列表解析完成', { daysCount: dayPlans.length });
      return dayPlans;

    } catch (error) {
      this.log('数字列表解析出错', { error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  /**
   * 按天分割内容
   */
  private splitByDays(content: string, totalDays: number): string[] {
    // 尝试按 "Day X" 或"第X天" 分割
    const dayPattern = /(?:^|\n)\s*(?:Day\s*\d+|第\s*\d+\s*天)[：:\s]/gmi;
    const matches = Array.from(content.matchAll(dayPattern));

    if (matches.length >= totalDays) {
      const dayContents: string[] = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index!;
        const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
        dayContents.push(content.slice(start, end));
      }
      return dayContents.slice(0, totalDays);
    }

    // 如果无法按天分割，尝试平均分割
    const avgLength = Math.floor(content.length / totalDays);
    const dayContents: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const start = i * avgLength;
      const end = i === totalDays - 1 ? content.length : (i + 1) * avgLength;
      dayContents.push(content.slice(start, end));
    }

    return dayContents;
  }

  /**
   * 解析数字列表项
   */
  private parseNumberedItems(dayContent: string): Segment[] {
    const segments: Segment[] = [];
    
    // 匹配数字列表格式：1. **标签**：内容
    const numberedListPattern = /(\d+)\.\s*\*\*([^*]+)\*\*[：:]\s*([^\n]*(?:\n(?!\d+\.)[^\n]*)*)/g;
    let match;
    
    const items: { number: number; label: string; content: string }[] = [];
    
    while ((match = numberedListPattern.exec(dayContent)) !== null) {
      const number = parseInt(match[1]);
      const label = match[2].trim();
      const content = match[3].trim();
      
      items.push({ number, label, content });
    }

    this.log('找到数字列表项', { count: items.length });

    // 将列表项转换为时段
    const segmentMap = new Map<string, { period: string; activities: Activity[] }>();

    items.forEach(item => {
      const period = this.inferPeriodFromLabel(item.label, item.number);
      const activity = this.createActivityFromItem(item);

      if (!segmentMap.has(period)) {
        segmentMap.set(period, {
          period,
          activities: []
        });
      }

      segmentMap.get(period)!.activities.push(activity);
    });

    // 转换为Segment数组
    segmentMap.forEach((segmentData, period) => {
      segments.push({
        period: this.normalizePeriod(period),
        time: this.generateTimeRange(this.normalizePeriod(period)),
        activities: segmentData.activities
      });
    });

    return segments;
  }

  /**
   * 从标签推断时间段
   */
  private inferPeriodFromLabel(label: string, number: number): string {
    const text = label.toLowerCase();
    
    // 直接匹配时间段关键词
    if (text.includes('早餐') || text.includes('上午') || text.includes('早上')) return 'morning';
    if (text.includes('午餐') || text.includes('中午')) return 'noon';
    if (text.includes('下午')) return 'afternoon';
    if (text.includes('晚餐') || text.includes('傍晚')) return 'evening';
    if (text.includes('晚上') || text.includes('夜')) return 'night';
    
    // 根据序号推断
    if (number <= 2) return 'morning';
    if (number <= 4) return 'afternoon';
    return 'evening';
  }

  /**
   * 从列表项创建活动
   */
  private createActivityFromItem(item: { number: number; label: string; content: string }): Activity {
    const title = this.extractActivityTitle(item.label, item.content);
    const description = this.enhanceActivityDescription(item.content, item.label);
    const cost = this.extractCost(item.content) || this.generateReasonableCost(item.content);

    return {
      title,
      description,
      cost,
      duration: '约2-3小时',
      tips: this.extractTips(item.content),
      icon: this.getActivityIcon(item.content),
    };
  }

  /**
   * 提取活动标题
   */
  private extractActivityTitle(label: string, content: string): string {
    // 如果标签不是时间段，使用标签作为标题
    if (!this.isTimePeriodLabel(label)) {
      return this.cleanText(label);
    }
    
    // 否则从内容中提取标题
    const titleMatch = content.match(/^([^，。：:（(]+)/);
    const title = titleMatch ? titleMatch[1].trim() : content.substring(0, 20);
    return this.cleanText(title);
  }

  /**
   * 判断是否为时间段标签
   */
  private isTimePeriodLabel(label: string): boolean {
    const timePeriods = ['早餐', '午餐', '晚餐', '上午', '下午', '晚上', '傍晚', '中午', '早上'];
    return timePeriods.some(period => label.includes(period));
  }

  /**
   * 增强活动描述
   */
  private enhanceActivityDescription(content: string, label: string): string {
    let description = this.cleanText(content);
    
    // 如果内容很短，添加标签信息
    if (description.length < 20 && !this.isTimePeriodLabel(label)) {
      description = `${label}：${description}`;
    }
    
    return description;
  }

  /**
   * 提取小贴士
   */
  private extractTips(content: string): string[] {
    const tips: string[] = [];
    
    // 查找括号内的提示信息
    const tipMatches = content.match(/[（(]([^）)]+)[）)]/g);
    if (tipMatches) {
      tipMatches.forEach(match => {
        const tip = match.replace(/[（()）]/g, '').trim();
        if (tip.length > 0) {
          tips.push(tip);
        }
      });
    }

    // 查找"推荐"、"建议"等关键词后的内容
    const recommendMatch = content.match(/(?:推荐|建议)[：:]?\s*([^，。\n]+)/);
    if (recommendMatch) {
      tips.push(recommendMatch[1].trim());
    }

    return tips;
  }

  /**
   * 获取活动图标
   */
  private getActivityIcon(content: string): string {
    const text = content.toLowerCase();
    
    if (text.includes('餐') || text.includes('食') || text.includes('吃')) return '🍜';
    if (text.includes('景') || text.includes('游') || text.includes('参观')) return '🏛️';
    if (text.includes('购物') || text.includes('买')) return '🛍️';
    if (text.includes('交通') || text.includes('打车') || text.includes('地铁')) return '🚗';
    if (text.includes('公园') || text.includes('自然')) return '🌳';
    if (text.includes('博物') || text.includes('文化')) return '🏛️';
    if (text.includes('娱乐') || text.includes('体验')) return '🎭';
    
    return '📍';
  }

  /**
   * 规范化时段
   */
  private normalizePeriod(period: string): 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' {
    const periodMap: Record<string, 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'> = {
      'morning': 'morning',
      'noon': 'noon',
      'afternoon': 'afternoon',
      'evening': 'evening',
      'night': 'night',
    };

    return periodMap[period] || 'morning';
  }

  /**
   * 计算日期
   */
  private calculateDayDate(startDate: string | undefined, dayOffset: number): string {
    const date = startDate ? new Date(startDate) : new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric', 
      weekday: 'short' 
    });
  }

  /**
   * 生成天气信息
   */
  private generateWeatherInfo(day: number, destination: string) {
    const conditions = ['晴朗', '多云', '阴天'];
    const temperatures = ['22°C', '24°C', '26°C', '25°C'];
    
    return {
      condition: conditions[day % conditions.length],
      temperature: temperatures[day % temperatures.length],
      icon: '☀️',
    };
  }

  /**
   * 计算总费用
   */
  private calculateTotalCost(segments: Segment[]): number {
    return segments.reduce((total, segment) => {
      return total + segment.activities.reduce((segmentTotal, activity) => {
        return segmentTotal + (activity.cost || 0);
      }, 0);
    }, 0);
  }

  /**
   * 提取标签
   */
  private extractTags(title: string, segments: Segment[]): string[] {
    const tags: string[] = [];
    
    if (title?.includes('文化') || title?.includes('历史')) {
      tags.push('文化古迹');
    }
    if (title?.includes('美食') || title?.includes('餐')) {
      tags.push('特色美食');
    }
    if (title?.includes('自然') || title?.includes('公园')) {
      tags.push('自然风光');
    }
    if (title?.includes('购物')) {
      tags.push('购物体验');
    }
    
    return tags;
  }
}
