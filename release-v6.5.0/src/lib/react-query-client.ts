/**
 * 智游助手v5.0 - React Query配置
 * 优化API调用、缓存策略和错误处理
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// ============= 查询配置 =============

const queryConfig: DefaultOptions = {
  queries: {
    // 缓存时间：5分钟
    staleTime: 5 * 60 * 1000,
    // 垃圾回收时间：10分钟
    gcTime: 10 * 60 * 1000,
    // 重试配置
    retry: (failureCount, error: any) => {
      // 4xx错误不重试
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // 最多重试3次
      return failureCount < 3;
    },
    // 重试延迟：指数退避
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // 网络重连时重新获取
    refetchOnReconnect: true,
    // 窗口聚焦时不重新获取（避免频繁请求）
    refetchOnWindowFocus: false,
  },
  mutations: {
    // Mutation重试配置
    retry: (failureCount, error: any) => {
      // 只对网络错误重试
      if (error?.name === 'NetworkError') {
        return failureCount < 2;
      }
      return false;
    },
    // 全局错误处理
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      // 用户友好的错误提示
      const message = error?.message || '操作失败，请重试';
      toast.error(message);
    },
  },
};

// ============= 查询客户端实例 =============

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// ============= 查询键工厂 =============

export const queryKeys = {
  // 用户相关
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    preferences: (userId: string) => [...queryKeys.user.all, 'preferences', userId] as const,
    plans: (userId: string) => [...queryKeys.user.all, 'plans', userId] as const,
  },
  
  // 规划会话相关
  planning: {
    all: ['planning'] as const,
    session: (sessionId: string) => [...queryKeys.planning.all, 'session', sessionId] as const,
    progress: (sessionId: string) => [...queryKeys.planning.all, 'progress', sessionId] as const,
    result: (sessionId: string) => [...queryKeys.planning.all, 'result', sessionId] as const,
    regionData: (sessionId: string, regionName: string) => 
      [...queryKeys.planning.all, 'region-data', sessionId, regionName] as const,
    regionPlan: (sessionId: string, regionName: string) => 
      [...queryKeys.planning.all, 'region-plan', sessionId, regionName] as const,
  },
  
  // 旅行计划相关
  plans: {
    all: ['plans'] as const,
    detail: (planId: string) => [...queryKeys.plans.all, 'detail', planId] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.plans.all, 'list', filters] as const,
  },
  
  // 目的地数据相关
  destinations: {
    all: ['destinations'] as const,
    search: (query: string) => [...queryKeys.destinations.all, 'search', query] as const,
    popular: () => [...queryKeys.destinations.all, 'popular'] as const,
    weather: (location: string, date: string) => 
      [...queryKeys.destinations.all, 'weather', location, date] as const,
  },
} as const;

// ============= 缓存工具函数 =============

export const cacheUtils = {
  // 预取数据
  prefetchUserPlans: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.user.plans(userId),
      queryFn: () => import('@/services/travel-planning-service').then(
        service => service.travelPlanningService.getUserPlans(userId)
      ),
      staleTime: 10 * 60 * 1000, // 10分钟
    });
  },

  // 无效化相关缓存
  invalidatePlanningSession: (sessionId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.planning.session(sessionId),
    });
  },

  invalidateUserPlans: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.plans(userId),
    });
  },

  // 更新缓存数据
  updatePlanInCache: (planId: string, updater: (oldData: any) => any) => {
    queryClient.setQueryData(
      queryKeys.plans.detail(planId),
      updater
    );
  },

  // 乐观更新
  optimisticUpdatePlan: (planId: string, newData: any) => {
    const previousData = queryClient.getQueryData(queryKeys.plans.detail(planId));
    
    // 立即更新缓存
    queryClient.setQueryData(queryKeys.plans.detail(planId), newData);
    
    // 返回回滚函数
    return () => {
      queryClient.setQueryData(queryKeys.plans.detail(planId), previousData);
    };
  },

  // 清除所有缓存
  clearAllCache: () => {
    queryClient.clear();
  },

  // 清除特定类型的缓存
  clearPlanningCache: () => {
    queryClient.removeQueries({
      queryKey: queryKeys.planning.all,
    });
  },
};

// ============= 性能监控 =============

export const performanceMonitor = {
  // 监控查询性能
  trackQueryPerformance: (queryKey: string, startTime: number) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 记录慢查询
    if (duration > 5000) {
      console.warn(`Slow query detected: ${queryKey} took ${duration}ms`);
    }
    
    // 发送性能数据到监控服务
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'query_performance', {
        query_key: queryKey,
        duration: duration,
        custom_parameter: 'query_timing',
      });
    }
  },

  // 监控缓存命中率
  trackCacheHit: (queryKey: string, isHit: boolean) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'cache_performance', {
        query_key: queryKey,
        cache_hit: isHit,
        custom_parameter: 'cache_metrics',
      });
    }
  },
};

// ============= 错误边界处理 =============

export const errorHandlers = {
  // 网络错误处理
  handleNetworkError: (error: any) => {
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      toast.error('网络连接失败，请检查您的网络设置');
      return;
    }
    
    // 超时错误
    if (error?.name === 'TimeoutError') {
      toast.error('请求超时，请稍后重试');
      return;
    }
    
    // 服务器错误
    if (error?.status >= 500) {
      toast.error('服务器暂时不可用，请稍后重试');
      return;
    }
    
    // 客户端错误
    if (error?.status >= 400 && error?.status < 500) {
      const message = error?.message || '请求参数错误';
      toast.error(message);
      return;
    }
    
    // 未知错误
    toast.error('发生未知错误，请联系客服');
  },

  // 认证错误处理
  handleAuthError: (error: any) => {
    if (error?.status === 401) {
      toast.error('登录已过期，请重新登录');
      // 重定向到登录页
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return;
    }
    
    if (error?.status === 403) {
      toast.error('您没有权限执行此操作');
      return;
    }
  },
};

// ============= 开发工具 =============

if (process.env.NODE_ENV === 'development') {
  // 开发环境下的查询调试
  queryClient.setMutationDefaults(['debug'], {
    onMutate: (variables) => {
      console.log('Mutation started:', variables);
    },
    onSuccess: (data) => {
      console.log('Mutation succeeded:', data);
    },
    onError: (error) => {
      console.error('Mutation failed:', error);
    },
  });
}
