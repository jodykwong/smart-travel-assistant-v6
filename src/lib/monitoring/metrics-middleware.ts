import { NextApiRequest, NextApiResponse } from 'next';
import { metricsCollector, IMetricsCollector } from './MetricsCollector';
import { configManager } from '../../config/monitoring.config';
import { monitoringErrorHandler, MonitoringErrorType, ErrorSeverity } from './ErrorHandler';

/**
 * 重构后的监控中间件
 * 使用依赖注入和配置管理，解耦业务逻辑
 */

export interface MetricsMiddlewareOptions {
  enabled?: boolean;
  excludePaths?: string[];
  service?: string;
  collector?: IMetricsCollector;
}

/**
 * 获取默认选项（从配置管理器）
 */
function getDefaultOptions(): MetricsMiddlewareOptions {
  const config = configManager.getConfig();
  return {
    enabled: config.enabled && config.metrics.http.enabled,
    excludePaths: config.metrics.http.excludePaths,
    service: config.service.name,
    collector: metricsCollector
  };
}

/**
 * 创建监控中间件（重构版本）
 */
export function createMetricsMiddleware(options: MetricsMiddlewareOptions = {}) {
  const defaultOptions = getDefaultOptions();
  const config = { ...defaultOptions, ...options };

  return function metricsMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) {
    // 如果监控被禁用，直接跳过
    if (!config.enabled || !config.collector) {
      return next();
    }

    // 检查是否在排除路径中
    const path = req.url || '';
    if (config.excludePaths?.some(excludePath => path.startsWith(excludePath))) {
      return next();
    }

    const startTime = Date.now();
    const originalEnd = res.end;

    // 重写res.end方法来捕获响应完成事件
    res.end = function(chunk?: any, encoding?: any) {
      const duration = (Date.now() - startTime) / 1000;
      const method = req.method || 'UNKNOWN';
      const route = getRoutePattern(path);
      const statusCode = res.statusCode;

      // 使用错误处理器安全执行指标记录
      monitoringErrorHandler.safeExecute(
        () => {
          config.collector!.recordHttpRequest(method, route, statusCode, duration, config.service);
        },
        MonitoringErrorType.METRICS_COLLECTION_FAILED,
        { method, route, statusCode, duration, service: config.service }
      );

      // 调用原始的end方法
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * 从URL路径提取路由模式
 * 例如: /api/travel-data/123 -> /api/travel-data/:id
 */
function getRoutePattern(path: string): string {
  // 移除查询参数
  const cleanPath = path.split('?')[0];
  
  // 简单的路由模式识别
  return cleanPath
    .replace(/\/\d+/g, '/:id') // 数字ID
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUID
    .replace(/\/[a-f0-9]{24}/g, '/:objectId') // MongoDB ObjectId
    .replace(/\/[^\/]+\.(json|xml|csv)$/g, '/:file.$1'); // 文件扩展名
}

/**
 * Next.js API路由的监控装饰器（重构版本）
 */
export function withMetrics(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: MetricsMiddlewareOptions = {}
) {
  const defaultOptions = getDefaultOptions();
  const config = { ...defaultOptions, ...options };

  return async function wrappedHandler(req: NextApiRequest, res: NextApiResponse) {
    if (!config.enabled || !config.collector) {
      return handler(req, res);
    }

    const startTime = Date.now();
    const path = req.url || '';

    // 检查是否在排除路径中
    if (config.excludePaths?.some(excludePath => path.startsWith(excludePath))) {
      return handler(req, res);
    }

    try {
      await handler(req, res);
    } finally {
      // 记录指标
      const duration = (Date.now() - startTime) / 1000;
      const method = req.method || 'UNKNOWN';
      const route = getRoutePattern(path);
      const statusCode = res.statusCode;

      // 使用错误处理器安全执行指标记录
      monitoringErrorHandler.safeExecute(
        () => {
          config.collector!.recordHttpRequest(method, route, statusCode, duration, config.service);
        },
        MonitoringErrorType.METRICS_COLLECTION_FAILED,
        { method, route, statusCode, duration, service: config.service }
      );
    }
  };
}

/**
 * 支付系统监控装饰器（重构版本）
 * 专门用于支付相关的API端点
 */
export function withPaymentMetrics(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  stage: 'order_creation' | 'payment_processing' | 'isolated_verification'
) {
  return async function wrappedPaymentHandler(req: NextApiRequest, res: NextApiResponse) {
    const config = configManager.getConfig();

    // 如果支付监控被禁用，直接执行原始处理器
    if (!config.enabled || !config.metrics.payment.enabled) {
      return handler(req, res);
    }

    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      await handler(req, res);
      success = res.statusCode >= 200 && res.statusCode < 300;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      throw error;
    } finally {
      // 记录支付指标
      const duration = (Date.now() - startTime) / 1000;

      // 从请求中提取支付提供商信息
      const provider = extractPaymentProvider(req);

      if (provider) {
        // 使用错误处理器安全执行指标记录
        monitoringErrorHandler.safeExecute(
          () => {
            metricsCollector.recordPaymentMetrics(stage, provider, duration, success, errorType);
          },
          MonitoringErrorType.METRICS_COLLECTION_FAILED,
          { stage, provider, duration, success, errorType }
        );
      }
    }
  };
}

/**
 * 从请求中提取支付提供商信息
 */
function extractPaymentProvider(req: NextApiRequest): 'wechat' | 'alipay' | null {
  // 从URL路径中提取
  const path = req.url || '';
  if (path.includes('wechat') || path.includes('weixin')) {
    return 'wechat';
  }
  if (path.includes('alipay') || path.includes('zhifubao')) {
    return 'alipay';
  }

  // 从请求体中提取
  const body = req.body;
  if (body && typeof body === 'object') {
    if (body.provider === 'wechat' || body.paymentMethod === 'wechat') {
      return 'wechat';
    }
    if (body.provider === 'alipay' || body.paymentMethod === 'alipay') {
      return 'alipay';
    }
  }

  // 从查询参数中提取
  const query = req.query;
  if (query.provider === 'wechat' || query.payment_method === 'wechat') {
    return 'wechat';
  }
  if (query.provider === 'alipay' || query.payment_method === 'alipay') {
    return 'alipay';
  }

  return null;
}

/**
 * 业务指标更新辅助函数（重构版本）
 */
export function updateMetrics(metrics: {
  paymentSuccessRate?: number;
  userRegistrationRate?: number;
  orderCompletionRate?: number;
  activeUsers?: number;
  cacheHitRate?: number;
  databaseConnections?: number;
}) {
  const config = configManager.getConfig();

  // 如果业务监控被禁用，直接返回
  if (!config.enabled || !config.metrics.business.enabled) {
    return;
  }

  // 使用错误处理器安全执行指标更新
  monitoringErrorHandler.safeExecute(
    () => {
      metricsCollector.updateBusinessMetrics(metrics);
    },
    MonitoringErrorType.METRICS_COLLECTION_FAILED,
    { metrics }
  );
}
