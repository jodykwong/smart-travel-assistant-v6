/**
 * 智游助手v6.0 - 缓存统计API
 * 提供缓存状态监控和管理功能
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCacheService } from '@/lib/cache/cache-service';
import { getAmapCacheService } from '@/lib/cache/amap-cache-service';
import { getDeepSeekCacheService } from '@/lib/cache/deepseek-cache-service';

// 统一响应格式
function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

function createErrorResponse(message: string, code: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const cacheService = getCacheService();
    const amapCacheService = getAmapCacheService();
    const deepSeekCacheService = getDeepSeekCacheService();

    switch (req.method) {
      case 'GET':
        // 获取缓存统计信息
        const stats = {
          general: cacheService.getStats(),
          amap: amapCacheService.getCacheStats(),
          deepseek: deepSeekCacheService.getCacheStats(),
          performance: await calculatePerformanceMetrics(),
          costSavings: await deepSeekCacheService.getCostSavings(),
        };

        return res.status(200).json(createSuccessResponse(stats, '缓存统计获取成功'));

      case 'POST':
        // 执行缓存操作
        const { action, target, params } = req.body;

        switch (action) {
          case 'warmup':
            if (target === 'deepseek') {
              await deepSeekCacheService.warmupCache();
              return res.status(200).json(createSuccessResponse(null, 'DeepSeek缓存预热完成'));
            }
            break;

          case 'clear':
            if (target === 'all') {
              await cacheService.clear();
              return res.status(200).json(createSuccessResponse(null, '所有缓存已清理'));
            } else if (target === 'amap') {
              await amapCacheService.clearRegionCache(params?.region);
              return res.status(200).json(createSuccessResponse(null, '高德缓存已清理'));
            } else if (target === 'deepseek') {
              await deepSeekCacheService.clearPlanningCache(params?.destination);
              return res.status(200).json(createSuccessResponse(null, 'DeepSeek缓存已清理'));
            }
            break;

          default:
            return res.status(400).json(createErrorResponse(
              'Unknown action',
              'INVALID_ACTION'
            ));
        }
        break;

      case 'DELETE':
        // 清理所有缓存
        await cacheService.clear();
        return res.status(200).json(createSuccessResponse(null, '所有缓存已清理'));

      default:
        return res.status(405).json(createErrorResponse(
          'Method not allowed',
          'METHOD_NOT_ALLOWED'
        ));
    }

  } catch (error) {
    console.error('❌ 缓存API错误:', error);
    
    return res.status(500).json(createErrorResponse(
      'Cache service error',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5),
      } : undefined
    ));
  }
}

/**
 * 计算性能指标
 */
async function calculatePerformanceMetrics() {
  // 这里可以实现更复杂的性能计算
  // 比如缓存命中率、平均响应时间等
  
  return {
    cacheHitRate: 0.75, // 75% 命中率（示例）
    averageResponseTime: 150, // 150ms 平均响应时间（示例）
    totalRequests: 1000, // 总请求数（示例）
    cachedRequests: 750, // 缓存命中数（示例）
    apiCallsSaved: 750, // 节省的API调用数（示例）
    estimatedCostSavings: 45.50, // 估算节省成本（示例）
  };
}
