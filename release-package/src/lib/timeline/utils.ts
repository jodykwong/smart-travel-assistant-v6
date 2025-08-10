/**
 * Timeline解析架构 - 工具函数
 */

import type { ParseContext, DayPlan } from './types';

/**
 * 创建解析上下文的便捷函数
 */
export function createParseContext(
  destination: string,
  totalDays: number,
  sessionId: string,
  startDate?: string
): ParseContext {
  return {
    destination,
    totalDays,
    sessionId,
    startDate
  };
}

/**
 * 验证DayPlan是否有效
 */
export function isValidDayPlan(dayPlan: any): dayPlan is DayPlan {
  return (
    dayPlan &&
    typeof dayPlan.day === 'number' &&
    typeof dayPlan.title === 'string' &&
    typeof dayPlan.date === 'string' &&
    Array.isArray(dayPlan.segments) &&
    dayPlan.segments.length > 0
  );
}
