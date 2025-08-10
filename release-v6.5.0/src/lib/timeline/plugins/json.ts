/**
 * Timeline解析插件 - JSON结构化解析器
 * 优先处理LLM的结构化JSON输出
 */

import { BaseParser } from './base';
import { extractJsonFromLLMOutput, validateLLMOutput } from '../schema';
import { normalizeLLMOutput } from '../normalizer';
import type { DayPlan, ParseContext } from '../types';

export class JsonParser extends BaseParser {
  name = 'JsonParser';
  priority = 100; // 最高优先级

  /**
   * 检查是否可以处理该内容
   */
  canHandle(raw: string): boolean {
    // 检查是否包含JSON结构
    return raw.includes('{') && raw.includes('}') && 
           (raw.includes('"days"') || raw.includes('"day"') || raw.includes('```json'));
  }

  /**
   * 尝试解析JSON格式的内容
   */
  async tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null> {
    this.log('开始JSON解析', { contentLength: raw.length });

    try {
      // 提取JSON内容
      const jsonData = extractJsonFromLLMOutput(raw);
      if (!jsonData) {
        this.log('未能提取JSON内容');
        return null;
      }

      this.log('成功提取JSON', { hasData: !!jsonData });

      // 验证JSON结构
      const validation = validateLLMOutput(jsonData);
      if (!validation.valid) {
        this.log('JSON结构验证失败', { errors: validation.errors });
        
        // 尝试修复常见问题
        const repairedData = this.repairJsonStructure(jsonData);
        if (repairedData) {
          const repairedValidation = validateLLMOutput(repairedData);
          if (repairedValidation.valid) {
            this.log('JSON结构修复成功');
            return this.normalizeAndReturn(repairedData, context);
          }
        }
        
        return null;
      }

      this.log('JSON结构验证通过');
      return this.normalizeAndReturn(jsonData, context);

    } catch (error) {
      this.log('JSON解析出错', { error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  /**
   * 规范化并返回结果
   */
  private normalizeAndReturn(jsonData: any, context: ParseContext): DayPlan[] {
    try {
      const normalized = normalizeLLMOutput(jsonData, context);
      this.log('JSON规范化成功', { 
        daysCount: normalized.length,
        totalSegments: normalized.reduce((sum, day) => sum + day.segments.length, 0)
      });
      return normalized;
    } catch (error) {
      this.log('JSON规范化失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 修复常见的JSON结构问题
   */
  private repairJsonStructure(data: any): any | null {
    try {
      // 如果直接是days数组，包装成标准格式
      if (Array.isArray(data) && data.length > 0 && data[0].day) {
        this.log('修复：包装days数组');
        return { days: data };
      }

      // 如果缺少days字段但有其他天数字段
      if (typeof data === 'object' && !data.days) {
        const dayKeys = Object.keys(data).filter(key => key.match(/day\d+|第\d+天/));
        if (dayKeys.length > 0) {
          this.log('修复：转换天数字段为days数组');
          const days = dayKeys.map((key, index) => ({
            day: index + 1,
            title: data[key].title || `第${index + 1}天`,
            segments: data[key].segments || []
          }));
          return { days };
        }
      }

      // 修复segments结构
      if (data.days && Array.isArray(data.days)) {
        const repairedDays = data.days.map((day: any) => {
          if (!day.segments || !Array.isArray(day.segments)) {
            // 尝试从其他字段构建segments
            const segments = [];
            
            if (day.morning) {
              segments.push({
                period: 'morning',
                time: '09:00-12:00',
                activities: Array.isArray(day.morning) ? day.morning : [{ title: day.morning, description: '' }]
              });
            }
            
            if (day.afternoon) {
              segments.push({
                period: 'afternoon',
                time: '14:00-17:00',
                activities: Array.isArray(day.afternoon) ? day.afternoon : [{ title: day.afternoon, description: '' }]
              });
            }
            
            if (day.evening) {
              segments.push({
                period: 'evening',
                time: '18:00-21:00',
                activities: Array.isArray(day.evening) ? day.evening : [{ title: day.evening, description: '' }]
              });
            }
            
            day.segments = segments;
          }
          
          return day;
        });
        
        this.log('修复：重构segments结构');
        return { days: repairedDays };
      }

      return null;
    } catch (error) {
      this.log('JSON修复失败', { error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  /**
   * 评分函数 - JSON格式给予额外加分
   */
  score(result: DayPlan[]): number {
    const baseScore = super.score(result);
    // JSON格式额外加50分，因为这是最理想的格式
    return baseScore + 50;
  }
}
