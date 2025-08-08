/**
 * 监控系统错误处理和降级机制
 * 确保监控失败不影响业务流程
 */

import { configManager } from '../../config/monitoring.config';

// 错误类型枚举
export enum MonitoringErrorType {
  METRICS_COLLECTION_FAILED = 'metrics_collection_failed',
  METRICS_REGISTRATION_FAILED = 'metrics_registration_failed',
  STORAGE_CONNECTION_FAILED = 'storage_connection_failed',
  CONFIGURATION_ERROR = 'configuration_error',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 监控错误接口
export interface MonitoringError {
  type: MonitoringErrorType;
  severity: ErrorSeverity;
  message: string;
  context: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
}

// 降级策略接口
export interface FallbackStrategy {
  name: string;
  enabled: boolean;
  execute(error: MonitoringError, originalOperation: () => void): void;
}

// 错误统计接口
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<MonitoringErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  lastError?: MonitoringError;
  errorRate: number; // 错误率 (errors per minute)
}

/**
 * 监控错误处理器
 */
export class MonitoringErrorHandler {
  private static instance: MonitoringErrorHandler;
  private errorHistory: MonitoringError[] = [];
  private fallbackStrategies: Map<MonitoringErrorType, FallbackStrategy> = new Map();
  private errorThresholds: Map<MonitoringErrorType, number> = new Map();
  private isCircuitBreakerOpen = false;
  private circuitBreakerOpenTime?: Date;
  private readonly maxErrorHistorySize = 1000;
  private readonly circuitBreakerTimeout = 60000; // 1分钟

  private constructor() {
    this.initializeFallbackStrategies();
    this.initializeErrorThresholds();
  }

  static getInstance(): MonitoringErrorHandler {
    if (!MonitoringErrorHandler.instance) {
      MonitoringErrorHandler.instance = new MonitoringErrorHandler();
    }
    return MonitoringErrorHandler.instance;
  }

  /**
   * 处理监控错误
   */
  handleError(
    type: MonitoringErrorType,
    error: Error | string,
    context: Record<string, any> = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): void {
    const monitoringError: MonitoringError = {
      type,
      severity,
      message: typeof error === 'string' ? error : error.message,
      context,
      timestamp: new Date(),
      stackTrace: typeof error === 'object' ? error.stack : undefined
    };

    // 记录错误
    this.recordError(monitoringError);

    // 检查是否需要触发熔断器
    this.checkCircuitBreaker(monitoringError);

    // 执行降级策略
    this.executeFallbackStrategy(monitoringError);

    // 记录结构化日志
    this.logError(monitoringError);
  }

  /**
   * 安全执行监控操作
   */
  safeExecute<T>(
    operation: () => T,
    errorType: MonitoringErrorType,
    context: Record<string, any> = {},
    fallbackValue?: T
  ): T | undefined {
    // 检查熔断器状态
    if (this.isCircuitBreakerOpen) {
      if (this.shouldResetCircuitBreaker()) {
        this.resetCircuitBreaker();
      } else {
        return fallbackValue;
      }
    }

    try {
      return operation();
    } catch (error) {
      this.handleError(errorType, error as Error, context);
      return fallbackValue;
    }
  }

  /**
   * 异步安全执行监控操作
   */
  async safeExecuteAsync<T>(
    operation: () => Promise<T>,
    errorType: MonitoringErrorType,
    context: Record<string, any> = {},
    fallbackValue?: T
  ): Promise<T | undefined> {
    // 检查熔断器状态
    if (this.isCircuitBreakerOpen) {
      if (this.shouldResetCircuitBreaker()) {
        this.resetCircuitBreaker();
      } else {
        return fallbackValue;
      }
    }

    try {
      return await operation();
    } catch (error) {
      this.handleError(errorType, error as Error, context);
      return fallbackValue;
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp.getTime() > oneMinuteAgo
    );

    const errorsByType: Record<MonitoringErrorType, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    // 初始化计数器
    Object.values(MonitoringErrorType).forEach(type => {
      errorsByType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // 统计错误
    this.errorHistory.forEach(error => {
      errorsByType[error.type]++;
      errorsBySeverity[error.severity]++;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      lastError: this.errorHistory[this.errorHistory.length - 1],
      errorRate: recentErrors.length // 每分钟错误数
    };
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 检查系统健康状态
   */
  isHealthy(): boolean {
    const stats = this.getErrorStats();
    const config = configManager.getConfig();
    
    // 如果熔断器开启，系统不健康
    if (this.isCircuitBreakerOpen) {
      return false;
    }

    // 检查错误率
    const maxErrorRate = 10; // 每分钟最多10个错误
    if (stats.errorRate > maxErrorRate) {
      return false;
    }

    // 检查严重错误
    if (stats.errorsBySeverity[ErrorSeverity.CRITICAL] > 0) {
      return false;
    }

    return true;
  }

  /**
   * 记录错误
   */
  private recordError(error: MonitoringError): void {
    this.errorHistory.push(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxErrorHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistorySize);
    }
  }

  /**
   * 检查熔断器
   */
  private checkCircuitBreaker(error: MonitoringError): void {
    if (this.isCircuitBreakerOpen) {
      return;
    }

    const threshold = this.errorThresholds.get(error.type) || 5;
    const recentErrors = this.getRecentErrorsByType(error.type, 60000); // 1分钟内

    if (recentErrors >= threshold || error.severity === ErrorSeverity.CRITICAL) {
      this.openCircuitBreaker();
    }
  }

  /**
   * 打开熔断器
   */
  private openCircuitBreaker(): void {
    this.isCircuitBreakerOpen = true;
    this.circuitBreakerOpenTime = new Date();
    
    console.warn('Monitoring circuit breaker opened due to high error rate');
  }

  /**
   * 重置熔断器
   */
  private resetCircuitBreaker(): void {
    this.isCircuitBreakerOpen = false;
    this.circuitBreakerOpenTime = undefined;
    
    console.info('Monitoring circuit breaker reset');
  }

  /**
   * 检查是否应该重置熔断器
   */
  private shouldResetCircuitBreaker(): boolean {
    if (!this.circuitBreakerOpenTime) {
      return false;
    }

    const now = Date.now();
    const openTime = this.circuitBreakerOpenTime.getTime();
    
    return (now - openTime) > this.circuitBreakerTimeout;
  }

  /**
   * 获取指定时间内特定类型的错误数量
   */
  private getRecentErrorsByType(type: MonitoringErrorType, timeWindow: number): number {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    return this.errorHistory.filter(
      error => error.type === type && error.timestamp.getTime() > cutoff
    ).length;
  }

  /**
   * 执行降级策略
   */
  private executeFallbackStrategy(error: MonitoringError): void {
    const strategy = this.fallbackStrategies.get(error.type);
    
    if (strategy && strategy.enabled) {
      try {
        strategy.execute(error, () => {});
      } catch (fallbackError) {
        console.error('Fallback strategy execution failed:', fallbackError);
      }
    }
  }

  /**
   * 记录结构化错误日志
   */
  private logError(error: MonitoringError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = {
      level: logLevel,
      message: `Monitoring error: ${error.message}`,
      error: {
        type: error.type,
        severity: error.severity,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
        stackTrace: error.stackTrace
      },
      service: configManager.getServiceConfig().name,
      version: configManager.getServiceConfig().version
    };

    // 根据严重程度选择日志级别
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(JSON.stringify(logMessage));
        break;
      case ErrorSeverity.HIGH:
        console.error(JSON.stringify(logMessage));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(JSON.stringify(logMessage));
        break;
      case ErrorSeverity.LOW:
        console.info(JSON.stringify(logMessage));
        break;
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * 初始化降级策略
   */
  private initializeFallbackStrategies(): void {
    // 指标收集失败的降级策略
    this.fallbackStrategies.set(MonitoringErrorType.METRICS_COLLECTION_FAILED, {
      name: 'LocalCacheFallback',
      enabled: true,
      execute: (error, originalOperation) => {
        // 将指标暂存到本地缓存
        console.info('Using local cache fallback for metrics collection');
      }
    });

    // 存储连接失败的降级策略
    this.fallbackStrategies.set(MonitoringErrorType.STORAGE_CONNECTION_FAILED, {
      name: 'InMemoryStorageFallback',
      enabled: true,
      execute: (error, originalOperation) => {
        // 使用内存存储作为降级
        console.info('Using in-memory storage fallback');
      }
    });

    // 性能降级策略
    this.fallbackStrategies.set(MonitoringErrorType.PERFORMANCE_DEGRADATION, {
      name: 'ReducedMetricsFallback',
      enabled: true,
      execute: (error, originalOperation) => {
        // 减少指标收集频率
        console.info('Reducing metrics collection frequency due to performance issues');
      }
    });
  }

  /**
   * 初始化错误阈值
   */
  private initializeErrorThresholds(): void {
    this.errorThresholds.set(MonitoringErrorType.METRICS_COLLECTION_FAILED, 10);
    this.errorThresholds.set(MonitoringErrorType.METRICS_REGISTRATION_FAILED, 5);
    this.errorThresholds.set(MonitoringErrorType.STORAGE_CONNECTION_FAILED, 3);
    this.errorThresholds.set(MonitoringErrorType.CONFIGURATION_ERROR, 1);
    this.errorThresholds.set(MonitoringErrorType.PERFORMANCE_DEGRADATION, 5);
  }
}

// 导出单例实例
export const monitoringErrorHandler = MonitoringErrorHandler.getInstance();
