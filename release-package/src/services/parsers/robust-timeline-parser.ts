/**
 * 健壮的时间线解析器
 * 实现容错机制，自动选择最佳解析器，提供降级方案
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';
import { TimelineActivityParser } from './timeline-activity-parser';
import { MarkdownTimelineParser } from './markdown-timeline-parser';
import { StructuredTimelineParser } from './structured-timeline-parser';
import { FallbackTimelineParser } from './fallback-timeline-parser';

export class RobustTimelineParser {
  private parsers: TimelineParser[];

  constructor() {
    // 按优先级排序的解析器列表
    this.parsers = [
      new TimelineActivityParser(),      // 优先级 100
      new MarkdownTimelineParser(),      // 优先级 90
      new StructuredTimelineParser(),    // 优先级 80
      new FallbackTimelineParser()       // 优先级 10 (兜底)
    ].sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 解析时间线活动，自动选择最佳解析器
   */
  async parse(content: string, context: ParsingContext): Promise<ParseResult<TimelineActivity[]>> {
    const startTime = Date.now();

    // 输入验证 - 处理null/undefined情况
    if (!content) {
      console.warn('⚠️ 输入内容为null或undefined，返回紧急兜底数据');
      const emergencyData = this.generateEmergencyFallback(context);
      return ParseResult.failure(['输入内容为空'], emergencyData);
    }

    console.log(`🚀 [RobustTimelineParser] 开始解析，内容长度: ${content.length}`);

    if (content.trim().length === 0) {
      console.warn('⚠️ 输入内容为空，返回空结果');
      return ParseResult.failure(['输入内容为空'], []);
    }

    if (!context || !context.destination) {
      console.warn('⚠️ 解析上下文不完整，使用默认值');
      context = { destination: '未知目的地', ...context };
    }

    let bestResult: ParseResult<TimelineActivity[]> | null = null;
    let bestParser: TimelineParser | null = null;
    const attemptResults: Array<{ parser: string; success: boolean; error?: string }> = [];

    // 尝试每个解析器
    for (const parser of this.parsers) {
      try {
        console.log(`🔍 尝试解析器: ${parser.getName()}`);

        // 检查解析器是否能处理该内容
        if (!parser.canHandle(content)) {
          console.log(`⏭️ ${parser.getName()} 无法处理该内容格式，跳过`);
          attemptResults.push({ parser: parser.getName(), success: false, error: '不支持该内容格式' });
          continue;
        }

        // 执行解析
        const result = parser.parse(content, context);
        attemptResults.push({ parser: parser.getName(), success: result.success });

        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ ${parser.getName()} 解析成功，找到 ${result.data.length} 个活动`);
          bestResult = result;
          bestParser = parser;
          break; // 找到成功的解析器就停止
        } else {
          console.log(`❌ ${parser.getName()} 解析失败或无结果:`, result.errors);
        }

      } catch (error) {
        console.error(`💥 ${parser.getName()} 解析时发生异常:`, error);
        attemptResults.push({ parser: parser.getName(), success: false, error: error.message });
        
        // 如果不是兜底解析器，继续尝试下一个
        if (parser.getName() !== 'FallbackTimelineParser') {
          continue;
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 记录解析结果
    console.log(`📊 解析完成，耗时: ${duration}ms`);
    console.log('📋 解析器尝试结果:', attemptResults);

    if (bestResult && bestResult.success) {
      console.log(`🎉 最终使用解析器: ${bestParser?.getName()}`);
      
      // 添加性能和解析器信息到警告中
      const performanceWarnings = [];
      if (duration > 100) {
        performanceWarnings.push(`解析耗时较长: ${duration}ms`);
      }
      if (bestParser?.getName() === 'FallbackTimelineParser') {
        performanceWarnings.push('使用了兜底解析器，结果可能不够准确');
      }

      if (performanceWarnings.length > 0) {
        const updatedWarnings = [...(bestResult.warnings || []), ...performanceWarnings];
        return ParseResult.successWithWarnings(bestResult.data!, updatedWarnings);
      }

      return bestResult;
    }

    // 所有解析器都失败了
    console.error('💀 所有解析器都失败了，返回错误结果');
    const allErrors = attemptResults
      .filter(r => !r.success && r.error)
      .map(r => `${r.parser}: ${r.error}`);

    return ParseResult.failure(
      ['所有解析器都失败了', ...allErrors],
      this.generateEmergencyFallback(context)
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
