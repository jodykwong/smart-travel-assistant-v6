/**
 * Timeline解析架构 - JSON Schema验证器
 * 实现结构化输出的自动校验机制
 */

import { z } from 'zod';
import type { DayPlan, Activity, Segment, ValidationResult } from './types';

// Zod Schema定义
export const ActivitySchema = z.object({
  title: z.string().min(1, "活动标题不能为空"),
  description: z.string().min(1, "活动描述不能为空"),
  cost: z.number().optional(),
  duration: z.string().optional(),
  tips: z.array(z.string()).optional(),
  location: z.string().optional(),
  icon: z.string().optional(),
});

export const SegmentSchema = z.object({
  period: z.enum(['morning', 'noon', 'afternoon', 'evening', 'night']),
  time: z.string().regex(/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/, "时间格式应为 HH:MM-HH:MM"),
  activities: z.array(ActivitySchema).min(1, "每个时段至少需要一个活动"),
});

export const DayPlanSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1, "日程标题不能为空"),
  date: z.string(),
  segments: z.array(SegmentSchema).min(1, "每天至少需要一个时段"),
  weather: z.object({
    condition: z.string(),
    temperature: z.string(),
    icon: z.string(),
  }).optional(),
  location: z.string().optional(),
  totalCost: z.number().optional(),
  progress: z.number().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const TimelinePlanSchema = z.array(DayPlanSchema);

// LLM结构化输出Schema（期望的JSON格式）
export const LLMOutputSchema = z.object({
  days: z.array(z.object({
    day: z.number(),
    title: z.string(),
    segments: z.array(z.object({
      period: z.enum(['morning', 'noon', 'afternoon', 'evening', 'night']),
      time: z.string(),
      activities: z.array(z.object({
        title: z.string(),
        description: z.string(),
        cost: z.number().optional(),
        tips: z.array(z.string()).optional(),
      })),
    })),
  })),
});

/**
 * 验证DayPlan数组
 */
export function validateDayPlans(data: unknown): ValidationResult {
  try {
    const result = TimelinePlanSchema.safeParse(data);
    
    if (result.success) {
      return {
        valid: true,
        warnings: validateBusinessRules(result.data),
      };
    } else {
      return {
        valid: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`],
    };
  }
}

/**
 * 验证LLM结构化输出
 */
export function validateLLMOutput(data: unknown): ValidationResult {
  try {
    const result = LLMOutputSchema.safeParse(data);
    
    if (result.success) {
      return { valid: true };
    } else {
      return {
        valid: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`LLM输出验证出错: ${error instanceof Error ? error.message : '未知错误'}`],
    };
  }
}

/**
 * 业务规则验证
 */
function validateBusinessRules(dayPlans: DayPlan[]): string[] {
  const warnings: string[] = [];
  
  // 检查天数连续性
  const dayNumbers = dayPlans.map(d => d.day).sort((a, b) => a - b);
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i] !== dayNumbers[i-1] + 1) {
      warnings.push(`天数不连续: 第${dayNumbers[i-1]}天后应该是第${dayNumbers[i-1]+1}天`);
    }
  }
  
  // 检查时间段覆盖
  dayPlans.forEach(day => {
    const periods = day.segments.map(s => s.period);
    if (!periods.includes('morning') && !periods.includes('afternoon')) {
      warnings.push(`第${day.day}天缺少主要时段活动`);
    }
  });
  
  return warnings;
}

/**
 * 提取JSON内容（从LLM输出中剥离markdown等格式）
 */
export function extractJsonFromLLMOutput(raw: string): unknown | null {
  try {
    // 尝试直接解析
    return JSON.parse(raw.trim());
  } catch {
    // 尝试提取fenced code block中的JSON
    const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return null;
      }
    }
    
    // 尝试提取大括号包围的JSON
    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch {
        return null;
      }
    }
    
    return null;
  }
}
