/**
 * 智游助手v5.0 - 旅行计划 Hook（第二阶段重构版）
 * 提供旅行计划数据管理的自定义 Hook
 *
 * 重构改进：
 * - 支持新的性能监控指标
 * - 集成重构后的服务层
 * - 保持100%向后兼容性
 * - 优化错误处理和状态管理
 */

import { useState, useEffect, useCallback } from 'react';
import { TravelPlanService, TravelPlanServiceConfig } from '../services/travel-plan-service';
import { TravelPlanData } from '../types/travel-plan';

interface UseTravelPlanOptions {
  serviceConfig?: TravelPlanServiceConfig;
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
}

interface UseTravelPlanReturn {
  // 数据状态
  plan: TravelPlanData | null;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  createPlan: (llmResponse: string, metadata: any) => Promise<boolean>;
  updatePlan: (planId: string, updates: Partial<TravelPlanData>) => Promise<boolean>;
  loadPlan: (planId: string) => Promise<boolean>;
  refreshPlan: () => Promise<boolean>;
  clearPlan: () => void;

  // 状态信息（第二阶段重构增强）
  stats: any;
  cacheStats: any;
  performance: {
    lastResponseTime: number;
    averageResponseTime: number;
    cacheHitRate: number;
    dataQuality: number;
  } | null;
}

export const useTravelPlan = (options: UseTravelPlanOptions = {}): UseTravelPlanReturn => {
  const [plan, setPlan] = useState<TravelPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null); // 新增性能监控
  const [service] = useState(() => new TravelPlanService(options.serviceConfig));

  // 自动刷新
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval && plan) {
      const interval = setInterval(() => {
        refreshPlan();
      }, options.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, plan]);

  // 定期清理缓存
  useEffect(() => {
    const cleanup = setInterval(() => {
      service.cleanupCache();
    }, 5 * 60 * 1000); // 每5分钟清理一次

    return () => clearInterval(cleanup);
  }, [service]);

  /**
   * 创建旅行计划
   */
  const createPlan = useCallback(async (
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
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await service.createTravelPlan(llmResponse, metadata);
      
      if (result.success && result.data) {
        setPlan(result.data);
        setStats(result.stats);

        // 第二阶段重构：更新性能监控
        if (result.performance) {
          setPerformance(prev => ({
            lastResponseTime: result.performance?.duration || 0,
            averageResponseTime: prev ?
              (prev.averageResponseTime + (result.performance?.duration || 0)) / 2 :
              (result.performance?.duration || 0),
            cacheHitRate: result.performance?.cacheHit ?
              (prev?.cacheHitRate || 0) * 0.9 + 0.1 :
              (prev?.cacheHitRate || 0) * 0.9,
            dataQuality: result.performance?.dataQuality || 0,
          }));
        }

        if (result.warnings.length > 0) {
          console.warn('创建计划时的警告:', result.warnings);
        }

        console.log(`✅ 旅行计划创建成功 (响应时间: ${result.performance?.duration || 0}ms)`);
        return true;
      } else {
        setError(result.errors.join(', '));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建计划失败';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  /**
   * 更新旅行计划
   */
  const updatePlan = useCallback(async (
    planId: string,
    updates: Partial<TravelPlanData>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await service.updateTravelPlan(planId, updates);
      
      if (result.success && result.data) {
        setPlan(result.data);
        return true;
      } else {
        setError(result.errors.join(', '));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新计划失败';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  /**
   * 加载旅行计划
   */
  const loadPlan = useCallback(async (planId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await service.getTravelPlan(planId);
      
      if (result.success && result.data) {
        setPlan(result.data);
        return true;
      } else {
        setError(result.errors.join(', '));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载计划失败';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  /**
   * 刷新当前计划
   */
  const refreshPlan = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;
    return loadPlan(plan.id);
  }, [plan, loadPlan]);

  /**
   * 清除当前计划
   */
  const clearPlan = useCallback(() => {
    setPlan(null);
    setError(null);
    setStats(null);
  }, []);

  /**
   * 获取缓存统计
   */
  const cacheStats = service.getCacheStats();

  return {
    // 数据状态
    plan,
    isLoading,
    error,

    // 操作方法
    createPlan,
    updatePlan,
    loadPlan,
    refreshPlan,
    clearPlan,

    // 状态信息（第二阶段重构增强）
    stats,
    cacheStats,
    performance, // 新增性能监控数据
  };
};

/**
 * 旅行计划验证 Hook
 */
export const useTravelPlanValidation = (plan: TravelPlanData | null) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (!plan) {
      setValidationErrors([]);
      setIsValid(true);
      return;
    }

    const errors: string[] = [];

    // 基本信息验证
    if (!plan.id) errors.push('缺少计划ID');
    if (!plan.destination) errors.push('缺少目的地');
    if (plan.totalDays <= 0) errors.push('行程天数必须大于0');
    if (!plan.startDate) errors.push('缺少开始日期');
    if (!plan.endDate) errors.push('缺少结束日期');

    // 日期验证
    if (plan.startDate && plan.endDate) {
      const startDate = new Date(plan.startDate);
      const endDate = new Date(plan.endDate);
      if (startDate >= endDate) {
        errors.push('结束日期必须晚于开始日期');
      }
    }

    // 模块数据验证
    if (!plan.accommodation || !plan.accommodation.recommendations.length) {
      errors.push('缺少住宿推荐');
    }
    if (!plan.foodExperience || !plan.foodExperience.recommendedRestaurants.length) {
      errors.push('缺少美食推荐');
    }
    if (!plan.transportation || !plan.transportation.localTransport.length) {
      errors.push('缺少交通信息');
    }
    if (!plan.tips || !plan.tips.budgetTips.length) {
      errors.push('缺少实用贴士');
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [plan]);

  return {
    isValid,
    validationErrors,
  };
};

/**
 * 旅行计划统计 Hook
 */
export const useTravelPlanStats = (plan: TravelPlanData | null) => {
  const [statistics, setStatistics] = useState<{
    accommodationCount: number;
    restaurantCount: number;
    transportOptionCount: number;
    tipCount: number;
    estimatedBudget: number;
  } | null>(null);

  useEffect(() => {
    if (!plan) {
      setStatistics(null);
      return;
    }

    const stats = {
      accommodationCount: plan.accommodation.recommendations.length,
      restaurantCount: plan.foodExperience.recommendedRestaurants.length,
      transportOptionCount: plan.transportation.localTransport.length + plan.transportation.arrivalOptions.length,
      tipCount: plan.tips.budgetTips.length + plan.tips.cultural.length + plan.tips.safety.length,
      estimatedBudget: calculateEstimatedBudget(plan),
    };

    setStatistics(stats);
  }, [plan]);

  return statistics;
};

// 辅助函数
const calculateEstimatedBudget = (plan: TravelPlanData): number => {
  let total = 0;

  // 住宿费用
  const accommodationCost = plan.accommodation.recommendations.reduce((sum, acc) => {
    return sum + (acc.pricePerNight || 300);
  }, 0) / plan.accommodation.recommendations.length;
  total += accommodationCost * plan.totalDays;

  // 餐饮费用
  const foodCost = plan.foodExperience.recommendedRestaurants.reduce((sum, restaurant) => {
    return sum + (restaurant.averagePrice || 80);
  }, 0) / plan.foodExperience.recommendedRestaurants.length;
  total += foodCost * 3 * plan.totalDays; // 一日三餐

  // 交通费用（简单估算）
  total += 200 * plan.totalDays;

  return Math.round(total);
};
