/**
 * 智游助手v5.0 - 主旅行计划解析器（第二阶段重构版）
 * 重构目标：
 * - 集成统一的高德MCP数据服务
 * - 简化解析逻辑，专注于LLM响应结构化
 * - 优化解析性能至500ms以内
 * - 保持100%向后兼容性
 */

import { ParseResult } from './base-parser';
import { AccommodationParser } from './accommodation-parser';
import { FoodParser } from './food-parser';
import { TransportParser } from './transport-parser';
import { TipsParser } from './tips-parser';
import { TravelDataService } from '../travel-data-service';
import { TravelPlanData, ParseConfig } from '../../types/travel-plan';

export interface TravelPlanParseResult extends ParseResult<TravelPlanData> {
  moduleResults: {
    accommodation: ParseResult<any>;
    food: ParseResult<any>;
    transport: ParseResult<any>;
    tips: ParseResult<any>;
  };
  performance: {
    parseTime: number;
    dataEnhancementTime: number;
    totalTime: number;
    cacheHit: boolean;
  };
}

export class TravelPlanParser {
  private content: string;
  private config: Required<ParseConfig>;
  private dataService: TravelDataService; // 集成统一数据服务

  constructor(content: string, config?: Partial<ParseConfig>) {
    this.content = content;
    this.config = {
      enabledModules: ['accommodation', 'food', 'transport', 'tips'],
      strictMode: false,
      fallbackToDefault: true,
      customKeywords: {
        accommodation: ['住宿', '酒店', '旅馆', '民宿', '客栈'],
        food: ['美食', '餐厅', '小吃', '特色菜', '料理'],
        transport: ['交通', '出行', '路线', '车票', '机票'],
        tips: ['贴士', '建议', '注意', '提醒', '小贴士'],
      },
      ...config,
    };

    // 初始化统一数据服务
    this.dataService = new TravelDataService({
      enableCache: true,
      cacheTimeout: 1800, // 30分钟缓存
      enableRetry: true,
      maxRetries: 1,
    });

    console.log('📝 旅行计划解析器初始化 (第二阶段重构 - 集成高德MCP数据服务)');
  }

  /**
   * 解析完整的旅行计划（第二阶段重构版）
   *
   * 重构改进：
   * 1. 并行解析LLM响应和获取高德MCP数据
   * 2. 智能数据合并，保持向后兼容
   * 3. 性能优化，目标500ms以内
   * 4. 增强错误处理和性能监控
   */
  async parse(planMetadata: {
    id: string;
    title: string;
    destination: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    totalCost: number;
    groupSize: number;
  }): Promise<TravelPlanParseResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let cacheHit = false;

    try {
      console.log(`📝 开始解析旅行计划: ${planMetadata.destination} (第二阶段重构)`);

      // 1. 并行执行：LLM响应解析 + 高德MCP数据获取
      const parseStartTime = Date.now();
      const [moduleResults, enhancedData] = await Promise.all([
        this.parseModules(), // 解析LLM响应
        this.dataService.getAllTravelData(planMetadata.destination) // 获取高德MCP数据
      ]);
      const parseTime = Date.now() - parseStartTime;

      // 2. 智能数据合并，保持向后兼容
      const dataEnhancementStartTime = Date.now();
      const mergedData = this.mergeDataIntelligently(moduleResults, enhancedData);
      const dataEnhancementTime = Date.now() - dataEnhancementStartTime;

      // 3. 收集所有错误和警告
      Object.values(moduleResults).forEach(result => {
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      });

      // 4. 检查缓存命中情况
      cacheHit = enhancedData.accommodation.source === 'cache' ||
                 enhancedData.food.source === 'cache' ||
                 enhancedData.transport.source === 'cache' ||
                 enhancedData.tips.source === 'cache';

      // 5. 提取行程概览
      const overview = this.extractOverview();

      // 6. 构建完整的旅行计划数据（保持向后兼容）
      const travelPlanData: TravelPlanData = {
        ...planMetadata,
        overview,
        accommodation: mergedData.accommodation,
        foodExperience: mergedData.foodExperience,
        transportation: mergedData.transportation,
        tips: mergedData.tips,
        createdAt: new Date().toISOString(),
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ 解析完成 (${totalTime}ms: 解析${parseTime}ms + 增强${dataEnhancementTime}ms, 缓存命中: ${cacheHit})`);

      return {
        success: errors.length === 0,
        data: travelPlanData,
        errors,
        warnings,
        moduleResults,
        performance: {
          parseTime,
          dataEnhancementTime,
          totalTime,
          cacheHit,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ 解析失败 (${totalTime}ms):`, error);
      errors.push(`解析旅行计划时出错: ${error.message}`);

      return {
        success: false,
        data: null,
        errors,
        warnings,
        moduleResults: {
          accommodation: { success: false, data: null, errors: [], warnings: [] },
          food: { success: false, data: null, errors: [], warnings: [] },
          transport: { success: false, data: null, errors: [], warnings: [] },
          tips: { success: false, data: null, errors: [], warnings: [] },
        },
        performance: {
          parseTime: 0,
          dataEnhancementTime: 0,
          totalTime,
          cacheHit: false,
        },
      };
    }
  }

  /**
   * 智能数据合并方法
   * 将LLM解析结果与高德MCP数据智能合并，保持向后兼容
   */
  private mergeDataIntelligently(moduleResults: any, enhancedData: any) {
    console.log('🔄 开始智能数据合并...');

    return {
      // 住宿数据：优先使用高德MCP数据，LLM数据作为补充
      accommodation: {
        ...moduleResults.accommodation.data,
        ...enhancedData.accommodation.data,
        // 保持LLM解析的文本描述
        bookingTips: moduleResults.accommodation.data?.bookingTips ||
                    enhancedData.accommodation.data?.bookingTips ||
                    '建议提前预订，关注官方渠道获取最新信息',
      },

      // 美食数据：合并LLM特色描述和高德MCP实际数据
      foodExperience: {
        ...moduleResults.food.data,
        ...enhancedData.food.data,
        // 保持LLM解析的特色菜品
        specialties: moduleResults.food.data?.specialties ||
                    enhancedData.food.data?.specialties ||
                    ['当地特色菜', '传统小吃'],
        // 使用高德MCP的实际餐厅数据
        recommendedRestaurants: enhancedData.food.data?.recommendedRestaurants ||
                               moduleResults.food.data?.recommendedRestaurants || [],
      },

      // 交通数据：完全使用高德MCP数据（高德在交通方面优势明显）
      transportation: enhancedData.transport.data ||
                     moduleResults.transport.data ||
                     this.createDefaultTransport(),

      // 贴士数据：合并LLM文化贴士和高德MCP天气数据
      tips: {
        ...moduleResults.tips.data,
        // 使用高德MCP的准确天气数据
        weather: enhancedData.tips.data?.weather ||
                moduleResults.tips.data?.weather || [],
        // 保持LLM的文化和安全贴士
        cultural: moduleResults.tips.data?.cultural ||
                 enhancedData.tips.data?.cultural ||
                 ['尊重当地文化', '遵守当地法规'],
        safety: moduleResults.tips.data?.safety ||
               enhancedData.tips.data?.safety ||
               ['保管好个人财物', '注意人身安全'],
      },
    };
  }

  /**
   * 解析各个模块
   */
  private async parseModules() {
    const results = {
      accommodation: { success: false, data: null, errors: [], warnings: [] } as ParseResult<any>,
      food: { success: false, data: null, errors: [], warnings: [] } as ParseResult<any>,
      transport: { success: false, data: null, errors: [], warnings: [] } as ParseResult<any>,
      tips: { success: false, data: null, errors: [], warnings: [] } as ParseResult<any>,
    };

    // 并行解析各个模块
    const parsePromises = [];

    if (this.config.enabledModules.includes('accommodation')) {
      parsePromises.push(
        this.parseWithRetry(() => new AccommodationParser(this.content).parse())
          .then(result => { results.accommodation = result; })
      );
    }

    if (this.config.enabledModules.includes('food')) {
      parsePromises.push(
        this.parseWithRetry(() => new FoodParser(this.content).parse())
          .then(result => { results.food = result; })
      );
    }

    if (this.config.enabledModules.includes('transport')) {
      parsePromises.push(
        this.parseWithRetry(() => new TransportParser(this.content).parse())
          .then(result => { results.transport = result; })
      );
    }

    if (this.config.enabledModules.includes('tips')) {
      parsePromises.push(
        this.parseWithRetry(() => new TipsParser(this.content).parse())
          .then(result => { results.tips = result; })
      );
    }

    await Promise.all(parsePromises);
    return results;
  }

  /**
   * 带重试机制的解析
   */
  private async parseWithRetry<T>(parseFunction: () => ParseResult<T>, maxRetries = 2): Promise<ParseResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = parseFunction();
        
        if (result.success || !this.config.strictMode) {
          return result;
        }
        
        lastError = new Error(`解析失败: ${result.errors.join(', ')}`);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    // 如果所有重试都失败，返回失败结果
    return {
      success: false,
      data: null,
      errors: [lastError?.message || '解析失败'],
      warnings: [],
    };
  }

  /**
   * 提取行程概览
   */
  private extractOverview(): string {
    const lines = this.content.split('\n');
    const overviewLines: string[] = [];
    let dayDetailStarted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // 检测是否开始每日详细安排
      if (line.includes('Day ') || (line.includes('第') && (line.includes('天') || line.includes('日')))) {
        dayDetailStarted = true;
        break;
      }

      // 如果还没开始每日详细安排，且行数不超过15行，则包含在概览中
      if (!dayDetailStarted && overviewLines.length < 15) {
        overviewLines.push(line);
      }
    }

    // 如果没有找到明显的概览信息，则取前10行作为概览
    if (overviewLines.length === 0) {
      return lines.slice(0, 10).join('\n');
    }

    return overviewLines.join('\n');
  }

  /**
   * 创建默认住宿数据
   */
  private createDefaultAccommodation() {
    return {
      overview: '为您推荐优质住宿选择',
      recommendations: [{
        name: '推荐住宿',
        type: 'hotel' as const,
        amenities: ['免费WiFi', '24小时前台'],
        priceRange: '根据预算选择',
      }],
      bookingTips: ['建议提前预订以获得更好的价格'],
      budgetAdvice: '根据预算选择合适的住宿类型',
    };
  }

  /**
   * 创建默认美食数据
   */
  private createDefaultFood() {
    return {
      overview: '探索当地特色美食文化',
      specialties: ['当地特色美食'],
      recommendedRestaurants: [{
        name: '当地特色餐厅',
        type: 'restaurant' as const,
        cuisine: '当地菜系',
        specialties: ['当地特色菜'],
        priceRange: '价格适中',
      }],
      foodDistricts: [],
      localTips: ['尝试当地特色菜肴'],
    };
  }

  /**
   * 创建默认交通数据
   */
  private createDefaultTransport() {
    return {
      overview: '便捷的交通出行方案',
      arrivalOptions: [{
        type: 'flight' as const,
        name: '航班',
        description: '便捷的到达方式',
      }],
      localTransport: [
        {
          type: 'metro' as const,
          name: '地铁',
          description: '快速便捷的市内交通',
        },
        {
          type: 'bus' as const,
          name: '公交',
          description: '经济实惠的出行选择',
        },
      ],
      routes: [],
      tips: ['选择合适的交通方式'],
    };
  }

  /**
   * 创建默认贴士数据
   */
  private createDefaultTips() {
    return {
      overview: '实用的旅行贴士和建议',
      weather: [{
        season: '全年',
        temperature: '适宜',
        rainfall: '正常',
        clothing: ['根据季节准备'],
      }],
      cultural: [],
      safety: [],
      shopping: [],
      budgetTips: ['合理规划预算'],
    };
  }

  /**
   * 验证解析结果
   */
  private validateResult(data: TravelPlanData): string[] {
    const errors: string[] = [];

    if (!data.id) errors.push('缺少计划ID');
    if (!data.destination) errors.push('缺少目的地信息');
    if (!data.accommodation) errors.push('缺少住宿信息');
    if (!data.foodExperience) errors.push('缺少美食信息');
    if (!data.transportation) errors.push('缺少交通信息');
    if (!data.tips) errors.push('缺少贴士信息');

    return errors;
  }

  /**
   * 获取解析统计信息
   */
  getParseStats(result: TravelPlanParseResult) {
    return {
      totalModules: Object.keys(result.moduleResults).length,
      successfulModules: Object.values(result.moduleResults).filter(r => r.success).length,
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      moduleStats: Object.entries(result.moduleResults).map(([module, result]) => ({
        module,
        success: result.success,
        errors: result.errors.length,
        warnings: result.warnings.length,
      })),
    };
  }
}
