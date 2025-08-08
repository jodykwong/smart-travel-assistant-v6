import { NextApiRequest, NextApiResponse } from 'next';
import { metricsRegistry } from '../../lib/monitoring/MetricsRegistry';
import { metricsCollector } from '../../lib/monitoring/MetricsCollector';
import { monitoringErrorHandler, MonitoringErrorType } from '../../lib/monitoring/ErrorHandler';
import { configManager } from '../../config/monitoring.config';

/**
 * Prometheus指标端点（重构版本）
 * 为智游助手v6.2提供监控指标
 * 使用统一的指标注册中心和错误处理
 */

// 初始化指标注册中心
metricsRegistry.initialize();

// 指标现在通过MetricsRegistry统一管理，无需重复定义

// 辅助函数现在通过MetricsCollector统一提供，保持向后兼容
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  service: string = 'smart-travel'
): void {
  monitoringErrorHandler.safeExecute(
    () => {
      metricsCollector.recordHttpRequest(method, route, statusCode, duration, service);
    },
    MonitoringErrorType.METRICS_COLLECTION_FAILED,
    { method, route, statusCode, duration, service }
  );
}

export function recordPaymentMetrics(
  stage: 'order_creation' | 'payment_processing' | 'isolated_verification',
  provider: 'wechat' | 'alipay',
  duration: number,
  success: boolean,
  errorType?: string
): void {
  monitoringErrorHandler.safeExecute(
    () => {
      metricsCollector.recordPaymentMetrics(stage, provider, duration, success, errorType);
    },
    MonitoringErrorType.METRICS_COLLECTION_FAILED,
    { stage, provider, duration, success, errorType }
  );
}

export function updateBusinessMetrics(metrics: {
  paymentSuccessRate?: number;
  userRegistrationRate?: number;
  orderCompletionRate?: number;
  activeUsers?: number;
  cacheHitRate?: number;
  databaseConnections?: number;
}): void {
  monitoringErrorHandler.safeExecute(
    () => {
      metricsCollector.updateBusinessMetrics(metrics);
    },
    MonitoringErrorType.METRICS_COLLECTION_FAILED,
    { metrics }
  );
}

/**
 * API处理器（重构版本）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();

  // 检查监控是否启用
  const config = configManager.getConfig();
  if (!config.enabled) {
    return res.status(503).json({
      error: 'Monitoring is disabled',
      message: 'Monitoring system is currently disabled in configuration'
    });
  }

  // 检查系统健康状态
  if (!monitoringErrorHandler.isHealthy()) {
    return res.status(503).json({
      error: 'Monitoring system unhealthy',
      message: 'Monitoring system is experiencing issues',
      stats: monitoringErrorHandler.getErrorStats()
    });
  }

  try {
    // 只允许GET请求
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 更新一些动态指标（实际应用中应该从数据库或缓存获取）
    updateBusinessMetrics({
      activeUsers: Math.floor(Math.random() * 100) + 50, // 模拟50-150个活跃用户
      cacheHitRate: 0.8 + Math.random() * 0.15, // 模拟80-95%的缓存命中率
      databaseConnections: Math.floor(Math.random() * 5) + 1, // 模拟1-5个数据库连接
    });

    // 记录这次请求的指标
    const duration = (Date.now() - startTime) / 1000;
    recordHttpRequest('GET', '/api/metrics', 200, duration);

    // 获取所有指标
    const metrics = metricsRegistry.getAllMetrics();

    // 设置正确的响应头
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(metrics);

  } catch (error) {
    // 记录错误但不暴露内部细节
    monitoringErrorHandler.handleError(
      MonitoringErrorType.METRICS_COLLECTION_FAILED,
      error as Error,
      { endpoint: '/api/metrics', method: req.method }
    );

    // 记录错误请求的指标
    const duration = (Date.now() - startTime) / 1000;
    recordHttpRequest('GET', '/api/metrics', 500, duration);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate metrics'
    });
  }
}
