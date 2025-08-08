/**
 * 统一指标注册中心
 * 解决指标定义分散问题，遵循DRY原则
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// 指标定义接口
export interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labelNames?: string[];
  buckets?: number[];
}

// 监控配置接口
export interface MonitoringConfig {
  enabled: boolean;
  service: {
    name: string;
    version: string;
    environment: string;
  };
  metrics: {
    http: {
      enabled: boolean;
      buckets: number[];
    };
    payment: {
      enabled: boolean;
      buckets: number[];
    };
    business: {
      enabled: boolean;
      updateInterval: number;
    };
  };
}

/**
 * 指标注册中心 - 单例模式
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry;
  private metrics = new Map<string, Counter | Gauge | Histogram>();
  private config: MonitoringConfig;
  private initialized = false;
  private defaultMetricsInitialized = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  /**
   * 初始化指标注册中心
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // 启用默认系统指标收集（只在第一次初始化时）
    if (this.config.enabled && !this.defaultMetricsInitialized) {
      try {
        collectDefaultMetrics({ register });
        this.defaultMetricsInitialized = true;
      } catch (error) {
        // 如果已经注册过，忽略错误
        if (!error.message.includes('already been registered')) {
          throw error;
        }
        this.defaultMetricsInitialized = true;
      }
    }

    // 注册所有预定义指标
    this.registerPredefinedMetrics();
    this.initialized = true;
  }

  /**
   * 注册指标
   */
  registerMetric(definition: MetricDefinition): void {
    if (this.metrics.has(definition.name)) {
      console.warn(`Metric ${definition.name} already registered`);
      return;
    }

    let metric: Counter | Gauge | Histogram;

    switch (definition.type) {
      case 'counter':
        metric = new Counter({
          name: definition.name,
          help: definition.help,
          labelNames: definition.labelNames || [],
          registers: [register]
        });
        break;

      case 'gauge':
        metric = new Gauge({
          name: definition.name,
          help: definition.help,
          labelNames: definition.labelNames || [],
          registers: [register]
        });
        break;

      case 'histogram':
        metric = new Histogram({
          name: definition.name,
          help: definition.help,
          labelNames: definition.labelNames || [],
          buckets: definition.buckets || [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
          registers: [register]
        });
        break;

      default:
        throw new Error(`Unsupported metric type: ${definition.type}`);
    }

    this.metrics.set(definition.name, metric);
  }

  /**
   * 获取指标
   */
  getMetric<T extends Counter | Gauge | Histogram>(name: string): T | undefined {
    return this.metrics.get(name) as T;
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): string {
    return register.metrics();
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    register.clear();
    this.metrics.clear();
    this.initialized = false;
  }

  /**
   * 获取配置
   */
  getConfig(): MonitoringConfig {
    return this.config;
  }

  /**
   * 注册预定义指标
   */
  private registerPredefinedMetrics(): void {
    // HTTP请求指标
    if (this.config.metrics.http.enabled) {
      if (!this.metrics.has('http_requests_total')) {
        this.registerMetric({
          name: 'http_requests_total',
          help: 'Total number of HTTP requests',
          type: 'counter',
          labelNames: ['method', 'route', 'status_code', 'service']
        });
      }

      if (!this.metrics.has('http_request_duration_seconds')) {
        this.registerMetric({
          name: 'http_request_duration_seconds',
          help: 'Duration of HTTP requests in seconds',
          type: 'histogram',
          labelNames: ['method', 'route', 'service'],
          buckets: this.config.metrics.http.buckets
        });
      }
    }

    // 支付系统指标
    if (this.config.metrics.payment.enabled) {
      if (!this.metrics.has('smart_travel_payment_success_rate')) {
        this.registerMetric({
          name: 'smart_travel_payment_success_rate',
          help: 'Payment success rate (0-1)',
          type: 'gauge'
        });
      }

      if (!this.metrics.has('smart_travel_payment_response_time_seconds')) {
        this.registerMetric({
          name: 'smart_travel_payment_response_time_seconds',
          help: 'Payment processing response time by stage and provider',
          type: 'histogram',
          labelNames: ['stage', 'provider'],
          buckets: this.config.metrics.payment.buckets
        });
      }

      if (!this.metrics.has('smart_travel_payment_errors_total')) {
        this.registerMetric({
          name: 'smart_travel_payment_errors_total',
          help: 'Total payment errors by stage, provider and error type',
          type: 'counter',
          labelNames: ['stage', 'provider', 'error_type']
        });
      }
    }

    // 业务指标
    if (this.config.metrics.business.enabled) {
      if (!this.metrics.has('smart_travel_user_registration_rate')) {
        this.registerMetric({
          name: 'smart_travel_user_registration_rate',
          help: 'User registration conversion rate (0-1)',
          type: 'gauge'
        });
      }

      if (!this.metrics.has('smart_travel_order_completion_rate')) {
        this.registerMetric({
          name: 'smart_travel_order_completion_rate',
          help: 'Order completion rate (0-1)',
          type: 'gauge'
        });
      }

      if (!this.metrics.has('smart_travel_active_users')) {
        this.registerMetric({
          name: 'smart_travel_active_users',
          help: 'Number of currently active users',
          type: 'gauge'
        });
      }

      if (!this.metrics.has('smart_travel_database_connections')) {
        this.registerMetric({
          name: 'smart_travel_database_connections',
          help: 'Number of active database connections',
          type: 'gauge'
        });
      }

      if (!this.metrics.has('smart_travel_cache_hit_rate')) {
        this.registerMetric({
          name: 'smart_travel_cache_hit_rate',
          help: 'Cache hit rate (0-1)',
          type: 'gauge'
        });
      }
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): MonitoringConfig {
    return {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      service: {
        name: process.env.SERVICE_NAME || 'smart-travel',
        version: process.env.SERVICE_VERSION || '6.2.0',
        environment: process.env.NODE_ENV || 'development'
      },
      metrics: {
        http: {
          enabled: process.env.HTTP_METRICS_ENABLED !== 'false',
          buckets: this.parseBuckets(process.env.HTTP_METRICS_BUCKETS) || [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
        },
        payment: {
          enabled: process.env.PAYMENT_METRICS_ENABLED !== 'false',
          buckets: this.parseBuckets(process.env.PAYMENT_METRICS_BUCKETS) || [0.1, 0.5, 1, 2, 5, 10, 30]
        },
        business: {
          enabled: process.env.BUSINESS_METRICS_ENABLED !== 'false',
          updateInterval: parseInt(process.env.BUSINESS_METRICS_UPDATE_INTERVAL || '60000')
        }
      }
    };
  }

  /**
   * 解析桶配置
   */
  private parseBuckets(bucketsStr?: string): number[] | undefined {
    if (!bucketsStr) return undefined;
    
    try {
      return bucketsStr.split(',').map(b => parseFloat(b.trim()));
    } catch (error) {
      console.warn('Invalid buckets configuration:', bucketsStr);
      return undefined;
    }
  }
}

// 导出单例实例
export const metricsRegistry = MetricsRegistry.getInstance();
