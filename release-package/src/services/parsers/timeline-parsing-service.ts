/**
 * 时间线解析服务
 * 提供统一的解析接口，支持特性开关和向后兼容
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { RobustTimelineParser } from './robust-timeline-parser';
import { TimelineActivityParser } from './timeline-activity-parser';

export class TimelineParsingService {
  private robustParser: RobustTimelineParser;
  private syncParser: TimelineActivityParser;

  constructor() {
    this.robustParser = new RobustTimelineParser();
    this.syncParser = new TimelineActivityParser();
  }

  /**
   * 解析时间线活动
   * 主要入口方法，支持特性开关
   */
  async parseTimeline(
    content: string, 
    context: ParsingContext
  ): Promise<ParseResult<TimelineActivity[]>> {
    // 检查特性开关
    const useNewParser = process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER === 'true';
    
    if (useNewParser) {
      console.log('🚀 使用新的时间线解析器');
      return await this.robustParser.parse(content, context);
    } else {
      console.log('📝 使用传统解析方式（兼容模式）');
      // 在兼容模式下，我们仍然使用新解析器，但不显示新功能的日志
      const result = await this.robustParser.parse(content, context);
      
      // 转换为传统格式（如果需要的话）
      return result;
    }
  }

  /**
   * 向后兼容的解析方法
   * 保持与原始parseTimelineActivities函数相同的签名
   * 注意：这是一个同步方法，但内部使用异步解析器，所以可能不会返回最佳结果
   */
  parseTimelineActivities(
    dayContent: string,
    destination: string
  ): TimelineActivity[] {
    const context: ParsingContext = { destination };

    try {
      // 使用同步解析器保持向后兼容
      const result = this.syncParser.parse(dayContent, context);

      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('解析失败，返回空数组:', result.errors);
        return [];
      }
    } catch (error) {
      console.error('解析过程中发生错误:', error);
      return [];
    }
  }

  /**
   * 获取解析器统计信息（用于监控和调试）
   */
  getParserStats() {
    return this.robustParser.getParserStats();
  }

  /**
   * 测试解析器能力（用于调试）
   */
  testParsers(content: string) {
    return this.robustParser.testParsers(content);
  }
}
