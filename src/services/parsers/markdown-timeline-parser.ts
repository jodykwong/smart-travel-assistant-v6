/**
 * Markdown格式时间线解析器
 * 专门处理 "- **上午**" 这种Markdown格式的时间段标记
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';
import { TimelineParser } from './timeline-parser-interface';
import { TimelineActivityParser } from './timeline-activity-parser';

export class MarkdownTimelineParser implements TimelineParser {
  private baseParser = new TimelineActivityParser();

  getName(): string {
    return 'MarkdownTimelineParser';
  }

  getPriority(): number {
    return 90; // 高优先级，但低于基础解析器
  }

  canHandle(content: string): boolean {
    // 检查是否包含Markdown格式的时间段标记
    return /-\s*\*\*\s*(上午|下午|晚上|早上|中午)\s*\*\*/.test(content);
  }

  parse(content: string, context: ParsingContext): ParseResult<TimelineActivity[]> {
    console.log(`🔍 [${this.getName()}] 开始解析Markdown格式时间线`);
    
    // 委托给基础解析器，因为它已经包含了Markdown解析逻辑
    return this.baseParser.parse(content, context);
  }
}
