/**
 * 智游助手v6.2 - 监控配置管理
 * 统一管理所有监控相关的配置
 */

// ================================
// 监控配置接口定义
// ================================

export interface MonitoringConfig {
  // 基础配置
  enabled: boolean;
  environment: 'development' | 'staging' | 'production' | 'test';
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    maxFileSize: number;
    maxFiles: number;
  };
  
  // 性能监控
  performance: {
    enabled: boolean;
    sampleRate: number;
    slowQueryThreshold: number;
    memoryThreshold: number;
    cpuThreshold: number;
  };
  
  // 错误监控
  errorTracking: {
    enabled: boolean;
    captureUnhandledRejections: boolean;
    captureUncaughtExceptions: boolean;
    maxErrorsPerMinute: number;
  };
  
  // 服务质量监控
  serviceQuality: {
    enabled: boolean;
    checkInterval: number;
    timeoutThreshold: number;
    failureThreshold: number;
    recoveryThreshold: number;
  };
  
  // 缓存监控
  cache: {
    enabled: boolean;
    hitRateThreshold: number;
    memoryUsageThreshold: number;
    cleanupInterval: number;
  };
  
  // 用户行为监控
  userBehavior: {
    enabled: boolean;
    trackPageViews: boolean;
    trackClicks: boolean;
    trackErrors: boolean;
    sessionTimeout: number;
  };
  
  // 告警配置
  alerts: {
    enabled: boolean;
    channels: ('email' | 'sms' | 'webhook')[];
    thresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
      diskUsage: number;
    };
  };
}

// ================================
// 默认配置
// ================================

const defaultConfig: MonitoringConfig = {
  enabled: process.env.NODE_ENV === 'production',
  environment: (process.env.NODE_ENV as any) || 'development',
  
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
    filePath: './logs/app.log',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  },
  
  performance: {
    enabled: true,
    sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    slowQueryThreshold: 1000, // 1秒
    memoryThreshold: 0.8, // 80%
    cpuThreshold: 0.8 // 80%
  },
  
  errorTracking: {
    enabled: true,
    captureUnhandledRejections: true,
    captureUncaughtExceptions: true,
    maxErrorsPerMinute: 100
  },
  
  serviceQuality: {
    enabled: true,
    checkInterval: 30000, // 30秒
    timeoutThreshold: 5000, // 5秒
    failureThreshold: 3, // 连续3次失败
    recoveryThreshold: 2 // 连续2次成功
  },
  
  cache: {
    enabled: true,
    hitRateThreshold: 0.8, // 80%
    memoryUsageThreshold: 0.9, // 90%
    cleanupInterval: 300000 // 5分钟
  },
  
  userBehavior: {
    enabled: process.env.NODE_ENV === 'production',
    trackPageViews: true,
    trackClicks: true,
    trackErrors: true,
    sessionTimeout: 30 * 60 * 1000 // 30分钟
  },
  
  alerts: {
    enabled: process.env.NODE_ENV === 'production',
    channels: ['email'],
    thresholds: {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2秒
      memoryUsage: 0.9, // 90%
      diskUsage: 0.9 // 90%
    }
  }
};

// ================================
// 配置管理器
// ================================

export class ConfigManager {
  private config: MonitoringConfig;
  private listeners: Map<string, ((config: MonitoringConfig) => void)[]> = new Map();

  constructor(initialConfig?: Partial<MonitoringConfig>) {
    this.config = {
      ...defaultConfig,
      ...initialConfig
    };
    
    console.log('📊 监控配置管理器初始化完成');
  }

  /**
   * 获取完整配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置项
   */
  get<K extends keyof MonitoringConfig>(key: K): MonitoringConfig[K] {
    return this.config[key];
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    const oldConfig = { ...this.config };
    this.config = {
      ...this.config,
      ...updates
    };

    // 通知监听器
    this.notifyListeners('config-updated', this.config);
    
    console.log('📊 监控配置已更新');
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...defaultConfig };
    this.notifyListeners('config-reset', this.config);
    console.log('📊 监控配置已重置为默认值');
  }

  /**
   * 添加配置变更监听器
   */
  addListener(event: string, callback: (config: MonitoringConfig) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 移除配置变更监听器
   */
  removeListener(event: string, callback: (config: MonitoringConfig) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: string, config: MonitoringConfig): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(config);
        } catch (error) {
          console.error('📊 配置监听器执行失败:', error);
        }
      });
    }
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证基础配置
    if (typeof this.config.enabled !== 'boolean') {
      errors.push('enabled 必须是布尔值');
    }

    // 验证日志配置
    if (this.config.logging.maxFileSize <= 0) {
      errors.push('logging.maxFileSize 必须大于0');
    }

    // 验证性能配置
    if (this.config.performance.sampleRate < 0 || this.config.performance.sampleRate > 1) {
      errors.push('performance.sampleRate 必须在0-1之间');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取环境特定配置
   */
  getEnvironmentConfig(): Partial<MonitoringConfig> {
    const env = process.env.NODE_ENV as string;

    switch (env) {
      case 'development':
        return {
          logging: { ...this.config.logging, level: 'debug' },
          performance: { ...this.config.performance, sampleRate: 1.0 },
          alerts: { ...this.config.alerts, enabled: false }
        };
      
      case 'staging':
        return {
          logging: { ...this.config.logging, level: 'info' },
          performance: { ...this.config.performance, sampleRate: 0.5 },
          alerts: { ...this.config.alerts, enabled: true }
        };
      
      case 'production':
        return {
          logging: { ...this.config.logging, level: 'warn' },
          performance: { ...this.config.performance, sampleRate: 0.1 },
          alerts: { ...this.config.alerts, enabled: true }
        };
      
      default:
        return {};
    }
  }
}

// ================================
// 导出单例实例
// ================================

export const configManager = new ConfigManager();

// 应用环境特定配置
configManager.updateConfig(configManager.getEnvironmentConfig());

export default configManager;
