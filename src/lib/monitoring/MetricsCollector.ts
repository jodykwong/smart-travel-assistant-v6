/**
 * 指标收集器 - 解耦监控逻辑和业务逻辑
 * 遵循依赖倒置原则，使用接口而非具体实现
 */

import { Counter, Gauge, Histogram } from 'prom-client';
import { metricsRegistry } from './MetricsRegistry';

// 指标收集器接口
export interface IMetricsCollector {
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, service?: string): void;
  recordPaymentMetrics(stage: PaymentStage, provider: PaymentProvider, duration: number, success: boolean, errorType?: string): void;
  updateBusinessMetrics(metrics: BusinessMetrics): void;
  recordError(error: Error, context: ErrorContext): void;
}

// 支付阶段类型
export type PaymentStage = 'order_creation' | 'payment_processing' | 'isolated_verification';

// 支付提供商类型
export type PaymentProvider = 'wechat' | 'alipay';

// 业务指标接口
export interface BusinessMetrics {
  paymentSuccessRate?: number;
  userRegistrationRate?: number;
  orderCompletionRate?: number;
  activeUsers?: number;
  cacheHitRate?: number;
  databaseConnections?: number;
}

// 错误上下文接口
export interface ErrorContext {
  service: string;
  method: string;
  route: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Prometheus指标收集器实现
 */
export class PrometheusMetricsCollector implements IMetricsCollector {
  private httpRequestsTotal?: Counter<string>;
  private httpRequestDuration?: Histogram<string>;
  private paymentSuccessRate?: Gauge<string>;
  private paymentResponseTime?: Histogram<string>;
  private paymentErrorsTotal?: Counter<string>;
  private userRegistrationRate?: Gauge<string>;
  private orderCompletionRate?: Gauge<string>;
  private activeUsers?: Gauge<string>;
  private databaseConnections?: Gauge<string>;
  private cacheHitRate?: Gauge<string>;
  private errorsTotal?: Counter<string>;

  constructor() {
    this.initializeMetrics();
  }

  /**
   * 记录HTTP请求指标
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, service?: string): void {
    try {
      const config = metricsRegistry.getConfig();
      const serviceName = service || config.service.name;

      // 记录请求总数
      this.httpRequestsTotal?.labels(method, route, statusCode.toString(), serviceName).inc();

      // 记录请求持续时间
      this.httpRequestDuration?.labels(method, route, serviceName).observe(duration);

    } catch (error) {
      this.handleMetricsError(error, 'recordHttpRequest', { method, route, statusCode, duration, service });
    }
  }

  /**
   * 记录支付系统指标
   */
  recordPaymentMetrics(
    stage: PaymentStage,
    provider: PaymentProvider,
    duration: number,
    success: boolean,
    errorType?: string
  ): void {
    try {
      // 记录响应时间
      this.paymentResponseTime?.labels(stage, provider).observe(duration);

      // 记录错误
      if (!success && errorType) {
        this.paymentErrorsTotal?.labels(stage, provider, errorType).inc();
      }

      // 更新成功率（简化计算，实际应用中可能需要更复杂的逻辑）
      if (this.paymentSuccessRate) {
        const currentRate = success ? 0.99 : 0.95; // 简化示例
        this.paymentSuccessRate.set(currentRate);
      }

    } catch (error) {
      this.handleMetricsError(error, 'recordPaymentMetrics', { stage, provider, duration, success, errorType });
    }
  }

  /**
   * 更新业务指标
   */
  updateBusinessMetrics(metrics: BusinessMetrics): void {
    try {
      if (metrics.paymentSuccessRate !== undefined) {
        this.paymentSuccessRate?.set(metrics.paymentSuccessRate);
      }

      if (metrics.userRegistrationRate !== undefined) {
        this.userRegistrationRate?.set(metrics.userRegistrationRate);
      }

      if (metrics.orderCompletionRate !== undefined) {
        this.orderCompletionRate?.set(metrics.orderCompletionRate);
      }

      if (metrics.activeUsers !== undefined) {
        this.activeUsers?.set(metrics.activeUsers);
      }

      if (metrics.cacheHitRate !== undefined) {
        this.cacheHitRate?.set(metrics.cacheHitRate);
      }

      if (metrics.databaseConnections !== undefined) {
        this.databaseConnections?.set(metrics.databaseConnections);
      }

    } catch (error) {
      this.handleMetricsError(error, 'updateBusinessMetrics', { metrics });
    }
  }

  /**
   * 记录错误指标
   */
  recordError(error: Error, context: ErrorContext): void {
    try {
      this.errorsTotal?.labels(
        context.service,
        context.method,
        context.route,
        error.constructor.name
      ).inc();

    } catch (metricsError) {
      this.handleMetricsError(metricsError, 'recordError', { error: error.message, context });
    }
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): void {
    // 确保指标注册中心已初始化
    metricsRegistry.initialize();

    // 获取已注册的指标
    this.httpRequestsTotal = metricsRegistry.getMetric<Counter<string>>('http_requests_total');
    this.httpRequestDuration = metricsRegistry.getMetric<Histogram<string>>('http_request_duration_seconds');
    this.paymentSuccessRate = metricsRegistry.getMetric<Gauge<string>>('smart_travel_payment_success_rate');
    this.paymentResponseTime = metricsRegistry.getMetric<Histogram<string>>('smart_travel_payment_response_time_seconds');
    this.paymentErrorsTotal = metricsRegistry.getMetric<Counter<string>>('smart_travel_payment_errors_total');
    this.userRegistrationRate = metricsRegistry.getMetric<Gauge<string>>('smart_travel_user_registration_rate');
    this.orderCompletionRate = metricsRegistry.getMetric<Gauge<string>>('smart_travel_order_completion_rate');
    this.activeUsers = metricsRegistry.getMetric<Gauge<string>>('smart_travel_active_users');
    this.databaseConnections = metricsRegistry.getMetric<Gauge<string>>('smart_travel_database_connections');
    this.cacheHitRate = metricsRegistry.getMetric<Gauge<string>>('smart_travel_cache_hit_rate');

    // 注册错误指标（如果不存在）
    if (!metricsRegistry.getMetric('errors_total')) {
      metricsRegistry.registerMetric({
        name: 'errors_total',
        help: 'Total number of errors by service, method, route and error type',
        type: 'counter',
        labelNames: ['service', 'method', 'route', 'error_type']
      });
      this.errorsTotal = metricsRegistry.getMetric<Counter<string>>('errors_total');
    }
  }

  /**
   * 处理指标收集错误
   */
  private handleMetricsError(error: any, operation: string, context: any): void {
    // 记录错误但不影响业务流程
    console.error(`Metrics collection error in ${operation}:`, {
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    });

    // 可以在这里添加降级处理逻辑
    // 例如：将指标暂存到本地缓存，稍后重试
  }
}

/**
 * 空指标收集器 - 用于禁用监控时的降级处理
 */
export class NullMetricsCollector implements IMetricsCollector {
  recordHttpRequest(): void {
    // 空实现
  }

  recordPaymentMetrics(): void {
    // 空实现
  }

  updateBusinessMetrics(): void {
    // 空实现
  }

  recordError(): void {
    // 空实现
  }
}

/**
 * 指标收集器工厂
 */
export class MetricsCollectorFactory {
  static create(): IMetricsCollector {
    const config = metricsRegistry.getConfig();
    
    if (config.enabled) {
      return new PrometheusMetricsCollector();
    } else {
      return new NullMetricsCollector();
    }
  }
}

// 导出默认实例
export const metricsCollector = MetricsCollectorFactory.create();
