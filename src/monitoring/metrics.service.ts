/**
 * 智游助手v6.2 监控指标服务
 * 基于现有健康检查系统的监控扩展
 */

import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { IAuditLogger } from '../audit/audit-logger.interface';

@Injectable()
export class MetricsService {
  // HTTP请求指标
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'service'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  // 支付系统专项指标（基于隔离式支付验证架构）
  private readonly paymentSuccessRate = new Gauge({
    name: 'smart_travel_payment_success_rate',
    help: 'Payment success rate (0-1)',
  });

  private readonly paymentResponseTime = new Histogram({
    name: 'smart_travel_payment_response_time_seconds',
    help: 'Payment response time in seconds',
    labelNames: ['stage', 'provider'],
    buckets: [0.5, 1, 2, 3, 5, 10, 15, 30],
  });

  private readonly paymentResponseTimeP95 = new Gauge({
    name: 'smart_travel_payment_response_time_p95',
    help: 'Payment P95 response time in seconds',
  });

  private readonly paymentErrorsTotal = new Counter({
    name: 'smart_travel_payment_errors_total',
    help: 'Total number of payment errors',
    labelNames: ['stage', 'provider', 'error_type'],
  });

  // 业务指标
  private readonly userRegistrationRate = new Gauge({
    name: 'smart_travel_user_registration_rate',
    help: 'User registration conversion rate (0-1)',
  });

  private readonly orderCompletionRate = new Gauge({
    name: 'smart_travel_order_completion_rate',
    help: 'Order completion rate (0-1)',
  });

  private readonly activeUsers = new Gauge({
    name: 'smart_travel_active_users',
    help: 'Number of active users',
  });

  // 系统指标
  private readonly databaseConnections = new Gauge({
    name: 'smart_travel_database_connections',
    help: 'Number of active database connections',
  });

  private readonly redisConnections = new Gauge({
    name: 'smart_travel_redis_connections',
    help: 'Number of active Redis connections',
  });

  private readonly cacheHitRate = new Gauge({
    name: 'smart_travel_cache_hit_rate',
    help: 'Cache hit rate (0-1)',
  });

  constructor(private readonly auditLogger: IAuditLogger) {
    // 启用默认系统指标收集
    collectDefaultMetrics({ register });
    
    // 初始化指标
    this.initializeMetrics();
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): void {
    // 设置初始值
    this.paymentSuccessRate.set(1.0);
    this.paymentResponseTimeP95.set(0);
    this.userRegistrationRate.set(0.15);
    this.orderCompletionRate.set(0.95);
    this.activeUsers.set(0);
    this.cacheHitRate.set(0.8);
  }

  /**
   * 记录HTTP请求指标
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    service: string = 'smart-travel'
  ): void {
    this.httpRequestsTotal
      .labels(method, route, statusCode.toString(), service)
      .inc();

    this.httpRequestDuration
      .labels(method, route, service)
      .observe(duration);
  }

  /**
   * 记录支付流程指标（基于隔离式支付验证架构）
   */
  recordPaymentMetrics(
    stage: 'order_creation' | 'payment_processing' | 'isolated_verification',
    provider: 'wechat' | 'alipay',
    duration: number,
    success: boolean,
    errorType?: string
  ): void {
    // 记录响应时间
    this.paymentResponseTime
      .labels(stage, provider)
      .observe(duration);

    // 记录错误
    if (!success && errorType) {
      this.paymentErrorsTotal
        .labels(stage, provider, errorType)
        .inc();
    }

    // 记录到审计日志（利用现有审计系统）
    this.auditLogger.logPaymentEvent({
      eventType: 'PAYMENT_METRICS',
      stage,
      provider,
      duration,
      success,
      errorType,
      timestamp: Date.now(),
    });
  }

  /**
   * 更新支付成功率
   */
  updatePaymentSuccessRate(rate: number): void {
    this.paymentSuccessRate.set(rate);
  }

  /**
   * 更新支付P95响应时间
   */
  updatePaymentResponseTimeP95(timeInSeconds: number): void {
    this.paymentResponseTimeP95.set(timeInSeconds);
  }

  /**
   * 更新业务指标
   */
  updateBusinessMetrics(metrics: {
    userRegistrationRate?: number;
    orderCompletionRate?: number;
    activeUsers?: number;
  }): void {
    if (metrics.userRegistrationRate !== undefined) {
      this.userRegistrationRate.set(metrics.userRegistrationRate);
    }
    if (metrics.orderCompletionRate !== undefined) {
      this.orderCompletionRate.set(metrics.orderCompletionRate);
    }
    if (metrics.activeUsers !== undefined) {
      this.activeUsers.set(metrics.activeUsers);
    }
  }

  /**
   * 更新系统指标
   */
  updateSystemMetrics(metrics: {
    databaseConnections?: number;
    redisConnections?: number;
    cacheHitRate?: number;
  }): void {
    if (metrics.databaseConnections !== undefined) {
      this.databaseConnections.set(metrics.databaseConnections);
    }
    if (metrics.redisConnections !== undefined) {
      this.redisConnections.set(metrics.redisConnections);
    }
    if (metrics.cacheHitRate !== undefined) {
      this.cacheHitRate.set(metrics.cacheHitRate);
    }
  }

  /**
   * 获取所有指标（Prometheus格式）
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * 获取指标注册表
   */
  getRegister() {
    return register;
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    register.clear();
  }

  /**
   * 健康检查指标
   */
  getHealthMetrics() {
    return {
      paymentSuccessRate: this.paymentSuccessRate.get(),
      paymentResponseTimeP95: this.paymentResponseTimeP95.get(),
      userRegistrationRate: this.userRegistrationRate.get(),
      orderCompletionRate: this.orderCompletionRate.get(),
      activeUsers: this.activeUsers.get(),
      cacheHitRate: this.cacheHitRate.get(),
    };
  }
}

/**
 * 支付监控专项服务
 * 基于隔离式支付验证架构的专业监控
 */
@Injectable()
export class PaymentMonitoringService {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * 监控支付流程
   */
  async trackPaymentFlow(
    orderId: string,
    stage: 'order_creation' | 'payment_processing' | 'isolated_verification',
    provider: 'wechat' | 'alipay',
    startTime: number
  ): Promise<void> {
    const duration = (Date.now() - startTime) / 1000;
    
    // 记录指标
    this.metricsService.recordPaymentMetrics(
      stage,
      provider,
      duration,
      true // 成功情况
    );
  }

  /**
   * 监控支付错误
   */
  async trackPaymentError(
    orderId: string,
    stage: 'order_creation' | 'payment_processing' | 'isolated_verification',
    provider: 'wechat' | 'alipay',
    errorType: string,
    startTime: number
  ): Promise<void> {
    const duration = (Date.now() - startTime) / 1000;
    
    // 记录错误指标
    this.metricsService.recordPaymentMetrics(
      stage,
      provider,
      duration,
      false, // 失败情况
      errorType
    );
  }

  /**
   * 计算并更新支付成功率
   */
  async updatePaymentSuccessRate(): Promise<void> {
    // 这里应该从数据库或缓存中获取实际的支付成功率
    // 示例实现
    const successRate = await this.calculatePaymentSuccessRate();
    this.metricsService.updatePaymentSuccessRate(successRate);
  }

  /**
   * 计算支付成功率（示例实现）
   */
  private async calculatePaymentSuccessRate(): Promise<number> {
    // 实际实现应该查询数据库获取最近的支付数据
    // 这里返回模拟数据
    return 0.99;
  }
}

/**
 * 监控中间件
 * 自动记录HTTP请求指标
 */
export function MetricsMiddleware(metricsService: MetricsService) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
    });
    
    next();
  };
}
