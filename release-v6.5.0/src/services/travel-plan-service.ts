/**
 * 智游助手v5.0 - 旅行计划服务层（架构简化版）
 * 立即实施：唯一数据源架构
 *
 * 核心约束：
 * - 唯一数据源：高德MCP
 * - 移除所有第三方API集成
 * - 统一服务层架构
 * - 保持100%向后兼容
 */

import { TravelPlanParser, TravelPlanParseResult } from './parsers/travel-plan-parser';
import { TravelDataService } from './travel-data-service';
import { TravelPlanData, ParseConfig } from '../types/travel-plan';
import { SIMPLIFIED_SERVICES_CONFIG } from '../config/travel-plan-config';

export interface TravelPlanServiceConfig {
  parseConfig?: Partial<ParseConfig>;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  dataQualityThreshold?: number;
}

/**
 * 架构简化后的旅行计划服务
 *
 * 立即实施的改进：
 * - 唯一数据源：高德MCP
 * - 移除HybridServiceManager
 * - 统一TravelDataService
 * - 优化响应时间至2-4秒
 */
export class TravelPlanService {
  private config: Required<TravelPlanServiceConfig>;
  private cache: Map<string, { data: TravelPlanData; timestamp: number }> = new Map();
  private dataService: TravelDataService;

  constructor(config: TravelPlanServiceConfig = {}) {
    this.config = {
      parseConfig: {},
      cacheEnabled: true,
      cacheTTL: SIMPLIFIED_SERVICES_CONFIG.cacheTTL, // 使用简化配置
      dataQualityThreshold: 0.7,
      ...config,
    };

    // 使用统一的数据服务（唯一数据源：高德MCP）
    this.dataService = new TravelDataService({
      enableCache: this.config.cacheEnabled,
      cacheTimeout: this.config.cacheTTL,
      enableRetry: true,
      maxRetries: SIMPLIFIED_SERVICES_CONFIG.retries,
    });

    console.log('🚀 旅行计划服务初始化完成 (架构简化 - 唯一数据源: 高德MCP)');
  }

  /**
   * 从LLM响应创建旅行计划
   */
  async createTravelPlan(
    llmResponse: string,
    metadata: {
      id: string;
      title: string;
      destination: string;
      totalDays: number;
      startDate: string;
      endDate: string;
      totalCost: number;
      groupSize: number;
    }
  ): Promise<{
    success: boolean;
    data: TravelPlanData | null;
    errors: string[];
    warnings: string[];
    stats?: any;
  }> {
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(llmResponse, metadata);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          errors: [],
          warnings: ['使用缓存数据'],
        };
      }

      // 预处理LLM响应
      const processedContent = this.preprocessLLMResponse(llmResponse);

      // 创建解析器并解析
      const parser = new TravelPlanParser(processedContent, this.config.parseConfig);
      const result = await parser.parse(metadata);

      // 后处理数据
      if (result.data) {
        result.data = await this.postprocessTravelPlan(result.data);
        
        // 缓存结果
        this.saveToCache(cacheKey, result.data);
      }

      // 获取统计信息
      const stats = parser.getParseStats(result);

      return {
        success: result.success,
        data: result.data,
        errors: result.errors,
        warnings: result.warnings,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [`创建旅行计划失败: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * 更新旅行计划
   */
  async updateTravelPlan(
    planId: string,
    updates: Partial<TravelPlanData>
  ): Promise<{
    success: boolean;
    data: TravelPlanData | null;
    errors: string[];
  }> {
    try {
      // 这里应该从数据库获取现有计划
      // 为了演示，我们从缓存中查找
      const existingPlan = this.findInCache(planId);
      
      if (!existingPlan) {
        return {
          success: false,
          data: null,
          errors: ['未找到指定的旅行计划'],
        };
      }

      // 合并更新
      const updatedPlan: TravelPlanData = {
        ...existingPlan,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 验证更新后的数据
      const validationErrors = this.validateTravelPlan(updatedPlan);
      if (validationErrors.length > 0) {
        return {
          success: false,
          data: null,
          errors: validationErrors,
        };
      }

      // 更新缓存
      const cacheKey = this.generateCacheKey('', { id: planId } as any);
      this.saveToCache(cacheKey, updatedPlan);

      return {
        success: true,
        data: updatedPlan,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [`更新旅行计划失败: ${error.message}`],
      };
    }
  }

  /**
   * 获取旅行计划
   */
  async getTravelPlan(planId: string): Promise<{
    success: boolean;
    data: TravelPlanData | null;
    errors: string[];
  }> {
    try {
      // 从缓存查找
      const cachedPlan = this.findInCache(planId);
      
      if (cachedPlan) {
        return {
          success: true,
          data: cachedPlan,
          errors: [],
        };
      }

      // 这里应该从数据库查询
      // 为了演示，返回未找到
      return {
        success: false,
        data: null,
        errors: ['未找到指定的旅行计划'],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [`获取旅行计划失败: ${error.message}`],
      };
    }
  }

  /**
   * 预处理LLM响应
   */
  private preprocessLLMResponse(content: string): string {
    return content
      // 统一换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 清理多余的空行
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // 清理行首行尾空格
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // 标准化标题格式
      .replace(/^#+\s*/gm, '## ')
      // 标准化列表格式
      .replace(/^[•·]\s*/gm, '- ')
      .trim();
  }

  /**
   * 使用统一数据服务后处理旅行计划数据
   * 架构简化：移除复杂的外部服务管理，使用唯一数据源
   */
  private async postprocessTravelPlan(data: TravelPlanData): Promise<TravelPlanData> {
    console.log('🔄 开始后处理旅行计划数据 (唯一数据源: 高德MCP)...');

    try {
      // 使用统一数据服务获取增强数据
      const allData = await this.dataService.getAllTravelData(data.destination);

      // 合并增强数据，保持向后兼容
      let enhancedData: TravelPlanData = {
        ...data,
        accommodation: allData.accommodation.data || data.accommodation,
        foodExperience: allData.food.data || data.foodExperience,
        transportation: allData.transport.data || data.transportation,
        tips: allData.tips.data || data.tips,
        updatedAt: new Date().toISOString(),
      };

      // 计算预算建议
      enhancedData = this.calculateBudgetRecommendations(enhancedData);

      // 添加时间建议
      enhancedData = this.addTimeRecommendations(enhancedData);

      console.log(`✅ 数据后处理完成 (质量: ${(allData.overall.quality * 100).toFixed(1)}%, 数据源: 高德MCP)`);
      return enhancedData;

    } catch (error) {
      console.warn('⚠️ 数据后处理失败，使用原始数据:', error);
      let fallbackData = this.calculateBudgetRecommendations(data);
      fallbackData = this.addTimeRecommendations(fallbackData);
      return fallbackData;
    }
  }

  // 移除复杂的增强方法 - 已由统一数据服务替代

  // 移除美食数据增强方法 - 已由统一数据服务替代

  // 移除交通数据增强方法 - 已由统一数据服务替代

  /**
   * 计算预算建议
   */
  private calculateBudgetRecommendations(data: TravelPlanData): TravelPlanData {
    const accommodationCost = this.estimateAccommodationCost(data.accommodation);
    const foodCost = this.estimateFoodCost(data.foodExperience);
    const transportCost = this.estimateTransportCost(data.transportation);

    const estimatedTotal = accommodationCost + foodCost + transportCost;
    const budgetAdvice = this.generateBudgetAdvice(estimatedTotal, data.totalCost);

    return {
      ...data,
      tips: {
        ...data.tips,
        budgetTips: [
          ...data.tips.budgetTips,
          budgetAdvice,
          `预计住宿费用: ¥${accommodationCost}`,
          `预计餐饮费用: ¥${foodCost}`,
          `预计交通费用: ¥${transportCost}`,
        ],
      },
    };
  }

  /**
   * 添加时间建议
   */
  private addTimeRecommendations(data: TravelPlanData): TravelPlanData {
    const timeAdvice = this.generateTimeAdvice(data.totalDays);
    
    return {
      ...data,
      tips: {
        ...data.tips,
        budgetTips: [
          ...data.tips.budgetTips,
          timeAdvice,
        ],
      },
    };
  }

  /**
   * 估算住宿费用
   */
  private estimateAccommodationCost(accommodation: any): number {
    const avgPrice = accommodation.recommendations.reduce((sum: number, rec: any) => {
      return sum + (rec.pricePerNight || 300);
    }, 0) / accommodation.recommendations.length;
    
    return Math.round(avgPrice);
  }

  /**
   * 估算餐饮费用
   */
  private estimateFoodCost(foodExperience: any): number {
    const avgPrice = foodExperience.recommendedRestaurants.reduce((sum: number, restaurant: any) => {
      return sum + (restaurant.averagePrice || 80);
    }, 0) / foodExperience.recommendedRestaurants.length;
    
    return Math.round(avgPrice * 3); // 一日三餐
  }

  /**
   * 估算交通费用
   */
  private estimateTransportCost(transportation: any): number {
    // 简单估算，实际应该根据具体路线计算
    return 200;
  }

  /**
   * 生成预算建议
   */
  private generateBudgetAdvice(estimated: number, budget: number): string {
    const ratio = estimated / budget;
    
    if (ratio > 1.2) {
      return '预算可能不足，建议适当增加或选择更经济的选项';
    } else if (ratio < 0.8) {
      return '预算充足，可以考虑升级住宿或尝试更多美食';
    } else {
      return '预算安排合理，符合预期消费水平';
    }
  }

  /**
   * 生成时间建议
   */
  private generateTimeAdvice(totalDays: number): string {
    if (totalDays <= 3) {
      return '短途旅行，建议重点体验1-2个核心景点';
    } else if (totalDays <= 7) {
      return '中等行程，可以深度体验当地文化和美食';
    } else {
      return '长途旅行，有充足时间探索周边地区';
    }
  }

  /**
   * 验证旅行计划数据
   */
  private validateTravelPlan(data: TravelPlanData): string[] {
    const errors: string[] = [];

    if (!data.id) errors.push('缺少计划ID');
    if (!data.destination) errors.push('缺少目的地');
    if (data.totalDays <= 0) errors.push('行程天数必须大于0');
    if (!data.startDate) errors.push('缺少开始日期');
    if (!data.endDate) errors.push('缺少结束日期');

    return errors;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(content: string, metadata: any): string {
    const key = `${metadata.id}_${metadata.destination}_${content.length}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): TravelPlanData | null {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = (now - cached.timestamp) / 1000;

    if (age > (this.config.cacheTTL || 3600)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 保存到缓存
   */
  private saveToCache(key: string, data: TravelPlanData): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 在缓存中查找计划
   */
  private findInCache(planId: string): TravelPlanData | null {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.data.id === planId) {
        return cached.data;
      }
    }
    return null;
  }

  /**
   * 清理过期缓存
   */
  public cleanupCache(): void {
    const now = Date.now();
    const ttl = (this.config.cacheTTL || 3600) * 1000;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.config.cacheEnabled,
      ttl: this.config.cacheTTL,
    };
  }
}
