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
    console.log(`🔍 MarkdownPeriodParser开始分割内容，总长度: ${content.length}字符，预期天数: ${totalDays}`);

    // 策略1: 优先处理分组格式 (Day 1-2, Day 3-4 等)
    const groupPattern = /(?:^|\n)\s*(?:Day\s*(\d+)-(\d+)|第(\d+)-(\d+)天)[：:\s]*([^]*?)(?=(?:Day\s*\d+|第\d+天|####|---|\n\n\n)|$)/gmi;
    const groupMatches = Array.from(content.matchAll(groupPattern));

    if (groupMatches.length > 0) {
      console.log(`✅ 检测到${groupMatches.length}个分组格式段落`);

      const dayContents: string[] = [];
      let processedDays = 0;

      groupMatches.forEach((match, index) => {
        const startDay = parseInt(match[1] || match[3]);
        const endDay = parseInt(match[2] || match[4]);
        const groupContent = match[5].trim();

        console.log(`📅 处理分组: Day ${startDay}-${endDay}, 内容长度: ${groupContent.length}`);

        // 将分组内容智能分配到各天
        const daysInGroup = endDay - startDay + 1;
        const expandedDays = this.expandGroupToSingleDays(groupContent, startDay, endDay);

        expandedDays.forEach((dayContent, dayIndex) => {
          if (processedDays < totalDays) {
            dayContents.push(dayContent);
            processedDays++;
            console.log(`✅ 第${startDay + dayIndex}天解析完成，内容长度: ${dayContent.length}`);
          }
        });
      });

      // 如果分组解析的天数不足，用平均分割补充
      if (dayContents.length < totalDays) {
        console.log(`⚠️ 分组解析天数不足(${dayContents.length}/${totalDays})，补充剩余天数`);
        const remainingContent = this.extractRemainingContent(content, groupMatches);
        const remainingDays = totalDays - dayContents.length;
        const supplementDays = this.averageSplit(remainingContent, remainingDays);
        dayContents.push(...supplementDays);
      }

      return dayContents.slice(0, totalDays);
    }

    // 策略2: 尝试按单天格式分割
    const singleDayPattern = /(?:^|\n)\s*(?:Day\s*\d+|第\s*\d+\s*天)[：:\s]/gmi;
    const singleMatches = Array.from(content.matchAll(singleDayPattern));

    if (singleMatches.length >= totalDays) {
      console.log(`✅ 检测到${singleMatches.length}个单天格式段落`);
      const dayContents: string[] = [];
      for (let i = 0; i < Math.min(singleMatches.length, totalDays); i++) {
        const start = singleMatches[i].index!;
        const end = i < singleMatches.length - 1 ? singleMatches[i + 1].index! : content.length;
        dayContents.push(content.slice(start, end));
      }
      return dayContents;
    }

    // 策略3: 兜底方案 - 智能平均分割（避免破坏句子结构）
    console.log(`⚠️ 无法识别天数格式，使用智能平均分割`);
    return this.intelligentAverageSplit(content, totalDays);
  }

  /**
   * 将分组内容展开为单天内容
   */
  private expandGroupToSingleDays(groupContent: string, startDay: number, endDay: number): string[] {
    const daysInGroup = endDay - startDay + 1;
    const dayContents: string[] = [];

    // 按段落分割内容
    const paragraphs = groupContent.split(/\n\s*\n/).filter(p => p.trim().length > 20);

    if (paragraphs.length >= daysInGroup) {
      // 有足够的段落，按段落分配
      const paragraphsPerDay = Math.ceil(paragraphs.length / daysInGroup);

      for (let i = 0; i < daysInGroup; i++) {
        const startIndex = i * paragraphsPerDay;
        const endIndex = Math.min((i + 1) * paragraphsPerDay, paragraphs.length);
        const dayParagraphs = paragraphs.slice(startIndex, endIndex);

        // 添加天数标题
        const dayNumber = startDay + i;
        const dayTitle = `#### Day ${dayNumber}：第${dayNumber}天`;
        const dayContent = dayTitle + '\n\n' + dayParagraphs.join('\n\n');

        dayContents.push(dayContent);
      }
    } else {
      // 段落不足，按字符智能分割
      const avgLength = Math.ceil(groupContent.length / daysInGroup);

      for (let i = 0; i < daysInGroup; i++) {
        const startPos = i * avgLength;
        const endPos = Math.min((i + 1) * avgLength, groupContent.length);
        let dayContent = groupContent.substring(startPos, endPos);

        // 在合适的位置切断，避免截断句子
        if (i < daysInGroup - 1) {
          const cutPoints = [
            dayContent.lastIndexOf('。'),
            dayContent.lastIndexOf('\n'),
            dayContent.lastIndexOf('- '),
            dayContent.lastIndexOf(' ')
          ];
          const bestCutPoint = cutPoints.find(point => point > dayContent.length * 0.7);
          if (bestCutPoint && bestCutPoint > 0) {
            dayContent = dayContent.substring(0, bestCutPoint + 1);
          }
        }

        // 添加天数标题
        const dayNumber = startDay + i;
        const dayTitle = `#### Day ${dayNumber}：第${dayNumber}天`;
        const finalContent = dayTitle + '\n\n' + dayContent.trim();

        dayContents.push(finalContent);
      }
    }

    return dayContents;
  }

  /**
   * 提取分组匹配后的剩余内容
   */
  private extractRemainingContent(content: string, groupMatches: RegExpMatchArray[]): string {
    if (groupMatches.length === 0) return content;

    const lastMatch = groupMatches[groupMatches.length - 1];
    const lastMatchEnd = lastMatch.index! + lastMatch[0].length;

    return content.substring(lastMatchEnd).trim();
  }

  /**
   * 智能平均分割（避免破坏句子结构）
   */
  private intelligentAverageSplit(content: string, totalDays: number): string[] {
    const avgLength = Math.ceil(content.length / totalDays);
    const dayContents: string[] = [];

    for (let i = 0; i < totalDays; i++) {
      const startPos = i * avgLength;
      const endPos = Math.min((i + 1) * avgLength, content.length);
      let dayContent = content.substring(startPos, endPos);

      // 在合适的位置切断
      if (i < totalDays - 1) {
        const cutPoints = [
          dayContent.lastIndexOf('。'),
          dayContent.lastIndexOf('\n'),
          dayContent.lastIndexOf('- '),
          dayContent.lastIndexOf(' ')
        ];
        const bestCutPoint = cutPoints.find(point => point > dayContent.length * 0.6);
        if (bestCutPoint && bestCutPoint > 0) {
          dayContent = dayContent.substring(0, bestCutPoint + 1);
        }
      }

      // 添加天数标题
      const dayTitle = `#### Day ${i + 1}：第${i + 1}天`;
      const finalContent = dayTitle + '\n\n' + dayContent.trim();

      dayContents.push(finalContent);
    }

    return dayContents;
  }

  /**
   * 平均分割辅助方法
   */
  private averageSplit(content: string, days: number): string[] {
    if (days <= 0) return [];

    const avgLength = Math.ceil(content.length / days);
    const result: string[] = [];

    for (let i = 0; i < days; i++) {
      const start = i * avgLength;
      const end = Math.min((i + 1) * avgLength, content.length);
      result.push(content.substring(start, end).trim());
    }

    return result;
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
