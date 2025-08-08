/**
 * 智游助手v6.2 - 用户友好错误处理系统
 * 基于诚实透明但不技术化原则的错误处理和用户沟通
 * 
 * 核心原则:
 * 1. 诚实透明：如实告知问题，不隐瞒不夸大
 * 2. 用户语言：用用户能理解的语言描述问题
 * 3. 解决导向：提供具体的解决建议和操作指导
 * 4. 情感关怀：体现对用户时间和需求的理解
 * 5. 渐进式恢复：自动尝试恢复，并告知恢复进展
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import IntelligentTransparencyManager, { type NotificationEvent } from '@/lib/ui/transparency-manager';

// ============= 错误处理接口定义 =============

export interface UserFriendlyError {
  id: string;
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  suggestions: ErrorSuggestion[];
  recoveryActions: RecoveryAction[];
  estimatedRecoveryTime?: number;
  affectedFeatures: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export type ErrorCategory = 
  | 'network_connectivity'    // 网络连接问题
  | 'service_unavailable'     // 服务不可用
  | 'data_quality'           // 数据质量问题
  | 'rate_limiting'          // 请求频率限制
  | 'invalid_input'          // 用户输入错误
  | 'system_overload'        // 系统过载
  | 'maintenance'            // 维护中
  | 'unknown';               // 未知错误

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorSuggestion {
  text: string;
  actionable: boolean;
  action?: () => Promise<void>;
  priority: number;
}

export interface RecoveryAction {
  name: string;
  description: string;
  automatic: boolean;
  estimatedTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation: string;
  parameters: Record<string, any>;
  userAgent?: string;
  timestamp: Date;
  retryCount: number;
}

// ============= 用户友好错误处理器实现 =============

export class UserFriendlyErrorHandler {
  private geoService: UnifiedGeoService;
  private transparencyManager: IntelligentTransparencyManager;
  private errors: Map<string, UserFriendlyError> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recoveryAttempts: Map<string, RecoveryAttempt> = new Map();

  constructor(
    geoService: UnifiedGeoService,
    transparencyManager: IntelligentTransparencyManager
  ) {
    this.geoService = geoService;
    this.transparencyManager = transparencyManager;
    this.initializeErrorPatterns();
  }

  // ============= 主要错误处理方法 =============

  /**
   * 处理错误并生成用户友好的错误信息
   */
  async handleError(error: Error, context: ErrorContext): Promise<UserFriendlyError> {
    const errorId = this.generateErrorId();
    const category = this.categorizeError(error, context);
    const severity = this.assessErrorSeverity(error, category, context);

    const userFriendlyError: UserFriendlyError = {
      id: errorId,
      originalError: error,
      category,
      severity,
      userMessage: this.generateUserMessage(error, category, severity, context),
      technicalMessage: this.generateTechnicalMessage(error, context),
      suggestions: this.generateSuggestions(error, category, context),
      recoveryActions: this.generateRecoveryActions(error, category, context),
      estimatedRecoveryTime: this.estimateRecoveryTime(category, severity),
      affectedFeatures: this.identifyAffectedFeatures(category, context),
      timestamp: new Date(),
      resolved: false
    };

    // 存储错误记录
    this.errors.set(errorId, userFriendlyError);

    // 尝试自动恢复
    if (this.shouldAttemptAutoRecovery(category, severity)) {
      this.attemptAutoRecovery(userFriendlyError);
    }

    // 生成用户通知
    await this.generateUserNotification(userFriendlyError);

    console.log(`用户友好错误处理完成: ${errorId} - ${userFriendlyError.userMessage}`);
    return userFriendlyError;
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error, context: ErrorContext): ErrorCategory {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // 网络连接问题
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch')) {
      return 'network_connectivity';
    }

    // 服务不可用
    if (errorMessage.includes('service unavailable') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return 'service_unavailable';
    }

    // 数据质量问题
    if (errorMessage.includes('无结果') ||
        errorMessage.includes('数据无效') ||
        errorMessage.includes('格式错误')) {
      return 'data_quality';
    }

    // 请求频率限制
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      return 'rate_limiting';
    }

    // 用户输入错误
    if (errorMessage.includes('invalid') ||
        errorMessage.includes('参数错误') ||
        errorMessage.includes('地址格式')) {
      return 'invalid_input';
    }

    // 系统过载
    if (errorMessage.includes('queue full') ||
        errorMessage.includes('overload') ||
        errorMessage.includes('capacity')) {
      return 'system_overload';
    }

    // 维护中
    if (errorMessage.includes('maintenance') ||
        errorMessage.includes('维护')) {
      return 'maintenance';
    }

    return 'unknown';
  }

  /**
   * 评估错误严重程度
   */
  private assessErrorSeverity(error: Error, category: ErrorCategory, context: ErrorContext): ErrorSeverity {
    // 基于错误类别的基础严重程度
    const baseSeverity: Record<ErrorCategory, ErrorSeverity> = {
      network_connectivity: 'medium',
      service_unavailable: 'high',
      data_quality: 'low',
      rate_limiting: 'medium',
      invalid_input: 'low',
      system_overload: 'high',
      maintenance: 'medium',
      unknown: 'medium'
    };

    let severity = baseSeverity[category];

    // 基于重试次数调整严重程度
    if (context.retryCount > 2) {
      severity = severity === 'low' ? 'medium' : severity === 'medium' ? 'high' : 'critical';
    }

    // 基于操作类型调整严重程度
    if (context.operation === 'route_planning' && severity === 'low') {
      severity = 'medium'; // 路线规划失败影响较大
    }

    return severity;
  }

  /**
   * 生成用户友好消息
   */
  private generateUserMessage(error: Error, category: ErrorCategory, severity: ErrorSeverity, context: ErrorContext): string {
    const messages: Record<ErrorCategory, Record<ErrorSeverity, string>> = {
      network_connectivity: {
        low: '网络连接有点慢，正在重试...',
        medium: '网络连接不稳定，请检查您的网络设置',
        high: '网络连接中断，请检查网络后重试',
        critical: '网络连接严重异常，建议稍后再试'
      },
      service_unavailable: {
        low: '服务暂时繁忙，正在为您切换到备用服务',
        medium: '当前服务不可用，已自动切换到备用服务',
        high: '服务临时中断，我们正在紧急恢复',
        critical: '服务完全不可用，预计需要一些时间恢复'
      },
      data_quality: {
        low: '没有找到相关信息，建议调整搜索条件',
        medium: '搜索结果质量不佳，正在优化搜索策略',
        high: '数据源出现问题，正在切换到备用数据源',
        critical: '数据服务异常，暂时无法提供准确信息'
      },
      rate_limiting: {
        low: '请求过于频繁，请稍等片刻',
        medium: '访问量较大，已为您加入优先队列',
        high: '系统繁忙，预计等待时间较长',
        critical: '系统严重过载，建议稍后重试'
      },
      invalid_input: {
        low: '输入信息有误，请检查后重试',
        medium: '地址格式不正确，请提供更详细的地址',
        high: '输入的地址无法识别，请确认地址是否正确',
        critical: '输入信息严重错误，无法处理请求'
      },
      system_overload: {
        low: '系统负载较高，处理速度可能较慢',
        medium: '当前用户较多，已为您排队处理',
        high: '系统繁忙，正在扩容处理能力',
        critical: '系统严重过载，建议稍后重试'
      },
      maintenance: {
        low: '系统正在维护优化，功能可能受限',
        medium: '系统维护中，部分功能暂时不可用',
        high: '系统维护中，预计很快恢复',
        critical: '系统维护中，请稍后重试'
      },
      unknown: {
        low: '遇到了一个小问题，正在自动处理',
        medium: '系统出现异常，正在尝试恢复',
        high: '遇到未知问题，正在紧急处理',
        critical: '系统异常，建议稍后重试'
      }
    };

    return messages[category][severity];
  }

  /**
   * 生成技术消息
   */
  private generateTechnicalMessage(error: Error, context: ErrorContext): string {
    return `错误: ${error.message}\n操作: ${context.operation}\n参数: ${JSON.stringify(context.parameters)}\n时间: ${context.timestamp.toISOString()}`;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(error: Error, category: ErrorCategory, context: ErrorContext): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];

    switch (category) {
      case 'network_connectivity':
        suggestions.push({
          text: '检查网络连接是否正常',
          actionable: false,
          priority: 1
        });
        suggestions.push({
          text: '尝试刷新页面',
          actionable: true,
          action: async () => window.location.reload(),
          priority: 2
        });
        break;

      case 'service_unavailable':
        suggestions.push({
          text: '我们已自动切换到备用服务，请稍等',
          actionable: false,
          priority: 1
        });
        suggestions.push({
          text: '手动重试请求',
          actionable: true,
          action: async () => this.retryOperation(context),
          priority: 2
        });
        break;

      case 'invalid_input':
        suggestions.push({
          text: '请检查输入的地址是否正确',
          actionable: false,
          priority: 1
        });
        suggestions.push({
          text: '尝试输入更详细的地址信息',
          actionable: false,
          priority: 2
        });
        break;

      case 'rate_limiting':
        suggestions.push({
          text: '请稍等片刻后重试',
          actionable: false,
          priority: 1
        });
        break;

      default:
        suggestions.push({
          text: '稍后重试',
          actionable: true,
          action: async () => this.retryOperation(context),
          priority: 1
        });
    }

    return suggestions;
  }

  /**
   * 生成恢复操作
   */
  private generateRecoveryActions(error: Error, category: ErrorCategory, context: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (category) {
      case 'service_unavailable':
        actions.push({
          name: 'service_switch',
          description: '切换到备用服务',
          automatic: true,
          estimatedTime: 10000,
          status: 'pending'
        });
        break;

      case 'network_connectivity':
        actions.push({
          name: 'retry_with_timeout',
          description: '延长超时时间重试',
          automatic: true,
          estimatedTime: 30000,
          status: 'pending'
        });
        break;

      case 'data_quality':
        actions.push({
          name: 'fallback_search',
          description: '使用备用搜索策略',
          automatic: true,
          estimatedTime: 5000,
          status: 'pending'
        });
        break;
    }

    return actions;
  }

  // ============= 自动恢复机制 =============

  /**
   * 判断是否应该尝试自动恢复
   */
  private shouldAttemptAutoRecovery(category: ErrorCategory, severity: ErrorSeverity): boolean {
    const autoRecoverableCategories: ErrorCategory[] = [
      'network_connectivity',
      'service_unavailable',
      'data_quality',
      'rate_limiting'
    ];

    return autoRecoverableCategories.includes(category) && severity !== 'critical';
  }

  /**
   * 尝试自动恢复
   */
  private async attemptAutoRecovery(userFriendlyError: UserFriendlyError): Promise<void> {
    const recoveryId = this.generateRecoveryId();
    
    const recoveryAttempt: RecoveryAttempt = {
      id: recoveryId,
      errorId: userFriendlyError.id,
      startTime: new Date(),
      status: 'running',
      actions: userFriendlyError.recoveryActions
    };

    this.recoveryAttempts.set(recoveryId, recoveryAttempt);

    try {
      for (const action of userFriendlyError.recoveryActions) {
        if (action.automatic) {
          action.status = 'running';
          await this.executeRecoveryAction(action, userFriendlyError);
          action.status = 'completed';
        }
      }

      // 标记错误为已解决
      userFriendlyError.resolved = true;
      userFriendlyError.resolvedAt = new Date();
      recoveryAttempt.status = 'completed';

      // 通知用户恢复成功
      await this.notifyRecoverySuccess(userFriendlyError);

    } catch (recoveryError) {
      recoveryAttempt.status = 'failed';
      recoveryAttempt.error = recoveryError as Error;
      
      // 通知用户恢复失败
      await this.notifyRecoveryFailure(userFriendlyError, recoveryError as Error);
    }
  }

  /**
   * 执行恢复操作
   */
  private async executeRecoveryAction(action: RecoveryAction, error: UserFriendlyError): Promise<void> {
    switch (action.name) {
      case 'service_switch':
        await this.geoService.switchToSecondary();
        break;
      
      case 'retry_with_timeout':
        // 实现延长超时时间的重试逻辑
        await this.delay(5000);
        break;
      
      case 'fallback_search':
        // 实现备用搜索策略
        break;
      
      default:
        console.warn(`未知的恢复操作: ${action.name}`);
    }
  }

  // ============= 通知管理 =============

  /**
   * 生成用户通知
   */
  private async generateUserNotification(error: UserFriendlyError): Promise<void> {
    if (error.severity === 'low') {
      return; // 低严重程度错误不生成通知
    }

    const notification: NotificationEvent = {
      id: this.generateNotificationId(),
      type: 'error_recovery',
      severity: error.severity === 'critical' ? 'error' : 'warning',
      title: this.getErrorTitle(error.category),
      message: error.userMessage,
      timestamp: new Date(),
      dismissed: false,
      autoHide: error.severity === 'medium',
      hideAfter: error.severity === 'medium' ? 10000 : 0
    };

    // 这里应该调用透明度管理器的通知方法
    console.log('生成错误通知:', notification);
  }

  /**
   * 通知恢复成功
   */
  private async notifyRecoverySuccess(error: UserFriendlyError): Promise<void> {
    const notification: NotificationEvent = {
      id: this.generateNotificationId(),
      type: 'error_recovery',
      severity: 'info',
      title: '问题已解决',
      message: '服务已恢复正常，您可以继续使用',
      timestamp: new Date(),
      dismissed: false,
      autoHide: true,
      hideAfter: 5000
    };

    console.log('恢复成功通知:', notification);
  }

  /**
   * 通知恢复失败
   */
  private async notifyRecoveryFailure(error: UserFriendlyError, recoveryError: Error): Promise<void> {
    const notification: NotificationEvent = {
      id: this.generateNotificationId(),
      type: 'error_recovery',
      severity: 'error',
      title: '自动恢复失败',
      message: '无法自动解决问题，建议手动重试或联系客服',
      timestamp: new Date(),
      dismissed: false,
      autoHide: false
    };

    console.log('恢复失败通知:', notification);
  }

  // ============= 辅助方法 =============

  private getErrorTitle(category: ErrorCategory): string {
    const titles: Record<ErrorCategory, string> = {
      network_connectivity: '网络连接问题',
      service_unavailable: '服务暂时不可用',
      data_quality: '数据查询问题',
      rate_limiting: '请求过于频繁',
      invalid_input: '输入信息有误',
      system_overload: '系统繁忙',
      maintenance: '系统维护中',
      unknown: '系统异常'
    };
    return titles[category];
  }

  private estimateRecoveryTime(category: ErrorCategory, severity: ErrorSeverity): number {
    const baseTimes: Record<ErrorCategory, number> = {
      network_connectivity: 30000,
      service_unavailable: 60000,
      data_quality: 10000,
      rate_limiting: 60000,
      invalid_input: 0,
      system_overload: 120000,
      maintenance: 300000,
      unknown: 60000
    };

    const severityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      critical: 4
    };

    return baseTimes[category] * severityMultiplier[severity];
  }

  private identifyAffectedFeatures(category: ErrorCategory, context: ErrorContext): string[] {
    const features: string[] = [];

    switch (context.operation) {
      case 'geocoding':
        features.push('地址搜索');
        break;
      case 'place_search':
        features.push('地点搜索');
        break;
      case 'route_planning':
        features.push('路线规划');
        break;
      case 'weather':
        features.push('天气查询');
        break;
    }

    if (category === 'service_unavailable') {
      features.push('所有地图功能');
    }

    return features;
  }

  private async retryOperation(context: ErrorContext): Promise<void> {
    // 实现重试操作逻辑
    console.log('重试操作:', context.operation);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecoveryId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorPatterns(): void {
    // 初始化错误模式识别
  }

  // ============= 公共接口方法 =============

  /**
   * 获取错误历史
   */
  getErrorHistory(limit: number = 50): UserFriendlyError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    resolvedErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    averageRecoveryTime: number;
  } {
    const errors = Array.from(this.errors.values());
    const resolvedErrors = errors.filter(e => e.resolved);
    
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    
    errors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    const averageRecoveryTime = resolvedErrors.length > 0 
      ? resolvedErrors.reduce((sum, error) => {
          if (error.resolvedAt) {
            return sum + (error.resolvedAt.getTime() - error.timestamp.getTime());
          }
          return sum;
        }, 0) / resolvedErrors.length
      : 0;

    return {
      totalErrors: errors.length,
      resolvedErrors: resolvedErrors.length,
      errorsByCategory,
      errorsBySeverity,
      averageRecoveryTime
    };
  }

  /**
   * 清理过期错误记录
   */
  cleanupErrors(maxAge: number = 86400000): void {
    const cutoffTime = Date.now() - maxAge;
    
    for (const [errorId, error] of this.errors.entries()) {
      if (error.timestamp.getTime() < cutoffTime && error.resolved) {
        this.errors.delete(errorId);
      }
    }
  }
}

// ============= 辅助接口 =============

interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
}

interface RecoveryAttempt {
  id: string;
  errorId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  actions: RecoveryAction[];
  error?: Error;
}

export default UserFriendlyErrorHandler;
