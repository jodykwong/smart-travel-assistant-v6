/**
 * 智游助手v5.0 - 基础解析器
 * 提供通用的文本解析功能和抽象接口
 */

export interface ParseResult<T> {
  success: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
}

export abstract class BaseParser<T> {
  protected content: string;
  protected errors: string[] = [];
  protected warnings: string[] = [];

  constructor(content: string) {
    this.content = content;
  }

  /**
   * 主解析方法，子类必须实现
   */
  abstract parse(): ParseResult<T>;

  /**
   * 提取指定关键词之间的内容
   */
  protected extractSection(startKeywords: string[], endKeywords?: string[]): string {
    const lines = this.content.split('\n');
    const result: string[] = [];
    let capturing = false;
    let foundStart = false;

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      
      // 检查开始关键词
      if (!foundStart && startKeywords.some(keyword => 
        trimmedLine.includes(keyword.toLowerCase())
      )) {
        foundStart = true;
        capturing = true;
        continue;
      }

      // 检查结束关键词
      if (capturing && endKeywords && endKeywords.some(keyword => 
        trimmedLine.includes(keyword.toLowerCase())
      )) {
        break;
      }

      // 收集内容
      if (capturing && line.trim()) {
        result.push(line.trim());
      }
    }

    return result.join('\n');
  }

  /**
   * 提取列表项
   */
  protected extractListItems(text: string, patterns: RegExp[] = []): string[] {
    const defaultPatterns = [
      /^[-*•]\s+(.+)$/,  // - item, * item, • item
      /^\d+\.\s+(.+)$/,  // 1. item
      /^[一二三四五六七八九十]\s*[、.]\s*(.+)$/,  // 一、item
    ];

    const allPatterns = [...defaultPatterns, ...patterns];
    const lines = text.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of allPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]) {
          items.push(match[1].trim());
          break;
        }
      }
    }

    return items;
  }

  /**
   * 提取价格信息
   */
  protected extractPrices(text: string): number[] {
    const pricePatterns = [
      /¥(\d+(?:,\d{3})*(?:\.\d{2})?)/g,  // ¥1,000.00
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*元/g,  // 1000元
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,  // $1,000.00
    ];

    const prices: number[] = [];
    
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        if (!isNaN(price)) {
          prices.push(price);
        }
      }
    }

    return prices;
  }

  /**
   * 提取时间信息
   */
  protected extractTimeInfo(text: string): { times: string[], durations: string[] } {
    const timePatterns = [
      /(\d{1,2}:\d{2})/g,  // 09:00
      /(\d{1,2}点\d{0,2}分?)/g,  // 9点30分
    ];

    const durationPatterns = [
      /(\d+(?:\.\d+)?\s*(?:小时|hour|hr))/gi,
      /(\d+(?:\.\d+)?\s*(?:分钟|minute|min))/gi,
      /(\d+(?:\.\d+)?\s*(?:天|day))/gi,
    ];

    const times: string[] = [];
    const durations: string[] = [];

    // 提取时间
    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        times.push(match[1]);
      }
    }

    // 提取时长
    for (const pattern of durationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        durations.push(match[1]);
      }
    }

    return { times, durations };
  }

  /**
   * 清理和标准化文本
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/\n\s*\n/g, '\n')  // 合并多个换行
      .trim();
  }

  /**
   * 提取评分信息
   */
  protected extractRatings(text: string): number[] {
    const ratingPatterns = [
      /(\d(?:\.\d)?)\s*[分星]/g,  // 4.5分, 5星
      /(\d(?:\.\d)?)\s*\/\s*[5510]/g,  // 4.5/5, 9/10
    ];

    const ratings: number[] = [];
    
    for (const pattern of ratingPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const rating = parseFloat(match[1]);
        if (!isNaN(rating)) {
          ratings.push(rating);
        }
      }
    }

    return ratings;
  }

  /**
   * 添加错误信息
   */
  protected addError(message: string): void {
    this.errors.push(message);
  }

  /**
   * 添加警告信息
   */
  protected addWarning(message: string): void {
    this.warnings.push(message);
  }

  /**
   * 重置解析状态
   */
  protected reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 创建解析结果
   */
  protected createResult<U>(data: U | null): ParseResult<U> {
    return {
      success: data !== null && this.errors.length === 0,
      data,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }
}
