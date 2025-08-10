/**
 * 时间线活动解析器
 * 将原有的500+行巨型函数重构为模块化的解析器
 * 遵循单一职责原则，每个方法只负责一个特定的解析任务
 */

import { TimelineActivity, TimeBlock, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';

export class TimelineActivityParser implements TimelineParser {
  
  getName(): string {
    return 'TimelineActivityParser';
  }

  getPriority(): number {
    return 100; // 高优先级
  }

  canHandle(content: string): boolean {
    // 检查是否包含时间段标记或具体时间格式
    const hasTimeBlocks = /-\s*\*\*\s*(上午|下午|晚上|早上|中午)\s*\*\*/.test(content);
    const hasSpecificTime = /\d{1,2}:\d{2}[-~]\d{1,2}:\d{2}/.test(content);
    const hasChineseTime = /\d{1,2}[点时][-~]\d{1,2}[点时]/.test(content);

    // 如果有明确的时间格式，肯定可以处理
    if (hasTimeBlocks || hasSpecificTime || hasChineseTime) {
      return true;
    }

    // 对于长文本，如果内容足够丰富且不为空，也可以尝试处理
    const trimmedContent = content.trim();
    return trimmedContent.length > 50 && trimmedContent.length < 10000;
  }

  parse(content: string, context: ParsingContext): ParseResult<TimelineActivity[]> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log(`🔍 [${this.getName()}] 开始解析时间线活动，内容长度: ${content.length}`);

      // 输入验证
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        errors.push('输入内容为空');
        return ParseResult.failure(errors);
      }

      // 1. 首先尝试提取Markdown格式的时间段
      const timeBlocks = this.extractTimeBlocks(trimmedContent);
      let activities: TimelineActivity[] = [];

      if (timeBlocks.length > 0) {
        console.log(`🔍 找到 ${timeBlocks.length} 个时间段:`, timeBlocks.map(b => b.period));
        activities = this.parseTimeBlocks(timeBlocks, context);
      }

      // 2. 如果没有找到时间段，尝试解析具体时间格式
      if (activities.length === 0) {
        console.log('🔍 未找到标准时间段格式，尝试具体时间格式...');
        activities = this.parseSpecificTimeFormat(trimmedContent, context);

        if (activities.length === 0) {
          warnings.push('未能识别标准时间格式，使用兜底解析');
          activities = this.generateFallbackActivities(trimmedContent, context);
        }
      }

      console.log(`✅ [${this.getName()}] 解析完成，找到 ${activities.length} 个活动`);

      if (activities.length === 0) {
        errors.push('未能解析出任何有效活动');
        return ParseResult.failure(errors);
      }

      return warnings.length > 0
        ? ParseResult.successWithWarnings(activities, warnings)
        : ParseResult.success(activities);

    } catch (error) {
      const errorMsg = `解析过程中发生错误: ${error.message}`;
      console.error(`❌ [${this.getName()}] ${errorMsg}`, error);
      errors.push(errorMsg);

      // 提供兜底数据
      const fallbackActivities = this.generateFallbackActivities(content, context);
      return ParseResult.failure(errors, fallbackActivities);
    }
  }

  /**
   * 提取时间段标记（如 "- **上午**"）
   * 单一职责：只负责识别和分割时间段
   */
  private extractTimeBlocks(content: string): TimeBlock[] {
    const timeBlockRegex = /-\s*\*\*\s*(上午|下午|晚上|早上|中午)\s*\*\*\s*/g;
    const timeBlocks: TimeBlock[] = [];
    let lastIndex = 0;
    let match;

    // 找到所有时间段标记的位置
    while ((match = timeBlockRegex.exec(content)) !== null) {
      if (lastIndex > 0) {
        // 保存上一个时间段的内容
        const prevContent = content.substring(lastIndex, match.index).trim();
        if (prevContent) {
          timeBlocks[timeBlocks.length - 1].content = prevContent;
        }
      }

      timeBlocks.push({
        period: match[1],
        startIndex: match.index,
        content: ''
      });
      lastIndex = match.index + match[0].length;
    }

    // 处理最后一个时间段
    if (timeBlocks.length > 0) {
      const lastContent = content.substring(lastIndex).trim();
      timeBlocks[timeBlocks.length - 1].content = lastContent;
    }

    return timeBlocks;
  }

  /**
   * 从内容中提取活动行
   * 单一职责：识别有效的活动描述行
   */
  private extractActivityLines(content: string): string[] {
    return content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 5 && 
             (trimmed.startsWith('-') || trimmed.includes('：') || trimmed.includes(':'));
    });
  }

  /**
   * 构建单个活动对象
   * 单一职责：将描述文本转换为TimelineActivity对象
   */
  private buildActivity(period: string, description: string, context: ParsingContext): TimelineActivity {
    return {
      time: this.normalizeTimeString(period),
      period: this.getPeriodFromTime(period),
      title: this.extractActivityTitle(description),
      description: this.enhanceActivityDescription(description, period),
      icon: this.getActivityIcon(description),
      cost: this.extractCostFromDescription(description) || this.generateReasonableCost(description),
      duration: this.extractDurationFromDescription(description) || '约2-3小时',
      color: this.getActivityColor(period)
    };
  }

  /**
   * 解析时间段块
   * 单一职责：处理已分割的时间段内容
   */
  private parseTimeBlocks(timeBlocks: TimeBlock[], context: ParsingContext): TimelineActivity[] {
    const activities: TimelineActivity[] = [];

    timeBlocks.forEach((block) => {
      const { period, content } = block;

      if (!content || content.trim().length < 3) {
        console.log(`⚠️ 时间段 ${period} 内容太短，跳过`);
        return;
      }

      // 提取该时间段下的活动项
      const activityLines = this.extractActivityLines(content);

      if (activityLines.length === 0) {
        // 如果没有找到明确的活动项，将整个内容作为一个活动
        activityLines.push(content);
      }

      // 合并所有活动项为一个描述
      const description = activityLines.map(line =>
        line.replace(/^-\s*/, '').replace(/\*\*/g, '').trim()
      ).join('\n');

      if (description && description.length > 3) {
        console.log(`📅 找到活动: ${period} - ${description.substring(0, 50)}...`);
        activities.push(this.buildActivity(period, description, context));
      }
    });

    return activities;
  }

  /**
   * 解析具体时间格式（如 "09:00-12:00"）
   * 单一职责：处理具体时间格式的内容
   */
  private parseSpecificTimeFormat(content: string, context: ParsingContext): TimelineActivity[] {
    const activities: TimelineActivity[] = [];

    // 匹配多种时间格式
    const timePatterns = [
      /(\d{1,2}:\d{2}[-~]\d{1,2}:\d{2})[：:\s]*([^\n]+)/g,  // 09:00-12:00 活动
      /(\d{1,2}[点时][-~]\d{1,2}[点时])[：:\s]*([^\n]+)/g   // 9点-12点 活动
    ];

    for (const pattern of timePatterns) {
      let match;
      pattern.lastIndex = 0; // 重置正则状态

      while ((match = pattern.exec(content)) !== null) {
        const timeStr = match[1];
        const description = match[2].trim();

        if (description && description.length > 5) {
          activities.push(this.buildActivity(timeStr, description, context));
        }
      }
    }

    return activities;
  }

  /**
   * 生成兜底活动数据
   * 单一职责：当解析失败时提供合理的默认数据
   */
  private generateFallbackActivities(content: string, context: ParsingContext): TimelineActivity[] {
    const fallbackActivities: TimelineActivity[] = [];
    
    // 基于内容长度和目的地生成合理的默认活动
    const periods = ['上午', '下午', '晚上'];
    
    periods.forEach((period, index) => {
      const description = this.generateSmartFallbackDescription(period, context.destination, content);
      if (description) {
        fallbackActivities.push(this.buildActivity(period, description, context));
      }
    });

    return fallbackActivities;
  }

  /**
   * 生成智能兜底描述
   */
  private generateSmartFallbackDescription(period: string, destination: string, originalContent: string): string {
    const contentSnippet = originalContent.substring(0, 100);

    if (period === '上午') {
      return `开始${destination}的精彩一天\n• 游览当地著名景点\n💡 建议：早起避开人流高峰`;
    } else if (period === '下午') {
      return `继续探索${destination}\n• 深度体验当地文化\n🚗 交通：建议使用公共交通`;
    } else {
      return `享受${destination}的夜晚时光\n• 品尝当地特色美食\n💰 预算：人均100-200元`;
    }
  }

  // ============= 辅助方法 =============
  // 以下方法从原始代码中提取，保持相同的逻辑

  private normalizeTimeString(timeStr: string): string {
    if (timeStr.includes('上午')) return '09:00-12:00';
    if (timeStr.includes('下午')) return '14:00-17:00';
    if (timeStr.includes('晚上')) return '19:00-21:00';
    if (timeStr.includes('早上')) return '08:00-10:00';
    if (timeStr.includes('中午')) return '12:00-14:00';
    return timeStr.replace(/[点时]/g, ':').replace(/[-~]/g, '-');
  }

  private getPeriodFromTime(timeStr: string): string {
    // 优先检查明确的时间段标记
    if (timeStr.includes('上午') || timeStr.includes('早上')) return '上午';
    if (timeStr.includes('中午')) return '中午';  // 中午要在下午之前检查
    if (timeStr.includes('下午')) return '下午';
    if (timeStr.includes('晚上')) return '晚上';

    // 如果没有明确标记，根据时间推断
    const hour = parseInt(timeStr.split(':')[0] || '12');
    if (hour < 12) return '上午';
    if (hour === 12) return '中午';  // 12点算中午
    if (hour < 18) return '下午';
    return '晚上';
  }

  private extractActivityTitle(description: string): string {
    // 提取活动标题的逻辑
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
    // 匹配多种费用格式
    const costPatterns = [
      /[￥¥](\d+)/,           // ¥60
      /门票[：:]?(\d+)元/,     // 门票60元 或 门票：60元
      /费用[：:]?(\d+)元/,     // 费用60元
      /(\d+)元/               // 60元
    ];

    for (const pattern of costPatterns) {
      const match = description.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  private generateReasonableCost(description: string): number {
    if (description.includes('门票') || description.includes('景点')) return Math.floor(Math.random() * 100) + 50;
    if (description.includes('美食') || description.includes('餐厅')) return Math.floor(Math.random() * 80) + 40;
    if (description.includes('交通')) return Math.floor(Math.random() * 30) + 10;
    return Math.floor(Math.random() * 60) + 30;
  }

  private extractDurationFromDescription(description: string): string | null {
    // 匹配多种时长格式
    const durationPatterns = [
      /(\d+小时)/,              // 3小时
      /(\d+分钟)/,              // 30分钟
      /(\d+[小时分钟]+)/,       // 2小时30分钟
      /游览(\d+)小时/,          // 游览3小时
      /建议(\d+)小时/           // 建议3小时
    ];

    for (const pattern of durationPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private getActivityColor(timeStr: string): string {
    if (timeStr.includes('上午') || timeStr.includes('早上')) return 'from-yellow-400 to-orange-400';
    if (timeStr.includes('下午')) return 'from-orange-400 to-red-400';
    if (timeStr.includes('晚上')) return 'from-purple-400 to-indigo-500';
    return 'from-blue-400 to-cyan-400';
  }

  /**
   * 增强活动描述 - 将原始LLM文本转换为结构化描述
   * 从原始代码中提取，保持相同的逻辑
   */
  private enhanceActivityDescription(description: string, timeStr: string): string {
    if (!description) return '';

    // 清理描述文本，保留换行符
    let enhanced = description.trim();

    // 移除重复的时间信息
    enhanced = enhanced.replace(/\d{1,2}[:：]\d{2}[-~]\d{1,2}[:：]\d{2}/, '').trim();
    enhanced = enhanced.replace(/^[：:]\s*/, '').trim();

    // 处理多行内容，按行分割而不是按句子分割
    const lines = enhanced.split(/\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) return enhanced;

    // 重新组织内容
    const organizedContent = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 移除Markdown格式标记
      const cleanLine = trimmed.replace(/\*\*/g, '').replace(/^\-\s*/, '').trim();

      if (cleanLine.length < 3) return; // 过滤太短的内容

      // 检查是否是建议或提醒
      if (cleanLine.match(/建议|推荐|注意|提醒|小贴士|温馨提示/)) {
        organizedContent.push(`💡 ${cleanLine}`);
      }
      // 检查是否是费用信息
      else if (cleanLine.match(/[¥￥]\d+|费用|门票|价格|约.*元|人均.*元/)) {
        organizedContent.push(`💰 ${cleanLine}`);
      }
      // 检查是否是交通信息
      else if (cleanLine.match(/交通|地铁|公交|打车|步行|乘坐|前往|到达|约.*分钟/)) {
        organizedContent.push(`🚗 ${cleanLine}`);
      }
      // 检查是否是时间信息
      else if (cleanLine.match(/\d{1,2}[:：]\d{2}|\d{1,2}[点时]|约.*小时|约.*分钟/)) {
        organizedContent.push(`⏰ ${cleanLine}`);
      }
      // 如果是第一行且比较长，作为主要描述
      else if (index === 0 && cleanLine.length > 10) {
        organizedContent.push(cleanLine);
      }
      // 其他内容作为列表项
      else {
        organizedContent.push(`• ${cleanLine}`);
      }
    });

    const result = organizedContent.join('\n');

    // 不限制长度，让FormattedContent组件处理显示
    return result;
  }
}
