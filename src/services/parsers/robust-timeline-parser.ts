/**
 * 健壮的时间线解析器
 * 实现容错机制，自动选择最佳解析器，提供降级方案
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';
import { TimelineActivityParser } from './timeline-activity-parser';
import { FallbackTimelineParser } from './fallback-timeline-parser';

export class RobustTimelineParser {
  private parsers: TimelineParser[];

  constructor() {
    // 简化的解析器列表 - 移除冗余的解析器
    this.parsers = [
      new TimelineActivityParser(),      // 优先级 100 - 处理所有标准格式
      new FallbackTimelineParser()       // 优先级 10 - 兜底处理
    ].sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 简化的解析方法 - 直接使用主解析器，失败时使用兜底
   */
  async parse(content: string, context: ParsingContext): Promise<ParseResult<TimelineActivity[]>> {
    const startTime = Date.now();

    // 输入验证
    if (!content || content.trim().length === 0) {
      console.warn('⚠️ 输入内容为空，返回兜底数据');
      const fallbackData = this.generateEmergencyFallback(context);
      return ParseResult.failure(['输入内容为空'], fallbackData);
    }

    // 上下文验证
    if (!context || !context.destination) {
      console.warn('⚠️ 解析上下文不完整，使用默认值');
      context = { destination: '未知目的地', ...context };
    }

    console.log(`🚀 [RobustTimelineParser] 开始解析，内容长度: ${content.length}`);

    try {
      // 首先尝试主解析器
      const mainParser = this.parsers[0]; // TimelineActivityParser
      console.log(`🔍 使用主解析器: ${mainParser.getName()}`);

      const result = mainParser.parse(content, context);

      if (result.success && result.data && result.data.length > 0) {
        const duration = Date.now() - startTime;
        console.log(`✅ 主解析器成功，找到 ${result.data.length} 个活动，耗时: ${duration}ms`);

        // 添加性能警告
        const warnings = [...(result.warnings || [])];
        if (duration > 100) {
          warnings.push(`解析耗时较长: ${duration}ms`);
        }

        return ParseResult.success(result.data, warnings);
      } else {
        console.log(`⚠️ 主解析器失败，尝试兜底解析器:`, result.errors);
      }
    } catch (error) {
      console.error(`💥 主解析器异常:`, error);
    }

    try {
      // 使用兜底解析器
      const fallbackParser = this.parsers[1]; // FallbackTimelineParser
      console.log(`🔍 使用兜底解析器: ${fallbackParser.getName()}`);

      const result = fallbackParser.parse(content, context);
      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        console.log(`✅ 兜底解析器成功，找到 ${result.data.length} 个活动，耗时: ${duration}ms`);

        const warnings = [...(result.warnings || []), '使用了兜底解析器'];
        if (duration > 100) {
          warnings.push(`解析耗时较长: ${duration}ms`);
        }

        return ParseResult.success(result.data, warnings);
      }
    } catch (error) {
      console.error(`💥 兜底解析器也失败了:`, error);
    }

    // 所有解析器都失败，返回紧急兜底数据
    console.error('💥 所有解析器都失败，返回紧急兜底数据');
    const emergencyData = this.generateEmergencyFallback(context);
    const duration = Date.now() - startTime;

    return ParseResult.failure(
      ['主解析器和兜底解析器都失败', `总耗时: ${duration}ms`],
      emergencyData
    );
  }

  /**
   * 生成紧急兜底数据（当所有解析器都失败时）
   */
  private generateEmergencyFallback(context: ParsingContext): TimelineActivity[] {
    console.log('🆘 生成紧急兜底数据');
    
    return [{
      time: '09:00-18:00',
      period: '全天',
      title: `${context.destination}自由行`,
      description: `自由探索${context.destination}\n• 根据个人兴趣安排行程\n• 发现意想不到的精彩\n💡 建议：保持灵活性，享受旅行的惊喜`,
      icon: '🗺️',
      cost: 300,
      duration: '全天',
      color: 'from-gray-400 to-gray-600'
    }];
  }

  /**
   * 获取解析器统计信息（用于调试和监控）
   */
  getParserStats(): Array<{ name: string; priority: number; canHandle: (content: string) => boolean }> {
    return this.parsers.map(parser => ({
      name: parser.getName(),
      priority: parser.getPriority(),
      canHandle: parser.canHandle.bind(parser)
    }));
  }

  /**
   * 测试所有解析器对特定内容的处理能力（用于调试）
   */
  testParsers(content: string): Array<{ name: string; canHandle: boolean; priority: number }> {
    return this.parsers.map(parser => ({
      name: parser.getName(),
      canHandle: parser.canHandle(content),
      priority: parser.getPriority()
    }));
  }
}
