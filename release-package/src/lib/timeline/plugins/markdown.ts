/**
 * Timeline解析插件 - Markdown时间段解析器
 * 处理 **上午**、**下午** 等时间段格式
 */

import { BaseParser } from './base';
import { normalizeMarkdownOutput } from '../normalizer';
import type { DayPlan, ParseContext, Segment, Activity } from '../types';

export class MarkdownPeriodParser extends BaseParser {
  name = 'MarkdownPeriodParser';
  priority = 80;

  /**
   * 检查是否可以处理该内容
   */
  canHandle(raw: string): boolean {
    // 检查是否包含Markdown时间段标记
    return /\*\*\s*(上午|下午|晚上|早上|中午|傍晚)\s*\*\*/g.test(raw);
  }

  /**
   * 尝试解析Markdown时间段格式
   */
  async tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null> {
    this.log('开始Markdown时间段解析', { contentLength: raw.length });

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

        // 解析时间段
        const segments = this.parseTimeSegments(dayContent);

        if (segments.length === 0) {
          this.log(`第${dayNumber}天未找到时间段`);
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

      this.log('Markdown时间段解析完成', { daysCount: dayPlans.length });
      return dayPlans;

    } catch (error) {
      this.log('Markdown时间段解析出错', { error: error instanceof Error ? error.message : '未知错误' });
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
   * 解析时间段
   */
  private parseTimeSegments(dayContent: string): Segment[] {
    const segments: Segment[] = [];
    
    // 修复的正则表达式，支持多种时间段格式
    const timeBlockRegex = /(?:^|\n)\s*(?:-\s*)?\*\*\s*(上午|下午|晚上|早上|中午|傍晚)\s*\*\*\s*/gm;
    
    let lastIndex = 0;
    let match;
    const timeBlocks: { period: string; start: number; end: number }[] = [];

    // 找到所有时间段标记
    while ((match = timeBlockRegex.exec(dayContent)) !== null) {
      if (timeBlocks.length > 0) {
        timeBlocks[timeBlocks.length - 1].end = match.index;
      }
      
      timeBlocks.push({
        period: match[1],
        start: match.index + match[0].length,
        end: dayContent.length
      });
    }

    // 解析每个时间段的内容
    timeBlocks.forEach(block => {
      const content = dayContent.slice(block.start, block.end).trim();
      if (content.length > 10) {
        const activities = this.parseActivities(content);
        if (activities.length > 0) {
          segments.push({
            period: this.normalizePeriod(block.period),
            time: this.generateTimeRange(this.normalizePeriod(block.period)),
            activities
          });
        }
      }
    });

    return segments;
  }

  /**
   * 解析活动内容
   */
  private parseActivities(content: string): Activity[] {
    const activities: Activity[] = [];
    
    // 按行分割，过滤空行
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const cleanLine = this.cleanText(line);
      if (cleanLine.length > 5) {
        // 提取活动信息
        const title = this.extractActivityTitle(cleanLine);
        const description = this.enhanceActivityDescription(cleanLine);
        const cost = this.extractCost(cleanLine) || this.generateReasonableCost(cleanLine);

        activities.push({
          title,
          description,
          cost,
          duration: '约2-3小时',
          tips: this.extractTips(cleanLine),
          icon: this.getActivityIcon(cleanLine),
        });
      }
    }

    // 如果没有解析出活动，创建一个默认活动
    if (activities.length === 0 && content.length > 10) {
      activities.push({
        title: this.extractActivityTitle(content),
        description: this.enhanceActivityDescription(content),
        cost: this.generateReasonableCost(content),
        duration: '约2-3小时',
        icon: '📍',
      });
    }

    return activities;
  }

  /**
   * 提取活动标题
   */
  private extractActivityTitle(description: string): string {
    // 提取第一个句子或短语作为标题
    const titleMatch = description.match(/^([^，。：:]+)/);
    const title = titleMatch ? titleMatch[1].trim() : description.substring(0, 20);
    return this.cleanText(title);
  }

  /**
   * 增强活动描述
   */
  private enhanceActivityDescription(description: string): string {
    return this.cleanText(description);
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

    return tips;
  }

  /**
   * 获取活动图标
   */
  private getActivityIcon(description: string): string {
    const text = description.toLowerCase();
    
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
      '上午': 'morning',
      '早上': 'morning',
      '中午': 'noon',
      '下午': 'afternoon',
      '傍晚': 'evening',
      '晚上': 'night',
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
