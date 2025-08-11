/**
 * Timeline解析插件 - 启发式解析器
 * 作为最后的兜底方案，使用启发式规则解析任意格式的文本
 */

import { BaseParser } from './base';
import type { DayPlan, ParseContext, Segment, Activity } from '../types';

export class HeuristicTimeParser extends BaseParser {
  name = 'HeuristicTimeParser';
  priority = 10; // 最低优先级，作为兜底方案

  /**
   * 检查是否可以处理该内容 - 总是返回true，作为兜底
   */
  canHandle(raw: string): boolean {
    return raw.length > 50; // 只要内容足够长就尝试解析
  }

  /**
   * 启发式解析任意格式的文本
   */
  async tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null> {
    this.log('开始启发式解析', { contentLength: raw.length });

    try {
      // 按天分割内容
      const dayContents = this.splitByDays(raw, context.totalDays);
      if (dayContents.length === 0) {
        this.log('启发式分割失败，使用平均分割');
        return this.fallbackParse(raw, context);
      }

      const dayPlans: DayPlan[] = [];

      for (let i = 0; i < dayContents.length; i++) {
        const dayContent = dayContents[i];
        const dayNumber = i + 1;

        this.log(`启发式解析第${dayNumber}天`, { contentLength: dayContent.length });

        // 提取标题
        const title = this.extractTitle(dayContent, `第${dayNumber}天`);

        // 启发式解析活动
        const segments = this.parseActivitiesHeuristically(dayContent);

        if (segments.length === 0) {
          // 创建一个默认时段
          segments.push(this.createDefaultSegment(dayContent));
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

        this.log(`第${dayNumber}天启发式解析完成`, { 
          segmentsCount: segments.length,
          activitiesCount: segments.reduce((sum, s) => sum + s.activities.length, 0)
        });
      }

      this.log('启发式解析完成', { daysCount: dayPlans.length });
      return dayPlans;

    } catch (error) {
      this.log('启发式解析出错', { error: error instanceof Error ? error.message : '未知错误' });
      return this.fallbackParse(raw, context);
    }
  }

  /**
   * 按天分割内容（启发式）
   */
  private splitByDays(content: string, totalDays: number): string[] {
    console.log(`🔍 HeuristicTimeParser开始分割内容，总长度: ${content.length}字符，预期天数: ${totalDays}`);

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

        // 将分组内容智能展开为单天
        const expandedDays = this.expandGroupToSingleDays(groupContent, startDay, endDay);

        expandedDays.forEach((dayContent, dayIndex) => {
          if (processedDays < totalDays) {
            dayContents.push(dayContent);
            processedDays++;
            console.log(`✅ 第${startDay + dayIndex}天启发式解析完成，内容长度: ${dayContent.length}`);
          }
        });
      });

      // 如果分组解析的天数不足，补充剩余天数
      if (dayContents.length < totalDays) {
        console.log(`⚠️ 分组解析天数不足(${dayContents.length}/${totalDays})，补充剩余天数`);
        const remainingContent = this.extractRemainingContent(content, groupMatches);
        if (remainingContent.length > 50) {
          const remainingDays = totalDays - dayContents.length;
          const supplementDays = this.intelligentAverageSplit(remainingContent, remainingDays);
          dayContents.push(...supplementDays);
        }
      }

      return dayContents.slice(0, totalDays);
    }

    // 策略2: 尝试多种单天分割模式
    const patterns = [
      /(?:^|\n)\s*(?:Day\s*\d+|第\s*\d+\s*天)[：:\s]/gmi,
      /(?:^|\n)\s*\d+\s*[、.]\s*/gm,
      /(?:^|\n)\s*[一二三四五六七八九十]+\s*[、.]\s*/gm,
    ];

    for (const pattern of patterns) {
      const matches = Array.from(content.matchAll(pattern));
      if (matches.length >= totalDays) {
        console.log(`✅ 使用单天格式解析，匹配${matches.length}个段落`);
        const dayContents: string[] = [];
        for (let i = 0; i < Math.min(matches.length, totalDays); i++) {
          const start = matches[i].index!;
          const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
          dayContents.push(content.slice(start, end));
        }
        return dayContents;
      }
    }

    // 策略3: 按段落分割
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    if (paragraphs.length >= totalDays) {
      console.log(`✅ 使用段落分割，共${paragraphs.length}个段落`);
      return paragraphs.slice(0, totalDays);
    }

    // 策略4: 智能平均分割（最后兜底）
    console.log(`⚠️ 所有解析策略失败，使用智能平均分割`);
    return this.intelligentAverageSplit(content, totalDays);
  }

  /**
   * 将分组内容展开为单天内容 - 增强版
   */
  private expandGroupToSingleDays(groupContent: string, startDay: number, endDay: number): string[] {
    const daysInGroup = endDay - startDay + 1;
    const dayContents: string[] = [];

    console.log(`🔄 展开分组内容: Day ${startDay}-${endDay}, 内容长度: ${groupContent.length}, 目标天数: ${daysInGroup}`);

    // 策略1: 按活动块分割（原有逻辑优化）
    const activityBlocks = groupContent.split(/(?:\n\s*-\s*|\n\s*\*\s*)/);
    const meaningfulBlocks = activityBlocks.filter(block => block.trim().length > 30);

    if (meaningfulBlocks.length >= daysInGroup) {
      // 有足够的活动块，按块分配
      const blocksPerDay = Math.ceil(meaningfulBlocks.length / daysInGroup);

      for (let i = 0; i < daysInGroup; i++) {
        const startIndex = i * blocksPerDay;
        const endIndex = Math.min((i + 1) * blocksPerDay, meaningfulBlocks.length);
        const dayBlocks = meaningfulBlocks.slice(startIndex, endIndex);

        const dayNumber = startDay + i;
        const dayTitle = `#### Day ${dayNumber}：第${dayNumber}天`;
        const dayContent = dayTitle + '\n\n- ' + dayBlocks.join('\n- ');

        dayContents.push(dayContent);
      }
    } else {
      // 策略2: 按段落分割
      const paragraphs = groupContent.split(/\n\s*\n/).filter(p => p.trim().length > 20);

      if (paragraphs.length >= daysInGroup) {
        const paragraphsPerDay = Math.ceil(paragraphs.length / daysInGroup);

        for (let i = 0; i < daysInGroup; i++) {
          const startIndex = i * paragraphsPerDay;
          const endIndex = Math.min((i + 1) * paragraphsPerDay, paragraphs.length);
          const dayParagraphs = paragraphs.slice(startIndex, endIndex);

          const dayNumber = startDay + i;
          const dayTitle = `#### Day ${dayNumber}：第${dayNumber}天`;
          const dayContent = dayTitle + '\n\n' + dayParagraphs.join('\n\n');

          dayContents.push(dayContent);
        }
      } else {
        // 最后兜底：智能字符分割
        const avgLength = Math.ceil(groupContent.length / daysInGroup);

        for (let i = 0; i < daysInGroup; i++) {
          const startPos = i * avgLength;
          const endPos = Math.min((i + 1) * avgLength, groupContent.length);
          let dayContent = groupContent.substring(startPos, endPos);

          // 在合适的位置切断
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

          const dayNumber = startDay + i;
          const dayTitle = `#### Day ${dayNumber}：第${dayNumber}天`;
          const finalContent = dayTitle + '\n\n' + dayContent.trim();

          dayContents.push(finalContent);
        }
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

      // 在合适的位置切断，避免截断句子
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
   * 启发式解析活动
   */
  private parseActivitiesHeuristically(dayContent: string): Segment[] {
    const segments: Segment[] = [];
    
    // 尝试识别时间相关的关键词
    const timeKeywords = [
      { keywords: ['早', '上午', 'morning'], period: 'morning' as const },
      { keywords: ['午', '中午', 'noon'], period: 'noon' as const },
      { keywords: ['下午', 'afternoon'], period: 'afternoon' as const },
      { keywords: ['傍晚', '晚', 'evening'], period: 'evening' as const },
      { keywords: ['夜', 'night'], period: 'night' as const },
    ];

    // 按行分割内容
    const lines = dayContent.split('\n').filter(line => line.trim().length > 10);
    
    // 尝试按时间关键词分组
    const timeGroups = new Map<string, string[]>();
    let currentPeriod = 'morning';

    for (const line of lines) {
      const cleanLine = this.cleanText(line);
      
      // 检查是否包含时间关键词
      let foundPeriod = false;
      for (const timeKeyword of timeKeywords) {
        if (timeKeyword.keywords.some(keyword => cleanLine.includes(keyword))) {
          currentPeriod = timeKeyword.period;
          foundPeriod = true;
          break;
        }
      }

      // 将行添加到当前时段
      if (!timeGroups.has(currentPeriod)) {
        timeGroups.set(currentPeriod, []);
      }
      timeGroups.get(currentPeriod)!.push(cleanLine);
    }

    // 转换为Segment
    timeGroups.forEach((lines, period) => {
      const activities = this.extractActivitiesFromLines(lines);
      if (activities.length > 0) {
        segments.push({
          period: period as any,
          time: this.generateTimeRange(period as any),
          activities
        });
      }
    });

    // 如果没有找到任何时段，创建默认分组
    if (segments.length === 0) {
      const allLines = lines.filter(line => line.length > 10);
      if (allLines.length > 0) {
        const activities = this.extractActivitiesFromLines(allLines);
        segments.push({
          period: 'morning',
          time: '09:00-17:00',
          activities
        });
      }
    }

    return segments;
  }

  /**
   * 从文本行中提取活动
   */
  private extractActivitiesFromLines(lines: string[]): Activity[] {
    const activities: Activity[] = [];
    
    for (const line of lines) {
      if (line.length < 10) continue;
      
      // 尝试识别活动信息
      const activity = this.parseActivityFromLine(line);
      if (activity) {
        activities.push(activity);
      }
    }

    // 如果没有解析出活动，但有内容，创建一个综合活动
    if (activities.length === 0 && lines.length > 0) {
      const combinedContent = lines.join(' ').substring(0, 200);
      activities.push({
        title: this.extractActivityTitle(combinedContent),
        description: combinedContent,
        cost: this.generateReasonableCost(combinedContent),
        duration: '约2-3小时',
        icon: this.getActivityIcon(combinedContent),
      });
    }

    return activities;
  }

  /**
   * 从单行文本解析活动
   */
  private parseActivityFromLine(line: string): Activity | null {
    const cleanLine = this.cleanText(line);
    
    // 跳过太短或明显不是活动的行
    if (cleanLine.length < 10 || this.isMetaLine(cleanLine)) {
      return null;
    }

    const title = this.extractActivityTitle(cleanLine);
    const description = cleanLine;
    const cost = this.extractCost(cleanLine) || this.generateReasonableCost(cleanLine);

    return {
      title,
      description,
      cost,
      duration: '约2-3小时',
      tips: this.extractTips(cleanLine),
      icon: this.getActivityIcon(cleanLine),
    };
  }

  /**
   * 判断是否为元信息行（非活动内容）
   */
  private isMetaLine(line: string): boolean {
    const metaPatterns = [
      /^Day\s*\d+/i,
      /^第\s*\d+\s*天/,
      /^##\s*/,
      /^预算/,
      /^总计/,
      /^注意/,
      /^提示/,
    ];

    return metaPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 提取活动标题
   */
  private extractActivityTitle(content: string): string {
    // 提取第一个有意义的短语
    const titleMatch = content.match(/^([^，。：:（(]+)/);
    let title = titleMatch ? titleMatch[1].trim() : content.substring(0, 30);
    
    // 清理标题
    title = this.cleanText(title);
    
    // 如果标题太短，尝试扩展
    if (title.length < 5) {
      const words = content.split(/[，。：:\s]+/).filter(w => w.length > 2);
      title = words.slice(0, 3).join(' ');
    }

    return title.substring(0, 50);
  }

  /**
   * 提取小贴士
   */
  private extractTips(content: string): string[] {
    const tips: string[] = [];
    
    // 查找括号内的信息
    const tipMatches = content.match(/[（(]([^）)]+)[）)]/g);
    if (tipMatches) {
      tipMatches.forEach(match => {
        const tip = match.replace(/[（()）]/g, '').trim();
        if (tip.length > 0 && tip.length < 100) {
          tips.push(tip);
        }
      });
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
    if (text.includes('交通') || text.includes('车') || text.includes('站')) return '🚗';
    if (text.includes('公园') || text.includes('自然') || text.includes('山')) return '🌳';
    if (text.includes('博物') || text.includes('文化') || text.includes('历史')) return '🏛️';
    if (text.includes('娱乐') || text.includes('体验') || text.includes('活动')) return '🎭';
    if (text.includes('酒店') || text.includes('住宿')) return '🏨';
    
    return '📍';
  }

  /**
   * 创建默认时段
   */
  private createDefaultSegment(content: string): Segment {
    const activities = this.extractActivitiesFromLines([content]);
    
    return {
      period: 'morning',
      time: '09:00-17:00',
      activities: activities.length > 0 ? activities : [{
        title: '行程安排',
        description: this.cleanText(content).substring(0, 200),
        cost: this.generateReasonableCost(content),
        duration: '全天',
        icon: '📍',
      }]
    };
  }

  /**
   * 兜底解析方案
   */
  private fallbackParse(raw: string, context: ParseContext): DayPlan[] {
    this.log('使用兜底解析方案');
    
    const dayPlans: DayPlan[] = [];
    const avgLength = Math.floor(raw.length / context.totalDays);
    
    for (let i = 0; i < context.totalDays; i++) {
      const start = i * avgLength;
      const end = i === context.totalDays - 1 ? raw.length : (i + 1) * avgLength;
      const dayContent = raw.slice(start, end);
      
      const dayDate = this.calculateDayDate(context.startDate, i);
      
      dayPlans.push({
        day: i + 1,
        title: `第${i + 1}天`,
        date: dayDate,
        segments: [this.createDefaultSegment(dayContent)],
        location: context.destination,
        weather: this.generateWeatherInfo(i + 1, context.destination),
        totalCost: this.generateReasonableCost(dayContent),
        progress: Math.floor(Math.random() * 30) + 70,
        image: '',
        tags: ['行程安排'],
      });
    }
    
    return dayPlans;
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
    
    if (tags.length === 0) {
      tags.push('行程安排');
    }
    
    return tags;
  }
}
