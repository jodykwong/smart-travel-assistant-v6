/**
 * 智游助手v6.2 - LangGraph错误处理中间件
 * 遵循原则: [纵深防御] + [DRY原则] + [为失败而设计]
 * 
 * 核心功能:
 * 1. 统一Phase 1和Phase 2的错误处理策略
 * 2. 自动恢复机制
 * 3. 错误分类和路由
 * 4. 性能监控和指标收集
 */

import { SmartTravelState, ProcessingError } from './smart-travel-state';
import { addError, incrementRecoveryAttempts, updatePlanningState } from './type-safe-state';
import UserFriendlyErrorHandler from '@/lib/error/user-friendly-error-handler';

// ============= 错误处理接口定义 =============

export interface NodeExecutionContext {
  nodeName: string;
  state: SmartTravelState;
  startTime: number;
  retryCount: number;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context: NodeExecutionContext) => boolean;
  recover: (error: Error, context: NodeExecutionContext) => Promise<Partial<SmartTravelState>>;
  maxAttempts: number;
  estimatedTime: number;
}

export interface ErrorMetrics {
  nodeName: string;
  executionTime: number;
  success: boolean;
  errorType?: string;
  recoveryAttempted: boolean;
  recoverySuccessful?: boolean;
  timestamp: number;
}

// ============= LangGraph错误处理中间件实现 =============

export class LangGraphErrorMiddleware {
  private errorHandler: UserFriendlyErrorHandler;
  private recoveryStrategies: Map<string, RecoveryStrategy>;
  private metrics: ErrorMetrics[] = [];

  constructor(errorHandler: UserFriendlyErrorHandler) {
    this.errorHandler = errorHandler;
    this.recoveryStrategies = new Map();
    this.initializeRecoveryStrategies();
  }

  // ============= 核心中间件方法 =============

  /**
   * 包装节点执行，提供统一错误处理
   * 遵循原则: [纵深防御] + [为失败而设计]
   */
  wrapNodeExecution<T>(
    nodeName: string,
    nodeFunction: (state: SmartTravelState) => Promise<Partial<SmartTravelState>>
  ): (state: SmartTravelState) => Promise<Partial<SmartTravelState>> {
    
    return async (state: SmartTravelState): Promise<Partial<SmartTravelState>> => {
      const context: NodeExecutionContext = {
        nodeName,
        state,
        startTime: Date.now(),
        retryCount: 0
      };

      try {
        // 执行节点函数
        const result = await this.executeWithTimeout(nodeFunction, state, 30000); // 30秒超时
        
        // 记录成功执行指标
        this.recordMetrics({
          nodeName,
          executionTime: Date.now() - context.startTime,
          success: true,
          recoveryAttempted: false,
          timestamp: Date.now()
        });

        return result;

      } catch (error) {
        return await this.handleNodeError(error as Error, context);
      }
    };
  }

  /**
   * 处理节点错误
   */
  private async handleNodeError(
    error: Error,
    context: NodeExecutionContext
  ): Promise<Partial<SmartTravelState>> {
    
    console.error(`节点 ${context.nodeName} 执行失败:`, error);

    // 创建错误上下文
    const errorContext = {
      operation: context.nodeName,
      parameters: { nodeName: context.nodeName },
      timestamp: new Date(),
      retryCount: context.retryCount
    };

    // 使用Phase 1错误处理器处理错误
    const handledError = await this.errorHandler.handleError(error, errorContext);

    // 创建处理错误对象
    const processingError: ProcessingError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      node: context.nodeName,
      type: this.categorizeError(error),
      message: error.message,
      timestamp: new Date(),
      severity: this.assessErrorSeverity(error, context),
      recoverable: this.isRecoverable(error, context)
    };

    // 尝试自动恢复
    if (processingError.recoverable && context.state.monitoring.recoveryAttempts < 3) {
      const recoveryResult = await this.attemptRecovery(error, context);
      
      if (recoveryResult.success) {
        // 恢复成功
        this.recordMetrics({
          nodeName: context.nodeName,
          executionTime: Date.now() - context.startTime,
          success: true,
          recoveryAttempted: true,
          recoverySuccessful: true,
          timestamp: Date.now()
        });

        return {
          ...recoveryResult.state,
          monitoring: {
            ...context.state.monitoring,
            recoveryAttempts: context.state.monitoring.recoveryAttempts + 1
          }
        };
      }
    }

    // 恢复失败或不可恢复，记录错误
    this.recordMetrics({
      nodeName: context.nodeName,
      executionTime: Date.now() - context.startTime,
      success: false,
      errorType: processingError.type,
      recoveryAttempted: processingError.recoverable,
      recoverySuccessful: false,
      timestamp: Date.now()
    });

    // 更新状态为失败，并添加错误信息
    const updatedState = addError(context.state, processingError);
    return updatePlanningState(updatedState, { status: 'failed' });
  }

  // ============= 恢复策略实现 =============

  /**
   * 尝试自动恢复
   */
  private async attemptRecovery(
    error: Error,
    context: NodeExecutionContext
  ): Promise<{ success: boolean; state?: Partial<SmartTravelState> }> {
    
    const strategy = this.selectRecoveryStrategy(error, context);
    
    if (!strategy) {
      return { success: false };
    }

    try {
      console.log(`尝试使用策略 ${strategy.name} 恢复节点 ${context.nodeName}`);
      
      const recoveredState = await strategy.recover(error, context);
      
      console.log(`恢复策略 ${strategy.name} 执行成功`);
      return { success: true, state: recoveredState };
      
    } catch (recoveryError) {
      console.error(`恢复策略 ${strategy.name} 执行失败:`, recoveryError);
      return { success: false };
    }
  }

  /**
   * 选择恢复策略
   */
  private selectRecoveryStrategy(
    error: Error,
    context: NodeExecutionContext
  ): RecoveryStrategy | undefined {
    
    for (const [name, strategy] of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        return strategy;
      }
    }
    
    return undefined;
  }

  /**
   * 初始化恢复策略
   */
  private initializeRecoveryStrategies(): void {
    // 网络错误恢复策略
    this.recoveryStrategies.set('network_retry', {
      name: 'network_retry',
      canRecover: (error, context) => {
        return error.message.includes('network') || 
               error.message.includes('timeout') ||
               error.message.includes('fetch');
      },
      recover: async (error, context) => {
        // 等待一段时间后重试
        await this.delay(2000);
        return {
          planning: {
            ...context.state.planning,
            status: 'analyzing' // 重新开始分析
          }
        };
      },
      maxAttempts: 3,
      estimatedTime: 5000
    });

    // 服务质量降级策略
    this.recoveryStrategies.set('quality_degradation', {
      name: 'quality_degradation',
      canRecover: (error, context) => {
        return error.message.includes('quality') || 
               error.message.includes('service');
      },
      recover: async (error, context) => {
        return {
          analysis: {
            ...context.state.analysis,
            strategy: 'fallback_mode' // 切换到降级模式
          }
        };
      },
      maxAttempts: 2,
      estimatedTime: 3000
    });

    // 数据收集失败恢复策略
    this.recoveryStrategies.set('data_collection_fallback', {
      name: 'data_collection_fallback',
      canRecover: (error, context) => {
        return context.nodeName.includes('gather') || 
               context.nodeName.includes('collect');
      },
      recover: async (error, context) => {
        return {
          execution: {
            ...context.state.execution,
            dataCollection: {
              status: 'partial', // 部分数据收集
              fallbackUsed: true
            }
          }
        };
      },
      maxAttempts: 2,
      estimatedTime: 8000
    });
  }

  // ============= 辅助方法 =============

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    fn: (state: SmartTravelState) => Promise<T>,
    state: SmartTravelState,
    timeoutMs: number
  ): Promise<T> {
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`节点执行超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      fn(state)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'network_error';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    } else if (message.includes('service') || message.includes('api')) {
      return 'service_error';
    } else if (message.includes('data') || message.includes('format')) {
      return 'data_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * 评估错误严重程度
   */
  private assessErrorSeverity(error: Error, context: NodeExecutionContext): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    // 关键节点的错误更严重
    const criticalNodes = ['create_travel_plan', 'validate_plan_quality'];
    if (criticalNodes.includes(context.nodeName)) {
      return 'high';
    }
    
    // 网络错误通常是中等严重程度
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }
    
    // 验证错误通常是低严重程度
    if (message.includes('validation')) {
      return 'low';
    }
    
    // 系统错误是高严重程度
    if (message.includes('system') || message.includes('critical')) {
      return 'critical';
    }
    
    return 'medium';
  }

  /**
   * 判断错误是否可恢复
   */
  private isRecoverable(error: Error, context: NodeExecutionContext): boolean {
    const message = error.message.toLowerCase();
    
    // 网络错误通常可恢复
    if (message.includes('network') || message.includes('timeout')) {
      return true;
    }
    
    // 服务错误可能可恢复
    if (message.includes('service') || message.includes('api')) {
      return true;
    }
    
    // 验证错误通常不可恢复（需要修改输入）
    if (message.includes('validation') || message.includes('invalid')) {
      return false;
    }
    
    // 系统错误通常不可恢复
    if (message.includes('system') || message.includes('critical')) {
      return false;
    }
    
    return true;
  }

  /**
   * 记录指标
   */
  private recordMetrics(metrics: ErrorMetrics): void {
    this.metrics.push(metrics);
    
    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============= 公共接口方法 =============

  /**
   * 获取错误指标
   */
  getErrorMetrics(nodeName?: string): ErrorMetrics[] {
    if (nodeName) {
      return this.metrics.filter(m => m.nodeName === nodeName);
    }
    return [...this.metrics];
  }

  /**
   * 获取成功率统计
   */
  getSuccessRate(nodeName?: string): number {
    const relevantMetrics = this.getErrorMetrics(nodeName);
    if (relevantMetrics.length === 0) return 1.0;
    
    const successCount = relevantMetrics.filter(m => m.success).length;
    return successCount / relevantMetrics.length;
  }

  /**
   * 获取平均执行时间
   */
  getAverageExecutionTime(nodeName?: string): number {
    const relevantMetrics = this.getErrorMetrics(nodeName);
    if (relevantMetrics.length === 0) return 0;
    
    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return totalTime / relevantMetrics.length;
  }

  /**
   * 清理旧指标
   */
  cleanupMetrics(maxAge: number = 86400000): void { // 默认24小时
    const cutoffTime = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }
}

export default LangGraphErrorMiddleware;
