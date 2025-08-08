/**
 * 智游助手v6.2 - LangGraph指标收集器
 * 遵循原则: [可观测性] + [数据驱动决策] + [实时监控]
 * 
 * 核心功能:
 * 1. LangGraph节点执行指标收集
 * 2. 状态转换性能追踪
 * 3. 错误恢复成功率监控
 * 4. 实时性能数据聚合
 */

// ============= 指标接口定义 =============

export interface NodeExecutionMetrics {
  nodeId: string;
  nodeName: string;
  executionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  inputSize: number;
  outputSize: number;
  memoryUsage: number;
  cpuUsage?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

export interface StateTransitionMetrics {
  transitionId: string;
  fromState: string;
  toState: string;
  timestamp: number;
  duration: number;
  success: boolean;
  dataSize: number;
  validationTime: number;
  serializationTime: number;
}

export interface WorkflowExecutionMetrics {
  workflowId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalDataProcessed: number;
  averageNodeDuration: number;
  criticalPath: string[];
}

export interface ErrorRecoveryMetrics {
  errorId: string;
  nodeId: string;
  errorType: string;
  recoveryStrategy: string;
  recoveryAttempts: number;
  recoverySuccess: boolean;
  recoveryDuration: number;
  timestamp: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAggregates {
  timeWindow: string;
  totalExecutions: number;
  successRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
  concurrentExecutions: number;
  memoryUtilization: number;
}

// ============= LangGraph指标收集器实现 =============

export class LangGraphMetricsCollector {
  private nodeMetrics: Map<string, NodeExecutionMetrics[]> = new Map();
  private stateTransitions: StateTransitionMetrics[] = [];
  private workflowMetrics: Map<string, WorkflowExecutionMetrics> = new Map();
  private errorRecoveryMetrics: ErrorRecoveryMetrics[] = [];
  private activeExecutions: Map<string, { startTime: number; nodeId: string }> = new Map();
  private metricsBuffer: any[] = [];
  private bufferFlushInterval: NodeJS.Timeout;

  constructor(private bufferSize: number = 1000, private flushIntervalMs: number = 30000) {
    this.startMetricsBuffering();
    console.log('LangGraph指标收集器初始化完成');
  }

  // ============= 节点执行指标收集 =============

  /**
   * 开始节点执行追踪
   * 遵循原则: [可观测性] - 全面追踪执行过程
   */
  startNodeExecution(nodeId: string, nodeName: string, executionId: string, inputData?: any): void {
    const startTime = Date.now();
    
    this.activeExecutions.set(executionId, { startTime, nodeId });
    
    console.log(`📊 开始追踪节点执行: ${nodeName} (${executionId})`);
  }

  /**
   * 结束节点执行追踪
   */
  endNodeExecution(
    executionId: string, 
    status: 'success' | 'error' | 'timeout' | 'cancelled',
    outputData?: any,
    error?: any
  ): NodeExecutionMetrics | null {
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      console.warn(`未找到执行记录: ${executionId}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - execution.startTime;
    
    const metrics: NodeExecutionMetrics = {
      nodeId: execution.nodeId,
      nodeName: this.getNodeName(execution.nodeId),
      executionId,
      startTime: execution.startTime,
      endTime,
      duration,
      status,
      inputSize: this.calculateDataSize(null), // 输入数据大小
      outputSize: this.calculateDataSize(outputData),
      memoryUsage: this.getCurrentMemoryUsage(),
      error: error ? {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    // 存储指标
    this.storeNodeMetrics(metrics);
    this.activeExecutions.delete(executionId);
    
    console.log(`📊 节点执行完成: ${metrics.nodeName}, 耗时: ${duration}ms, 状态: ${status}`);
    return metrics;
  }

  /**
   * 记录状态转换指标
   */
  recordStateTransition(
    fromState: string,
    toState: string,
    transitionData: any,
    validationTime: number = 0,
    serializationTime: number = 0
  ): StateTransitionMetrics {
    
    const startTime = Date.now();
    
    const metrics: StateTransitionMetrics = {
      transitionId: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromState,
      toState,
      timestamp: startTime,
      duration: validationTime + serializationTime,
      success: true,
      dataSize: this.calculateDataSize(transitionData),
      validationTime,
      serializationTime
    };

    this.stateTransitions.push(metrics);
    this.addToBuffer('state_transition', metrics);
    
    console.log(`🔄 状态转换: ${fromState} → ${toState}, 耗时: ${metrics.duration}ms`);
    return metrics;
  }

  /**
   * 记录错误恢复指标
   */
  recordErrorRecovery(
    nodeId: string,
    errorType: string,
    recoveryStrategy: string,
    attempts: number,
    success: boolean,
    duration: number,
    impactLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): ErrorRecoveryMetrics {
    
    const metrics: ErrorRecoveryMetrics = {
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      errorType,
      recoveryStrategy,
      recoveryAttempts: attempts,
      recoverySuccess: success,
      recoveryDuration: duration,
      timestamp: Date.now(),
      impactLevel
    };

    this.errorRecoveryMetrics.push(metrics);
    this.addToBuffer('error_recovery', metrics);
    
    console.log(`🛡️ 错误恢复记录: ${errorType}, 策略: ${recoveryStrategy}, 成功: ${success}`);
    return metrics;
  }

  // ============= 工作流指标管理 =============

  /**
   * 开始工作流执行追踪
   */
  startWorkflowExecution(workflowId: string, sessionId: string): void {
    const metrics: WorkflowExecutionMetrics = {
      workflowId,
      sessionId,
      startTime: Date.now(),
      nodeCount: 0,
      completedNodes: 0,
      failedNodes: 0,
      status: 'running',
      totalDataProcessed: 0,
      averageNodeDuration: 0,
      criticalPath: []
    };

    this.workflowMetrics.set(workflowId, metrics);
    console.log(`🚀 开始工作流追踪: ${workflowId}`);
  }

  /**
   * 更新工作流执行状态
   */
  updateWorkflowExecution(
    workflowId: string, 
    updates: Partial<WorkflowExecutionMetrics>
  ): void {
    
    const metrics = this.workflowMetrics.get(workflowId);
    if (!metrics) {
      console.warn(`未找到工作流: ${workflowId}`);
      return;
    }

    Object.assign(metrics, updates);
    
    if (updates.status && updates.status !== 'running') {
      metrics.endTime = Date.now();
      metrics.totalDuration = metrics.endTime - metrics.startTime;
      
      // 计算平均节点执行时间
      if (metrics.completedNodes > 0) {
        const nodeMetrics = this.getNodeMetricsForWorkflow(workflowId);
        const totalNodeDuration = nodeMetrics.reduce((sum, m) => sum + m.duration, 0);
        metrics.averageNodeDuration = totalNodeDuration / nodeMetrics.length;
      }
    }

    console.log(`📈 工作流更新: ${workflowId}, 状态: ${metrics.status}`);
  }

  // ============= 性能聚合和分析 =============

  /**
   * 获取性能聚合数据
   * 遵循原则: [数据驱动决策] - 提供决策所需的聚合指标
   */
  getPerformanceAggregates(timeWindowMinutes: number = 60): PerformanceAggregates {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    
    // 获取时间窗口内的节点指标
    const recentNodeMetrics = this.getAllNodeMetrics()
      .filter(m => m.startTime >= cutoffTime);
    
    const totalExecutions = recentNodeMetrics.length;
    const successfulExecutions = recentNodeMetrics.filter(m => m.status === 'success').length;
    const failedExecutions = recentNodeMetrics.filter(m => m.status === 'error').length;
    
    const responseTimes = recentNodeMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    
    return {
      timeWindow: `${timeWindowMinutes}分钟`,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      errorRate: totalExecutions > 0 ? failedExecutions / totalExecutions : 0,
      throughput: totalExecutions / (timeWindowMinutes / 60), // 每小时执行次数
      concurrentExecutions: this.activeExecutions.size,
      memoryUtilization: this.getCurrentMemoryUsage()
    };
  }

  /**
   * 获取节点性能排行
   */
  getNodePerformanceRanking(limit: number = 10): Array<{
    nodeName: string;
    averageDuration: number;
    executionCount: number;
    successRate: number;
    errorCount: number;
  }> {
    
    const nodeStats = new Map<string, {
      durations: number[];
      successes: number;
      errors: number;
    }>();

    // 聚合节点统计
    this.getAllNodeMetrics().forEach(metrics => {
      const stats = nodeStats.get(metrics.nodeName) || {
        durations: [],
        successes: 0,
        errors: 0
      };

      stats.durations.push(metrics.duration);
      if (metrics.status === 'success') {
        stats.successes++;
      } else {
        stats.errors++;
      }

      nodeStats.set(metrics.nodeName, stats);
    });

    // 计算排行
    return Array.from(nodeStats.entries())
      .map(([nodeName, stats]) => ({
        nodeName,
        averageDuration: stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length,
        executionCount: stats.durations.length,
        successRate: stats.successes / (stats.successes + stats.errors),
        errorCount: stats.errors
      }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, limit);
  }

  // ============= 辅助方法 =============

  private storeNodeMetrics(metrics: NodeExecutionMetrics): void {
    const nodeMetrics = this.nodeMetrics.get(metrics.nodeId) || [];
    nodeMetrics.push(metrics);
    
    // 保持最近1000条记录
    if (nodeMetrics.length > 1000) {
      nodeMetrics.splice(0, nodeMetrics.length - 1000);
    }
    
    this.nodeMetrics.set(metrics.nodeId, nodeMetrics);
    this.addToBuffer('node_execution', metrics);
  }

  private addToBuffer(type: string, data: any): void {
    this.metricsBuffer.push({
      type,
      timestamp: Date.now(),
      data
    });

    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetricsBuffer();
    }
  }

  private startMetricsBuffering(): void {
    this.bufferFlushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, this.flushIntervalMs);
  }

  private flushMetricsBuffer(): void {
    if (this.metricsBuffer.length === 0) return;

    console.log(`📤 刷新指标缓冲区: ${this.metricsBuffer.length} 条记录`);
    
    // 这里可以发送到外部监控系统
    // 例如: Prometheus, InfluxDB, CloudWatch等
    
    this.metricsBuffer = [];
  }

  private calculateDataSize(data: any): number {
    if (!data) return 0;
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private getNodeName(nodeId: string): string {
    // 从nodeId提取可读的节点名称
    return nodeId.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  }

  private getAllNodeMetrics(): NodeExecutionMetrics[] {
    const allMetrics: NodeExecutionMetrics[] = [];
    for (const metrics of this.nodeMetrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  private getNodeMetricsForWorkflow(workflowId: string): NodeExecutionMetrics[] {
    // 这里需要根据实际的关联逻辑来实现
    return this.getAllNodeMetrics().filter(m => 
      m.executionId.includes(workflowId)
    );
  }

  // ============= 公共接口方法 =============

  /**
   * 获取实时指标摘要
   */
  getRealTimeMetrics() {
    return {
      activeExecutions: this.activeExecutions.size,
      totalNodeExecutions: this.getAllNodeMetrics().length,
      totalStateTransitions: this.stateTransitions.length,
      totalErrorRecoveries: this.errorRecoveryMetrics.length,
      activeWorkflows: this.workflowMetrics.size,
      bufferSize: this.metricsBuffer.length
    };
  }

  /**
   * 获取错误恢复统计
   */
  getErrorRecoveryStats() {
    const total = this.errorRecoveryMetrics.length;
    const successful = this.errorRecoveryMetrics.filter(m => m.recoverySuccess).length;
    
    return {
      totalRecoveries: total,
      successfulRecoveries: successful,
      recoverySuccessRate: total > 0 ? successful / total : 0,
      averageRecoveryTime: total > 0 
        ? this.errorRecoveryMetrics.reduce((sum, m) => sum + m.recoveryDuration, 0) / total 
        : 0
    };
  }

  /**
   * 清理旧数据
   */
  cleanupOldData(maxAgeHours: number = 24): void {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    // 清理节点指标
    for (const [nodeId, metrics] of this.nodeMetrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.startTime >= cutoffTime);
      if (filteredMetrics.length === 0) {
        this.nodeMetrics.delete(nodeId);
      } else {
        this.nodeMetrics.set(nodeId, filteredMetrics);
      }
    }

    // 清理状态转换
    this.stateTransitions = this.stateTransitions.filter(t => t.timestamp >= cutoffTime);
    
    // 清理错误恢复记录
    this.errorRecoveryMetrics = this.errorRecoveryMetrics.filter(e => e.timestamp >= cutoffTime);
    
    console.log(`🧹 清理了 ${maxAgeHours} 小时前的旧数据`);
  }

  /**
   * 销毁收集器
   */
  destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    
    this.flushMetricsBuffer();
    this.nodeMetrics.clear();
    this.stateTransitions = [];
    this.workflowMetrics.clear();
    this.errorRecoveryMetrics = [];
    this.activeExecutions.clear();
    
    console.log('LangGraph指标收集器已销毁');
  }
}

export default LangGraphMetricsCollector;
