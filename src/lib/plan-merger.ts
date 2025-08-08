/**
 * 计划合并器
 * 负责将多个区域计划合并成完整的旅游计划
 */

import { 
  RegionPlan, 
  TravelPlan,
  UserPreferences 
} from '@/types/travel-planning';

export interface MergeOptions {
  optimizeRoute?: boolean;
  balanceBudget?: boolean;
  considerTransportation?: boolean;
  maxTotalDays?: number;
}

export interface MergeResult {
  success: boolean;
  plan?: TravelPlan;
  warnings?: string[];
  errors?: string[];
}

export class PlanMerger {
  constructor() {
    console.log('🔗 计划合并器已初始化');
  }

  /**
   * 合并多个区域计划
   */
  async mergePlans(
    regionPlans: RegionPlan[],
    userPreferences: UserPreferences,
    options: MergeOptions = {}
  ): Promise<MergeResult> {
    console.log(`🔗 开始合并 ${regionPlans.length} 个区域计划...`);

    try {
      // 验证输入
      const validation = this.validatePlans(regionPlans);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 优化路线顺序
      const optimizedPlans = options.optimizeRoute 
        ? await this.optimizeRoute(regionPlans)
        : regionPlans;

      // 合并行程
      const mergedItinerary = await this.mergeItineraries(optimizedPlans);

      // 合并预算
      const totalBudget = this.mergeBudgets(optimizedPlans);

      // 合并推荐
      const mergedRecommendations = this.mergeRecommendations(optimizedPlans);

      // 生成完整计划
      const travelPlan: TravelPlan = {
        id: `merged_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userPreferences.userId || 'anonymous',
        title: this.generatePlanTitle(optimizedPlans),
        description: this.generatePlanDescription(optimizedPlans),
        regions: optimizedPlans.map(plan => ({
          regionId: plan.regionId,
          regionName: plan.regionName,
          duration: plan.duration,
          order: optimizedPlans.indexOf(plan) + 1
        })),
        totalDuration: optimizedPlans.reduce((sum, plan) => sum + plan.duration, 0),
        itinerary: mergedItinerary,
        budget: totalBudget,
        recommendations: mergedRecommendations,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          mergedFrom: optimizedPlans.map(p => p.id),
          mergeOptions: options,
          version: '1.0'
        }
      };

      // 检查约束
      const warnings = this.checkConstraints(travelPlan, userPreferences, options);

      console.log(`✅ 计划合并完成: ${travelPlan.title} (${travelPlan.totalDuration}天)`);

      return {
        success: true,
        plan: travelPlan,
        warnings
      };

    } catch (error) {
      console.error('❌ 计划合并失败:', error);
      return {
        success: false,
        errors: [`合并失败: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * 验证计划
   */
  private validatePlans(plans: RegionPlan[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!plans || plans.length === 0) {
      errors.push('没有提供区域计划');
    }

    for (const plan of plans) {
      if (!plan.id || !plan.regionId || !plan.regionName) {
        errors.push(`计划 ${plan.id || 'unknown'} 缺少必要信息`);
      }

      if (!plan.itinerary || plan.itinerary.length === 0) {
        errors.push(`计划 ${plan.regionName} 没有行程安排`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 优化路线顺序
   */
  private async optimizeRoute(plans: RegionPlan[]): Promise<RegionPlan[]> {
    console.log('🗺️ 优化路线顺序...');
    
    // 模拟路线优化算法
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 简单的优化：按地理位置排序（这里用名称排序模拟）
    return [...plans].sort((a, b) => a.regionName.localeCompare(b.regionName));
  }

  /**
   * 合并行程
   */
  private async mergeItineraries(plans: RegionPlan[]): Promise<any[]> {
    console.log('📅 合并行程安排...');
    
    const mergedItinerary: any[] = [];
    let currentDay = 1;

    for (const plan of plans) {
      for (const dayPlan of plan.itinerary) {
        mergedItinerary.push({
          ...dayPlan,
          day: currentDay,
          region: plan.regionName,
          regionId: plan.regionId
        });
        currentDay++;
      }
    }

    return mergedItinerary;
  }

  /**
   * 合并预算
   */
  private mergeBudgets(plans: RegionPlan[]): {
    total: number;
    breakdown: Record<string, number>;
    byRegion: Record<string, number>;
  } {
    console.log('💰 合并预算信息...');
    
    let total = 0;
    const breakdown: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    for (const plan of plans) {
      total += plan.budgetEstimate.total;
      byRegion[plan.regionName] = plan.budgetEstimate.total;

      // 合并分类预算
      for (const [category, amount] of Object.entries(plan.budgetEstimate.breakdown)) {
        breakdown[category] = (breakdown[category] || 0) + amount;
      }
    }

    return {
      total,
      breakdown,
      byRegion
    };
  }

  /**
   * 合并推荐
   */
  private mergeRecommendations(plans: RegionPlan[]): any {
    console.log('⭐ 合并推荐内容...');
    
    const merged = {
      attractions: [] as any[],
      restaurants: [] as any[],
      hotels: [] as any[],
      activities: [] as string[]
    };

    for (const plan of plans) {
      if (plan.recommendations) {
        merged.attractions.push(...(plan.recommendations.attractions || []));
        merged.restaurants.push(...(plan.recommendations.restaurants || []));
        merged.hotels.push(...(plan.recommendations.hotels || []));
        merged.activities.push(...(plan.recommendations.activities || []));
      }
    }

    // 去重
    merged.activities = [...new Set(merged.activities)];

    return merged;
  }

  /**
   * 生成计划标题
   */
  private generatePlanTitle(plans: RegionPlan[]): string {
    if (plans.length === 1) {
      return `${plans[0].regionName}旅游计划`;
    }
    
    const regionNames = plans.map(p => p.regionName).slice(0, 3);
    const totalDays = plans.reduce((sum, p) => sum + p.duration, 0);
    
    return `${regionNames.join('、')}${plans.length > 3 ? '等地' : ''}${totalDays}日游`;
  }

  /**
   * 生成计划描述
   */
  private generatePlanDescription(plans: RegionPlan[]): string {
    const totalDays = plans.reduce((sum, p) => sum + p.duration, 0);
    const regionCount = plans.length;
    
    return `精心规划的${totalDays}天${regionCount}地旅游行程，涵盖${plans.map(p => p.regionName).join('、')}等精彩目的地。`;
  }

  /**
   * 检查约束条件
   */
  private checkConstraints(
    plan: TravelPlan,
    preferences: UserPreferences,
    options: MergeOptions
  ): string[] {
    const warnings: string[] = [];

    // 检查总天数
    if (options.maxTotalDays && plan.totalDuration > options.maxTotalDays) {
      warnings.push(`总行程天数(${plan.totalDuration})超过限制(${options.maxTotalDays})`);
    }

    // 检查预算
    if (preferences.budget && plan.budget.total > preferences.budget) {
      warnings.push(`预算(${plan.budget.total})超过用户限制(${preferences.budget})`);
    }

    return warnings;
  }

  /**
   * 拆分计划
   */
  async splitPlan(plan: TravelPlan): Promise<RegionPlan[]> {
    console.log(`🔄 拆分计划: ${plan.title}`);
    
    // 这里可以实现计划拆分逻辑
    // 暂时返回空数组
    return [];
  }

  /**
   * 获取合并器状态
   */
  getStatus(): {
    isReady: boolean;
    version: string;
  } {
    return {
      isReady: true,
      version: '1.0.0'
    };
  }
}
