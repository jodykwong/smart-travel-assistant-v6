// ==========================================
// 重构前 vs 重构后 - 代码对比示例
// ==========================================

// ❌ 重构前 - 违反DRY、KISS原则
// 文件: src/pages/api/metrics.ts (当前实现)
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

const paymentSuccessRate = new Gauge({
  name: 'smart_travel_payment_success_rate',
  help: 'Payment success rate (0-1)',
  registers: [register]
});

// 问题: 指标定义分散、重复代码、硬编码

// ✅ 重构后 - 遵循DRY、KISS、单一职责原则
// 文件: src/lib/monitoring/MetricsRegistry.ts
interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labelNames?: string[];
  buckets?: number[];
}

class MetricsRegistry {
  private static instance: MetricsRegistry;
  private metrics = new Map<string, any>();
  
  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }
  
  registerMetric(definition: MetricDefinition) {
    // 统一的指标注册逻辑
    // 自动处理重复注册、命名规范等
  }
}

// ==========================================
// 监控装饰器重构
// ==========================================

// ❌ 重构前 - 紧耦合、硬编码
export function withPaymentMetrics(handler, stage) {
  return async function wrappedPaymentHandler(req, res) {
    const startTime = Date.now();
    try {
      await handler(req, res);
      // 硬编码的指标记录逻辑
      const { recordPaymentMetrics } = require('../../pages/api/metrics');
      recordPaymentMetrics(stage, provider, duration, success);
    } catch (error) {
      // 错误处理逻辑
    }
  };
}

// ✅ 重构后 - 依赖注入、配置驱动
interface MonitoringConfig {
  enabled: boolean;
  stage: PaymentStage;
  metrics: string[];
  thresholds: Record<string, number>;
}

class PaymentMonitoringDecorator {
  constructor(
    private metricsCollector: IMetricsCollector,
    private config: MonitoringConfig
  ) {}
  
  monitor<T extends Function>(handler: T): T {
    return (async (...args: any[]) => {
      if (!this.config.enabled) return handler(...args);
      
      const context = this.createMonitoringContext(args);
      const timer = this.metricsCollector.startTimer(this.config.stage);
      
      try {
        const result = await handler(...args);
        this.recordSuccess(context, timer);
        return result;
      } catch (error) {
        this.recordError(context, timer, error);
        throw error;
      }
    }) as T;
  }
}

// ==========================================
// 配置管理重构
// ==========================================

// ❌ 重构前 - 硬编码配置
const defaultOptions: MetricsMiddlewareOptions = {
  enabled: true,
  excludePaths: ['/api/metrics', '/api/health'],
  service: 'smart-travel-v6.2'
};

// ✅ 重构后 - 配置中心化
// 文件: src/config/monitoring.config.ts
export interface MonitoringConfig {
  enabled: boolean;
  service: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  metrics: {
    http: {
      enabled: boolean;
      excludePaths: string[];
      buckets: number[];
    };
    payment: {
      enabled: boolean;
      stages: PaymentStage[];
      providers: PaymentProvider[];
      thresholds: {
        successRate: number;
        responseTime: number;
      };
    };
    business: {
      enabled: boolean;
      updateInterval: number;
      metrics: string[];
    };
  };
  storage: {
    type: 'prometheus' | 'influxdb';
    retention: string;
    endpoint: string;
  };
  alerting: {
    enabled: boolean;
    channels: AlertChannel[];
    rules: AlertRule[];
  };
}

class ConfigManager {
  private static config: MonitoringConfig;
  
  static load(): MonitoringConfig {
    if (!ConfigManager.config) {
      ConfigManager.config = this.loadFromEnvironment();
    }
    return ConfigManager.config;
  }
  
  private static loadFromEnvironment(): MonitoringConfig {
    return {
      enabled: process.env.MONITORING_ENABLED === 'true',
      service: {
        name: process.env.SERVICE_NAME || 'smart-travel',
        version: process.env.SERVICE_VERSION || '6.2.0',
        environment: (process.env.NODE_ENV as any) || 'development'
      },
      // ... 其他配置从环境变量加载
    };
  }
}

// ==========================================
// 错误处理重构
// ==========================================

// ❌ 重构前 - 简单的try-catch
try {
  recordHttpRequest(method, route, statusCode, duration, config.service);
} catch (error) {
  console.error('Error recording HTTP metrics:', error);
}

// ✅ 重构后 - 结构化错误处理
class MonitoringErrorHandler {
  private logger: ILogger;
  private fallbackMetrics: IFallbackMetrics;
  
  handleMetricsError(error: Error, context: MetricsContext): void {
    // 1. 记录结构化错误日志
    this.logger.error('Metrics collection failed', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });
    
    // 2. 降级处理 - 使用本地缓存
    this.fallbackMetrics.record(context);
    
    // 3. 触发告警（如果错误率过高）
    this.checkErrorThreshold(error);
    
    // 4. 不影响业务流程
    // 监控失败不应该影响用户请求
  }
}

// ==========================================
// 性能优化重构
// ==========================================

// ❌ 重构前 - 同步处理
export function recordHttpRequest(method, route, statusCode, duration, service) {
  httpRequestsTotal.labels(method, route, statusCode.toString(), service).inc();
  httpRequestDuration.labels(method, route, service).observe(duration);
}

// ✅ 重构后 - 异步批处理
class AsyncMetricsCollector {
  private buffer: MetricsEvent[] = [];
  private batchSize = 100;
  private flushInterval = 1000; // 1秒
  
  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  record(event: MetricsEvent): void {
    this.buffer.push(event);
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const events = this.buffer.splice(0);
    
    // 异步批量处理，不阻塞主线程
    setImmediate(() => {
      this.processBatch(events);
    });
  }
}
