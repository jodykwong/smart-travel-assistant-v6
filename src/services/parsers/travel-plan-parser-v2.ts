/**
 * 智游助手v5.0 - 主旅行计划解析器（重构版）
 * 基于简化架构的解析器实现
 * 
 * 重构改进：
 * - 简化解析流程，专注于LLM响应的结构化解析
 * - 移除复杂的模块管理和外部API集成
 * - 数据增强交给专门的TravelDataService处理
 * - 提升解析性能和可维护性
 * 
 * 架构对比：
 * 重构前：复杂的模块管理 + 多API集成 + 错误处理分散
 * 重构后：专注解析 + 统一数据服务 + 集中错误处理
 */

import { ParseResult } from './base-parser';
import { AccommodationParser } from './accommodation-parser';
import { FoodParser } from './food-parser';
import { TransportParser } from './transport-parser';
import { TipsParser } from './tips-parser';
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
    moduleCount: number;
    successRate: number;
  };
}

/**
 * 重构后的主旅行计划解析器
 * 
 * 核心职责：
 * 1. 解析LLM响应的文本结构
 * 2. 提取基础的旅行计划信息
 * 3. 协调各个专门解析器
 * 4. 生成标准化的数据结构
 * 
 * 不再负责：
 * - 外部API调用（交给TravelDataService）
 * - 复杂的数据增强（交给TravelDataService）
 * - 多源数据合并（交给TravelDataService）
 */
export class TravelPlanParserV2 {
  private content: string;
  private config: Required<ParseConfig>;

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

    console.log('📝 旅行计划解析器V2初始化 (简化架构)');
  }

  /**
   * 解析完整的旅行计划（重构版）
   * 
   * 简化流程：
   * 1. 并行解析各个模块
   * 2. 构建基础数据结构
   * 3. 返回解析结果（不进行数据增强）
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

    console.log(`📝 开始解析旅行计划: ${planMetadata.destination} (简化架构)`);

    try {
      // 1. 预处理内容
      const processedContent = this.preprocessContent(this.content);

      // 2. 并行解析各个模块
      const moduleResults = await this.parseModulesInParallel(processedContent);

      // 3. 检查解析结果
      const successCount = Object.values(moduleResults).filter(result => result.success).length;
      const successRate = successCount / Object.keys(moduleResults).length;

      if (successRate < 0.5) {
        warnings.push('多个模块解析失败，数据可能不完整');
      }

      // 4. 构建旅行计划数据
      const travelPlanData: TravelPlanData = {
        ...planMetadata,
        overview: this.extractOverview(processedContent),
        accommodation: moduleResults.accommodation.data || this.getDefaultAccommodationData(),
        foodExperience: moduleResults.food.data || this.getDefaultFoodData(),
        transportation: moduleResults.transport.data || this.getDefaultTransportData(),
        tips: moduleResults.tips.data || this.getDefaultTipsData(),
        createdAt: new Date().toISOString(),
      };

      const parseTime = Date.now() - startTime;
      console.log(`✅ 解析完成 (${parseTime}ms, 成功率: ${(successRate * 100).toFixed(1)}%)`);

      return {
        success: true,
        data: travelPlanData,
        errors,
        warnings,
        moduleResults,
        performance: {
          parseTime,
          moduleCount: Object.keys(moduleResults).length,
          successRate,
        },
      };

    } catch (error) {
      const parseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知解析错误';
      
      console.error(`❌ 解析失败 (${parseTime}ms):`, errorMessage);
      errors.push(errorMessage);

      return {
        success: false,
        data: null,
        errors,
        warnings,
        moduleResults: {
          accommodation: { success: false, data: null, errors: [errorMessage], warnings: [] },
          food: { success: false, data: null, errors: [errorMessage], warnings: [] },
          transport: { success: false, data: null, errors: [errorMessage], warnings: [] },
          tips: { success: false, data: null, errors: [errorMessage], warnings: [] },
        },
        performance: {
          parseTime,
          moduleCount: 0,
          successRate: 0,
        },
      };
    }
  }

  /**
   * 并行解析各个模块
   */
  private async parseModulesInParallel(content: string) {
    console.log('🔄 并行解析各个模块...');

    const parsePromises = {
      accommodation: this.parseAccommodation(content),
      food: this.parseFood(content),
      transport: this.parseTransport(content),
      tips: this.parseTips(content),
    };

    // 并行执行所有解析任务
    const results = await Promise.allSettled([
      parsePromises.accommodation,
      parsePromises.food,
      parsePromises.transport,
      parsePromises.tips,
    ]);

    return {
      accommodation: results[0].status === 'fulfilled' ? results[0].value : this.createFailedResult('住宿解析失败'),
      food: results[1].status === 'fulfilled' ? results[1].value : this.createFailedResult('美食解析失败'),
      transport: results[2].status === 'fulfilled' ? results[2].value : this.createFailedResult('交通解析失败'),
      tips: results[3].status === 'fulfilled' ? results[3].value : this.createFailedResult('贴士解析失败'),
    };
  }

  /**
   * 解析住宿信息
   */
  private async parseAccommodation(content: string): Promise<ParseResult<any>> {
    try {
      const parser = new AccommodationParser(content);
      return parser.parse();
    } catch (error) {
      return this.createFailedResult('住宿解析异常');
    }
  }

  /**
   * 解析美食信息
   */
  private async parseFood(content: string): Promise<ParseResult<any>> {
    try {
      const parser = new FoodParser(content);
      return parser.parse();
    } catch (error) {
      return this.createFailedResult('美食解析异常');
    }
  }

  /**
   * 解析交通信息
   */
  private async parseTransport(content: string): Promise<ParseResult<any>> {
    try {
      const parser = new TransportParser(content);
      return parser.parse();
    } catch (error) {
      return this.createFailedResult('交通解析异常');
    }
  }

  /**
   * 解析实用贴士
   */
  private async parseTips(content: string): Promise<ParseResult<any>> {
    try {
      const parser = new TipsParser(content);
      return parser.parse();
    } catch (error) {
      return this.createFailedResult('贴士解析异常');
    }
  }

  /**
   * 预处理内容
   */
  private preprocessContent(content: string): string {
    // 清理和标准化内容
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 提取概览信息
   */
  private extractOverview(content: string): string {
    const lines = content.split('\n');
    const firstParagraph = lines.find(line => 
      line.length > 50 && 
      !line.startsWith('#') && 
      !line.startsWith('##')
    );
    
    return firstParagraph || '这是一个精心规划的旅行计划，包含住宿、美食、交通和实用贴士等完整信息。';
  }

  /**
   * 创建失败结果
   */
  private createFailedResult(errorMessage: string): ParseResult<any> {
    return {
      success: false,
      data: null,
      errors: [errorMessage],
      warnings: [],
    };
  }

  // 默认数据生成方法（简化版）
  private getDefaultAccommodationData() {
    return {
      recommendations: [],
      bookingTips: '建议提前预订，关注官方渠道获取最新信息',
      priceRanges: ['经济型: 200-400元', '舒适型: 400-800元', '豪华型: 800元以上'],
      amenitiesComparison: [],
    };
  }

  private getDefaultFoodData() {
    return {
      specialties: ['当地特色菜', '传统小吃', '特色饮品'],
      recommendedRestaurants: [],
      foodDistricts: [],
      budgetGuide: '人均消费: 50-150元',
      diningEtiquette: '尊重当地饮食文化，注意用餐礼仪',
    };
  }

  private getDefaultTransportData() {
    return {
      arrivalOptions: [],
      localTransport: [],
      transportCards: [],
      routePlanning: '建议使用公共交通或打车软件',
    };
  }

  private getDefaultTipsData() {
    return {
      weather: [],
      cultural: ['尊重当地文化', '遵守当地法规'],
      safety: ['保管好个人财物', '注意人身安全'],
      shopping: ['理性消费', '注意商品质量'],
      communication: ['学习基本用语', '准备翻译工具'],
      emergency: ['紧急电话: 110, 120, 119'],
    };
  }

  /**
   * 获取解析统计信息
   */
  getParseStats(result: TravelPlanParseResult): any {
    return {
      totalModules: Object.keys(result.moduleResults).length,
      successfulModules: Object.values(result.moduleResults).filter(r => r.success).length,
      parseTime: result.performance.parseTime,
      successRate: result.performance.successRate,
      architecture: 'simplified-v2',
      moduleStats: Object.entries(result.moduleResults).map(([name, result]) => ({
        module: name,
        success: result.success,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      })),
    };
  }
}
