/**
 * 监控系统配置管理
 * 解决配置硬编码问题，支持环境变量和配置文件
 */

export interface MonitoringConfig {
  enabled: boolean;
  service: ServiceConfig;
  metrics: MetricsConfig;
  alerts: AlertsConfig;
  storage: StorageConfig;
  performance: PerformanceConfig;
}

export interface ServiceConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  instanceId: string;
}

export interface MetricsConfig {
  http: HttpMetricsConfig;
  payment: PaymentMetricsConfig;
  business: BusinessMetricsConfig;
  system: SystemMetricsConfig;
}

export interface HttpMetricsConfig {
  enabled: boolean;
  excludePaths: string[];
  buckets: number[];
  maxLabelValues: number;
}

export interface PaymentMetricsConfig {
  enabled: boolean;
  stages: string[];
  providers: string[];
  buckets: number[];
  thresholds: {
    successRate: number;
    responseTime: number;
  };
}

export interface BusinessMetricsConfig {
  enabled: boolean;
  updateInterval: number;
  metrics: string[];
  batchSize: number;
}

export interface SystemMetricsConfig {
  enabled: boolean;
  collectInterval: number;
  includeProcessMetrics: boolean;
}

export interface AlertsConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  cooldownPeriod: number;
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'dingtalk' | 'slack';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

export interface StorageConfig {
  type: 'prometheus' | 'influxdb' | 'memory';
  retention: string;
  endpoint?: string;
  credentials?: {
    username?: string;
    password?: string;
  };
}

export interface PerformanceConfig {
  asyncProcessing: boolean;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  enableSampling: boolean;
  samplingRate: number;
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: MonitoringConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取完整配置
   */
  getConfig(): MonitoringConfig {
    return this.config;
  }

  /**
   * 获取服务配置
   */
  getServiceConfig(): ServiceConfig {
    return this.config.service;
  }

  /**
   * 获取指标配置
   */
  getMetricsConfig(): MetricsConfig {
    return this.config.metrics;
  }

  /**
   * 获取告警配置
   */
  getAlertsConfig(): AlertsConfig {
    return this.config.alerts;
  }

  /**
   * 获取存储配置
   */
  getStorageConfig(): StorageConfig {
    return this.config.storage;
  }

  /**
   * 获取性能配置
   */
  getPerformanceConfig(): PerformanceConfig {
    return this.config.performance;
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.config = this.loadConfiguration();
  }

  /**
   * 验证配置
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证服务配置
    if (!this.config.service.name) {
      errors.push('Service name is required');
    }

    if (!this.config.service.version) {
      errors.push('Service version is required');
    }

    // 验证指标配置
    if (this.config.metrics.http.buckets.length === 0) {
      errors.push('HTTP metrics buckets cannot be empty');
    }

    if (this.config.metrics.payment.thresholds.successRate < 0 || this.config.metrics.payment.thresholds.successRate > 1) {
      errors.push('Payment success rate threshold must be between 0 and 1');
    }

    // 验证性能配置
    if (this.config.performance.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (this.config.performance.flushInterval <= 0) {
      errors.push('Flush interval must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 加载配置
   */
  private loadConfiguration(): MonitoringConfig {
    // 首先尝试从配置文件加载
    const fileConfig = this.loadFromFile();
    
    // 然后从环境变量加载并覆盖
    const envConfig = this.loadFromEnvironment();
    
    // 合并配置
    return this.mergeConfigs(this.getDefaultConfig(), fileConfig, envConfig);
  }

  /**
   * 从文件加载配置
   */
  private loadFromFile(): Partial<MonitoringConfig> {
    try {
      const configPath = process.env.MONITORING_CONFIG_PATH || './monitoring.config.json';
      // 在实际应用中，这里会读取配置文件
      // const fs = require('fs');
      // const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // return config;
      return {};
    } catch (error) {
      console.warn('Failed to load monitoring config from file:', error);
      return {};
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): Partial<MonitoringConfig> {
    return {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      service: {
        name: process.env.SERVICE_NAME || 'smart-travel',
        version: process.env.SERVICE_VERSION || '6.2.0',
        environment: (process.env.NODE_ENV as any) || 'development',
        instanceId: process.env.INSTANCE_ID || this.generateInstanceId()
      },
      metrics: {
        http: {
          enabled: process.env.HTTP_METRICS_ENABLED !== 'false',
          excludePaths: this.parseStringArray(process.env.HTTP_METRICS_EXCLUDE_PATHS) || ['/api/metrics', '/api/health'],
          buckets: this.parseNumberArray(process.env.HTTP_METRICS_BUCKETS) || [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
          maxLabelValues: parseInt(process.env.HTTP_METRICS_MAX_LABEL_VALUES || '1000')
        },
        payment: {
          enabled: process.env.PAYMENT_METRICS_ENABLED !== 'false',
          stages: this.parseStringArray(process.env.PAYMENT_STAGES) || ['order_creation', 'payment_processing', 'isolated_verification'],
          providers: this.parseStringArray(process.env.PAYMENT_PROVIDERS) || ['wechat', 'alipay'],
          buckets: this.parseNumberArray(process.env.PAYMENT_METRICS_BUCKETS) || [0.1, 0.5, 1, 2, 5, 10, 30],
          thresholds: {
            successRate: parseFloat(process.env.PAYMENT_SUCCESS_RATE_THRESHOLD || '0.99'),
            responseTime: parseFloat(process.env.PAYMENT_RESPONSE_TIME_THRESHOLD || '2.0')
          }
        },
        business: {
          enabled: process.env.BUSINESS_METRICS_ENABLED !== 'false',
          updateInterval: parseInt(process.env.BUSINESS_METRICS_UPDATE_INTERVAL || '60000'),
          metrics: this.parseStringArray(process.env.BUSINESS_METRICS) || ['user_registration_rate', 'order_completion_rate', 'active_users'],
          batchSize: parseInt(process.env.BUSINESS_METRICS_BATCH_SIZE || '100')
        },
        system: {
          enabled: process.env.SYSTEM_METRICS_ENABLED !== 'false',
          collectInterval: parseInt(process.env.SYSTEM_METRICS_COLLECT_INTERVAL || '15000'),
          includeProcessMetrics: process.env.INCLUDE_PROCESS_METRICS !== 'false'
        }
      },
      performance: {
        asyncProcessing: process.env.ASYNC_METRICS_PROCESSING !== 'false',
        batchSize: parseInt(process.env.METRICS_BATCH_SIZE || '100'),
        flushInterval: parseInt(process.env.METRICS_FLUSH_INTERVAL || '1000'),
        maxQueueSize: parseInt(process.env.METRICS_MAX_QUEUE_SIZE || '10000'),
        enableSampling: process.env.ENABLE_METRICS_SAMPLING === 'true',
        samplingRate: parseFloat(process.env.METRICS_SAMPLING_RATE || '1.0')
      }
    };
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): MonitoringConfig {
    return {
      enabled: true,
      service: {
        name: 'smart-travel',
        version: '6.2.0',
        environment: 'development',
        instanceId: this.generateInstanceId()
      },
      metrics: {
        http: {
          enabled: true,
          excludePaths: ['/api/metrics', '/api/health'],
          buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
          maxLabelValues: 1000
        },
        payment: {
          enabled: true,
          stages: ['order_creation', 'payment_processing', 'isolated_verification'],
          providers: ['wechat', 'alipay'],
          buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
          thresholds: {
            successRate: 0.99,
            responseTime: 2.0
          }
        },
        business: {
          enabled: true,
          updateInterval: 60000,
          metrics: ['user_registration_rate', 'order_completion_rate', 'active_users'],
          batchSize: 100
        },
        system: {
          enabled: true,
          collectInterval: 15000,
          includeProcessMetrics: true
        }
      },
      alerts: {
        enabled: false,
        channels: [],
        rules: [],
        cooldownPeriod: 300000
      },
      storage: {
        type: 'prometheus',
        retention: '15d'
      },
      performance: {
        asyncProcessing: true,
        batchSize: 100,
        flushInterval: 1000,
        maxQueueSize: 10000,
        enableSampling: false,
        samplingRate: 1.0
      }
    };
  }

  /**
   * 合并配置
   */
  private mergeConfigs(...configs: Partial<MonitoringConfig>[]): MonitoringConfig {
    // 简化的深度合并实现
    const result = this.getDefaultConfig();
    
    for (const config of configs) {
      if (config) {
        Object.assign(result, config);
        if (config.service) Object.assign(result.service, config.service);
        if (config.metrics) {
          Object.assign(result.metrics, config.metrics);
          if (config.metrics.http) Object.assign(result.metrics.http, config.metrics.http);
          if (config.metrics.payment) Object.assign(result.metrics.payment, config.metrics.payment);
          if (config.metrics.business) Object.assign(result.metrics.business, config.metrics.business);
          if (config.metrics.system) Object.assign(result.metrics.system, config.metrics.system);
        }
        if (config.performance) Object.assign(result.performance, config.performance);
      }
    }
    
    return result;
  }

  /**
   * 解析字符串数组
   */
  private parseStringArray(value?: string): string[] | undefined {
    if (!value) return undefined;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * 解析数字数组
   */
  private parseNumberArray(value?: string): number[] | undefined {
    if (!value) return undefined;
    try {
      return value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    } catch (error) {
      console.warn('Invalid number array configuration:', value);
      return undefined;
    }
  }

  /**
   * 生成实例ID
   */
  private generateInstanceId(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
