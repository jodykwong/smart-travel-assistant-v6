/**
 * Timeline解析架构 - 统一入口
 * 导出所有公共接口和类型
 */

// 核心类型
export type {
  DayPlan,
  Segment,
  Activity,
  Period,
  ParseContext,
  ParseResult,
  ParserPlugin,
  ValidationResult,
  LegacyDayActivity,
  LegacyTimelineItem
} from './types';

// 核心功能
export {
  timelineOrchestrator,
  parseTimelineContent,
  parseTimelineToLegacy,
  TimelineOrchestrator
} from './orchestrator';

// 验证和规范化
export {
  validateDayPlans,
  validateLLMOutput,
  extractJsonFromLLMOutput
} from './schema';

export {
  normalizeLLMOutput,
  normalizeMarkdownOutput,
  normalizeNumberedListOutput,
  convertToLegacyFormat
} from './normalizer';

// 解析器插件
export { JsonParser } from './plugins/json';
export { MarkdownPeriodParser } from './plugins/markdown';
export { NumberedListParser } from './plugins/numbered';
export { HeuristicTimeParser } from './plugins/heuristic';
export { BaseParser, parserRegistry } from './plugins/base';

// 便捷函数
export { createParseContext, isValidDayPlan } from './utils';

/**
 * 获取解析器版本信息
 */
export function getTimelineParserVersion(): string {
  return '2.0.0';
}

/**
 * 获取支持的解析格式列表
 */
export function getSupportedFormats(): string[] {
  return [
    'JSON结构化输出',
    'Markdown时间段格式',
    '数字列表格式',
    '启发式文本解析'
  ];
}
