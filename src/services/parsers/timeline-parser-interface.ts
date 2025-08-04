/**
 * 时间线解析器接口定义
 * 支持策略模式，可以根据内容格式选择不同的解析器
 */

import { TimelineActivity, ParsingContext } from '@/types/timeline-activity';
import { ParseResult } from '@/types/parse-result';

export interface TimelineParser {
  /**
   * 检查是否能处理给定的内容格式
   */
  canHandle(content: string): boolean;

  /**
   * 解析内容为时间线活动列表
   */
  parse(content: string, context: ParsingContext): ParseResult<TimelineActivity[]>;

  /**
   * 获取解析器名称（用于调试和日志）
   */
  getName(): string;

  /**
   * 获取解析器优先级（数字越大优先级越高）
   */
  getPriority(): number;
}
