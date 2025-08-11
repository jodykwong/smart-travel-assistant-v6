/**
 * Timeline解析架构v2.0 - 核心调度器
 * 版本: 6.5.0
 * 构建时间: 2025-01-09T12:00:00.000Z
 * 实现可插拔的解析策略管理和执行
 */

import { JsonParser } from './plugins/json';
import { MarkdownPeriodParser } from './plugins/markdown';
import { NumberedListParser } from './plugins/numbered';
import { HeuristicTimeParser } from './plugins/heuristic';
import { parserRegistry } from './plugins/base';
import { validateDayPlans } from './schema';
import { convertToLegacyFormat } from './normalizer';
import type { 
  DayPlan, 
  ParseContext, 
  ParseResult, 
  ParserPlugin,
  LegacyDayActivity 
} from './types';

/**
 * Timeline解析调度器
 */
export class TimelineOrchestrator {
  private initialized = false;

  constructor() {
    this.initializeParsers();
  }

  /**
   * 初始化解析器插件
   */
  private initializeParsers(): void {
    if (this.initialized) return;

    // 注册所有解析器插件（按优先级排序）
    parserRegistry.register(new JsonParser());           // 优先级: 100
    parserRegistry.register(new MarkdownPeriodParser()); // 优先级: 80
    parserRegistry.register(new NumberedListParser());   // 优先级: 70
    parserRegistry.register(new HeuristicTimeParser());  // 优先级: 10

    this.initialized = true;
    console.log('[TimelineOrchestrator] 解析器初始化完成');
  }

  /**
   * 解析Timeline内容
   */
  async parseTimeline(raw: string, context: ParseContext): Promise<ParseResult> {
    const startTime = Date.now();
    
    console.log('[TimelineOrchestrator] 开始解析Timeline', {
      sessionId: context.sessionId,
      destination: context.destination,
      totalDays: context.totalDays,
      contentLength: raw.length
    });

    try {
      // 获取可处理该内容的解析器
      const capableParsers = parserRegistry.getCapable(raw);
      
      if (capableParsers.length === 0) {
        console.log('[TimelineOrchestrator] 没有找到可处理的解析器');
        return {
          success: false,
          error: '没有找到合适的解析器',
          metadata: {
            structuredHit: false,
            parseTime: Date.now() - startTime,
            repairAttempts: 0
          }
        };
      }

      console.log('[TimelineOrchestrator] 找到可用解析器', {
        parsers: capableParsers.map(p => p.name),
        count: capableParsers.length
      });

      // 尝试每个解析器
      let bestResult: DayPlan[] | null = null;
      let bestScore = 0;
      let usedParser = '';
      let structuredHit = false;

      for (const parser of capableParsers) {
        try {
          console.log(`[TimelineOrchestrator] 尝试解析器: ${parser.name}`);
          
          const result = await parser.tryParse(raw, context);
          
          if (result && result.length > 0) {
            // 验证解析结果
            const validation = validateDayPlans(result);
            
            if (validation.valid) {
              const score = parser.score ? parser.score(result) : this.calculateDefaultScore(result);
              
              console.log(`[TimelineOrchestrator] 解析器 ${parser.name} 成功`, {
                daysCount: result.length,
                score,
                warnings: validation.warnings?.length || 0
              });

              if (score > bestScore) {
                bestResult = result;
                bestScore = score;
                usedParser = parser.name;
                structuredHit = parser.name === 'JsonParser';
              }
            } else {
              console.log(`[TimelineOrchestrator] 解析器 ${parser.name} 验证失败`, {
                errors: validation.errors
              });
            }
          } else {
            console.log(`[TimelineOrchestrator] 解析器 ${parser.name} 返回空结果`);
          }
        } catch (error) {
          console.log(`[TimelineOrchestrator] 解析器 ${parser.name} 出错`, {
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      const parseTime = Date.now() - startTime;

      if (bestResult) {
        console.log('[TimelineOrchestrator] 解析成功', {
          parser: usedParser,
          daysCount: bestResult.length,
          totalSegments: bestResult.reduce((sum, day) => sum + day.segments.length, 0),
          totalActivities: bestResult.reduce((sum, day) => 
            sum + day.segments.reduce((segSum, seg) => segSum + seg.activities.length, 0), 0
          ),
          score: bestScore,
          parseTime,
          structuredHit
        });

        return {
          success: true,
          data: bestResult,
          parser: usedParser,
          metadata: {
            structuredHit,
            parseTime,
            repairAttempts: 0
          }
        };
      } else {
        console.log('[TimelineOrchestrator] 所有解析器都失败了');
        return {
          success: false,
          error: '所有解析器都无法处理该内容',
          metadata: {
            structuredHit: false,
            parseTime,
            repairAttempts: 0
          }
        };
      }

    } catch (error) {
      const parseTime = Date.now() - startTime;
      console.error('[TimelineOrchestrator] 解析过程出错', {
        error: error instanceof Error ? error.message : '未知错误',
        parseTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '解析过程出现未知错误',
        metadata: {
          structuredHit: false,
          parseTime,
          repairAttempts: 0
        }
      };
    }
  }

  /**
   * 解析并转换为兼容格式
   */
  async parseTimelineToLegacyFormat(raw: string, context: ParseContext): Promise<LegacyDayActivity[]> {
    const result = await this.parseTimeline(raw, context);
    
    if (result.success && result.data) {
      return convertToLegacyFormat(result.data);
    } else {
      throw new Error(result.error || '解析失败');
    }
  }

  /**
   * 计算默认评分
   */
  private calculateDefaultScore(result: DayPlan[]): number {
    let score = 0;
    
    // 基础分数：每天10分
    score += result.length * 10;
    
    // 内容完整性：每个时段5分
    result.forEach(day => {
      score += day.segments.length * 5;
      
      // 活动数量：每个活动2分
      day.segments.forEach(segment => {
        score += segment.activities.length * 2;
        
        // 活动质量：有描述+1分，有费用+1分
        segment.activities.forEach(activity => {
          if (activity.description && activity.description.length > 10) score += 1;
          if (activity.cost !== undefined) score += 1;
        });
      });
    });
    
    return score;
  }

  /**
   * 获取解析器统计信息
   */
  getParserStats(): { name: string; priority: number }[] {
    return parserRegistry.getAll().map(parser => ({
      name: parser.name,
      priority: parser.priority
    }));
  }

  /**
   * 重新初始化解析器（用于测试）
   */
  reinitialize(): void {
    parserRegistry.clear();
    this.initialized = false;
    this.initializeParsers();
  }
}

// 全局实例
export const timelineOrchestrator = new TimelineOrchestrator();

/**
 * 便捷函数：解析Timeline内容
 */
export async function parseTimelineContent(
  raw: string, 
  context: ParseContext
): Promise<ParseResult> {
  return timelineOrchestrator.parseTimeline(raw, context);
}

/**
 * 便捷函数：解析为兼容格式
 */
export async function parseTimelineToLegacy(
  raw: string,
  context: ParseContext
): Promise<LegacyDayActivity[]> {
  return timelineOrchestrator.parseTimelineToLegacyFormat(raw, context);
}
