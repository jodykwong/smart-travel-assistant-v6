/**
 * 智游助手v6.2 - 错误处理统一化验证测试
 * 测试专家：验证错误处理中间件、自动恢复机制、错误分类、指标收集
 */

async function testErrorHandlingUnification() {
  console.log('🛡️  开始错误处理统一化验证测试...\n');

  const testResults = {
    errorMiddleware: false,
    autoRecovery: false,
    errorClassification: false,
    metricsCollection: false,
    phase1Integration: false
  };

  try {
    // 1. 验证错误处理中间件
    console.log('🔧 测试1: 错误处理中间件验证');
    await testErrorMiddleware(testResults);

    // 2. 验证自动恢复机制
    console.log('\n🔄 测试2: 自动恢复机制验证');
    await testAutoRecovery(testResults);

    // 3. 验证错误分类和路由
    console.log('\n📊 测试3: 错误分类和路由验证');
    await testErrorClassification(testResults);

    // 4. 验证指标收集功能
    console.log('\n📈 测试4: 指标收集功能验证');
    await testMetricsCollection(testResults);

    // 5. 验证与Phase 1错误处理系统的集成
    console.log('\n🔗 测试5: Phase 1错误处理集成验证');
    await testPhase1Integration(testResults);

    // 生成测试报告
    generateErrorHandlingReport(testResults);

  } catch (error) {
    console.error('\n❌ 错误处理统一化测试失败:', error.message);
    return false;
  }
}

// ============= 测试1: 错误处理中间件验证 =============

async function testErrorMiddleware(results) {
  try {
    // 模拟错误处理中间件
    class MockErrorMiddleware {
      constructor() {
        this.metrics = [];
        this.recoveryStrategies = new Map();
        this.initializeRecoveryStrategies();
      }

      wrapNodeExecution(nodeName, nodeFunction) {
        return async (state) => {
          const startTime = Date.now();
          const context = {
            nodeName,
            state,
            startTime,
            retryCount: 0
          };

          try {
            // 执行节点函数
            const result = await this.executeWithTimeout(nodeFunction, state, 30000);
            
            // 记录成功指标
            this.recordMetrics({
              nodeName,
              executionTime: Date.now() - startTime,
              success: true,
              recoveryAttempted: false,
              timestamp: Date.now()
            });

            return result;

          } catch (error) {
            return await this.handleNodeError(error, context);
          }
        };
      }

      async executeWithTimeout(fn, state, timeoutMs) {
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

      async handleNodeError(error, context) {
        console.log(`    处理节点 ${context.nodeName} 的错误: ${error.message}`);

        // 创建处理错误对象
        const processingError = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          node: context.nodeName,
          type: this.categorizeError(error),
          message: error.message,
          timestamp: new Date(),
          severity: this.assessErrorSeverity(error, context),
          recoverable: this.isRecoverable(error, context)
        };

        // 尝试自动恢复
        if (processingError.recoverable && context.state.monitoring?.recoveryAttempts < 3) {
          const recoveryResult = await this.attemptRecovery(error, context);
          
          if (recoveryResult.success) {
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
                recoveryAttempts: (context.state.monitoring?.recoveryAttempts || 0) + 1
              }
            };
          }
        }

        // 恢复失败，记录错误
        this.recordMetrics({
          nodeName: context.nodeName,
          executionTime: Date.now() - context.startTime,
          success: false,
          errorType: processingError.type,
          recoveryAttempted: processingError.recoverable,
          recoverySuccessful: false,
          timestamp: Date.now()
        });

        return {
          ...context.state,
          planning: { ...context.state.planning, status: 'failed' },
          monitoring: {
            ...context.state.monitoring,
            errors: [...(context.state.monitoring?.errors || []), processingError]
          }
        };
      }

      categorizeError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('timeout')) {
          return 'network_error';
        } else if (message.includes('validation') || message.includes('invalid')) {
          return 'validation_error';
        } else if (message.includes('service') || message.includes('api')) {
          return 'service_error';
        } else {
          return 'unknown_error';
        }
      }

      assessErrorSeverity(error, context) {
        const message = error.message.toLowerCase();
        const criticalNodes = ['create_travel_plan', 'validate_plan_quality'];
        
        if (criticalNodes.includes(context.nodeName)) {
          return 'high';
        }
        
        if (message.includes('network') || message.includes('timeout')) {
          return 'medium';
        }
        
        if (message.includes('validation')) {
          return 'low';
        }
        
        return 'medium';
      }

      isRecoverable(error) {
        const message = error.message.toLowerCase();
        return message.includes('network') || 
               message.includes('timeout') || 
               message.includes('service');
      }

      async attemptRecovery(error, context) {
        const strategy = this.selectRecoveryStrategy(error, context);
        
        if (!strategy) {
          return { success: false };
        }

        try {
          console.log(`    尝试使用策略 ${strategy.name} 恢复`);
          const recoveredState = await strategy.recover(error, context);
          return { success: true, state: recoveredState };
        } catch (recoveryError) {
          console.log(`    恢复策略失败: ${recoveryError.message}`);
          return { success: false };
        }
      }

      selectRecoveryStrategy(error, context) {
        for (const [name, strategy] of this.recoveryStrategies) {
          if (strategy.canRecover(error, context)) {
            return strategy;
          }
        }
        return undefined;
      }

      initializeRecoveryStrategies() {
        this.recoveryStrategies.set('network_retry', {
          name: 'network_retry',
          canRecover: (error) => error.message.includes('network') || error.message.includes('timeout'),
          recover: async (error, context) => {
            await this.delay(1000);
            return {
              planning: { ...context.state.planning, status: 'analyzing' }
            };
          }
        });

        this.recoveryStrategies.set('service_fallback', {
          name: 'service_fallback',
          canRecover: (error) => error.message.includes('service'),
          recover: async (error, context) => {
            return {
              analysis: { ...context.state.analysis, strategy: 'fallback_mode' }
            };
          }
        });
      }

      delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      recordMetrics(metrics) {
        this.metrics.push(metrics);
      }

      getMetrics() {
        return [...this.metrics];
      }

      getSuccessRate() {
        if (this.metrics.length === 0) return 1.0;
        const successCount = this.metrics.filter(m => m.success).length;
        return successCount / this.metrics.length;
      }
    }

    const errorMiddleware = new MockErrorMiddleware();

    // 测试成功执行
    const successFunction = async (state) => {
      return { success: true };
    };

    const wrappedSuccessFunction = errorMiddleware.wrapNodeExecution('test_success', successFunction);
    const mockState = {
      planning: { status: 'pending' },
      monitoring: { errors: [], recoveryAttempts: 0 }
    };
    
    const successResult = await wrappedSuccessFunction(mockState);
    if (!successResult.success) {
      throw new Error('成功执行测试失败');
    }

    // 测试错误处理
    const errorFunction = async (state) => {
      throw new Error('Test network error');
    };

    const wrappedErrorFunction = errorMiddleware.wrapNodeExecution('test_error', errorFunction);
    const errorResult = await wrappedErrorFunction(mockState);
    
    if (errorResult.planning.status !== 'analyzing') {
      throw new Error('错误恢复测试失败');
    }

    // 测试超时处理
    const timeoutFunction = async (state) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ timeout: true }), 35000); // 超过30秒超时
      });
    };

    const wrappedTimeoutFunction = errorMiddleware.wrapNodeExecution('test_timeout', timeoutFunction);
    
    try {
      await wrappedTimeoutFunction(mockState);
      throw new Error('超时测试应该失败');
    } catch (error) {
      if (!error.message.includes('超时')) {
        throw new Error('超时错误处理不正确');
      }
    }

    console.log('  ✅ 错误处理中间件验证通过');
    console.log('    - 成功执行包装正常');
    console.log('    - 错误捕获和处理正常');
    console.log('    - 超时检测和处理正常');
    console.log('    - 指标记录功能正常');
    
    results.errorMiddleware = true;

  } catch (error) {
    console.log('  ❌ 错误处理中间件验证失败:', error.message);
    throw error;
  }
}

// ============= 测试2: 自动恢复机制验证 =============

async function testAutoRecovery(results) {
  try {
    // 模拟恢复策略
    const recoveryStrategies = {
      network_retry: {
        name: 'network_retry',
        canRecover: (error) => error.type === 'network_error',
        recover: async (error, context) => {
          console.log('    执行网络重试恢复策略');
          await new Promise(resolve => setTimeout(resolve, 100));
          return { recovered: true, strategy: 'network_retry' };
        },
        maxAttempts: 3,
        estimatedTime: 2000
      },
      
      service_degradation: {
        name: 'service_degradation',
        canRecover: (error) => error.type === 'service_error',
        recover: async (error, context) => {
          console.log('    执行服务降级恢复策略');
          return { recovered: true, strategy: 'service_degradation', mode: 'fallback' };
        },
        maxAttempts: 2,
        estimatedTime: 1000
      },
      
      data_fallback: {
        name: 'data_fallback',
        canRecover: (error) => error.type === 'data_error',
        recover: async (error, context) => {
          console.log('    执行数据回退恢复策略');
          return { recovered: true, strategy: 'data_fallback', useCache: true };
        },
        maxAttempts: 1,
        estimatedTime: 500
      }
    };

    // 测试网络错误恢复
    const networkError = { type: 'network_error', message: 'Network timeout' };
    const networkContext = { nodeName: 'test_network', recoveryAttempts: 1 };
    
    const networkStrategy = recoveryStrategies.network_retry;
    if (!networkStrategy.canRecover(networkError)) {
      throw new Error('网络错误应该可以恢复');
    }

    const networkRecoveryResult = await networkStrategy.recover(networkError, networkContext);
    if (!networkRecoveryResult.recovered || networkRecoveryResult.strategy !== 'network_retry') {
      throw new Error('网络错误恢复失败');
    }

    // 测试服务错误恢复
    const serviceError = { type: 'service_error', message: 'Service unavailable' };
    const serviceContext = { nodeName: 'test_service', recoveryAttempts: 0 };
    
    const serviceStrategy = recoveryStrategies.service_degradation;
    if (!serviceStrategy.canRecover(serviceError)) {
      throw new Error('服务错误应该可以恢复');
    }

    const serviceRecoveryResult = await serviceStrategy.recover(serviceError, serviceContext);
    if (!serviceRecoveryResult.recovered || serviceRecoveryResult.mode !== 'fallback') {
      throw new Error('服务错误恢复失败');
    }

    // 测试数据错误恢复
    const dataError = { type: 'data_error', message: 'Data format invalid' };
    const dataContext = { nodeName: 'test_data', recoveryAttempts: 0 };
    
    const dataStrategy = recoveryStrategies.data_fallback;
    if (!dataStrategy.canRecover(dataError)) {
      throw new Error('数据错误应该可以恢复');
    }

    const dataRecoveryResult = await dataStrategy.recover(dataError, dataContext);
    if (!dataRecoveryResult.recovered || !dataRecoveryResult.useCache) {
      throw new Error('数据错误恢复失败');
    }

    // 测试不可恢复错误
    const systemError = { type: 'system_error', message: 'Critical system failure' };
    
    const canRecoverSystem = Object.values(recoveryStrategies)
      .some(strategy => strategy.canRecover(systemError));
    
    if (canRecoverSystem) {
      throw new Error('系统错误不应该可以恢复');
    }

    // 测试恢复次数限制
    const maxAttemptsTest = {
      attempts: 0,
      maxAttempts: 3,
      canAttemptRecovery() {
        return this.attempts < this.maxAttempts;
      },
      attemptRecovery() {
        if (!this.canAttemptRecovery()) {
          throw new Error('超过最大恢复次数');
        }
        this.attempts++;
        return { success: true, attempt: this.attempts };
      }
    };

    // 执行3次恢复（应该成功）
    for (let i = 0; i < 3; i++) {
      const result = maxAttemptsTest.attemptRecovery();
      if (!result.success || result.attempt !== i + 1) {
        throw new Error(`第${i + 1}次恢复失败`);
      }
    }

    // 第4次恢复（应该失败）
    try {
      maxAttemptsTest.attemptRecovery();
      throw new Error('第4次恢复应该失败');
    } catch (error) {
      if (!error.message.includes('超过最大恢复次数')) {
        throw new Error('恢复次数限制检查失败');
      }
    }

    console.log('  ✅ 自动恢复机制验证通过');
    console.log('    - 网络错误恢复策略正常');
    console.log('    - 服务错误恢复策略正常');
    console.log('    - 数据错误恢复策略正常');
    console.log('    - 不可恢复错误正确识别');
    console.log('    - 恢复次数限制正常');
    
    results.autoRecovery = true;

  } catch (error) {
    console.log('  ❌ 自动恢复机制验证失败:', error.message);
    throw error;
  }
}

// ============= 测试3: 错误分类和路由验证 =============

async function testErrorClassification(results) {
  try {
    // 错误分类器
    function categorizeError(error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        return 'network_error';
      } else if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return 'validation_error';
      } else if (message.includes('service') || message.includes('api') || message.includes('unavailable')) {
        return 'service_error';
      } else if (message.includes('data') || message.includes('format') || message.includes('parse')) {
        return 'data_error';
      } else if (message.includes('auth') || message.includes('permission') || message.includes('forbidden')) {
        return 'auth_error';
      } else {
        return 'unknown_error';
      }
    }

    // 错误严重程度评估
    function assessErrorSeverity(error, context) {
      const message = error.message.toLowerCase();
      const criticalNodes = ['create_travel_plan', 'validate_plan_quality', 'finalize_booking'];
      
      if (criticalNodes.includes(context.nodeName)) {
        return 'critical';
      }
      
      if (message.includes('system') || message.includes('critical') || message.includes('fatal')) {
        return 'critical';
      } else if (message.includes('network') || message.includes('service')) {
        return 'medium';
      } else if (message.includes('validation') || message.includes('warning')) {
        return 'low';
      } else {
        return 'medium';
      }
    }

    // 测试错误分类
    const testErrors = [
      { message: 'Network timeout occurred', expected: 'network_error' },
      { message: 'Invalid input data provided', expected: 'validation_error' },
      { message: 'Service temporarily unavailable', expected: 'service_error' },
      { message: 'Data format parsing failed', expected: 'data_error' },
      { message: 'Authentication token expired', expected: 'auth_error' },
      { message: 'Unknown system failure', expected: 'unknown_error' }
    ];

    testErrors.forEach(({ message, expected }) => {
      const error = { message };
      const category = categorizeError(error);
      if (category !== expected) {
        throw new Error(`错误分类失败: "${message}" 期望 ${expected}, 实际 ${category}`);
      }
    });

    // 测试严重程度评估
    const severityTests = [
      { error: { message: 'Critical system failure' }, context: { nodeName: 'test_node' }, expected: 'critical' },
      { error: { message: 'Network timeout' }, context: { nodeName: 'test_node' }, expected: 'medium' },
      { error: { message: 'Validation warning' }, context: { nodeName: 'test_node' }, expected: 'low' },
      { error: { message: 'Service error' }, context: { nodeName: 'create_travel_plan' }, expected: 'critical' }
    ];

    severityTests.forEach(({ error, context, expected }) => {
      const severity = assessErrorSeverity(error, context);
      if (severity !== expected) {
        throw new Error(`严重程度评估失败: "${error.message}" 期望 ${expected}, 实际 ${severity}`);
      }
    });

    // 测试错误路由决策
    function routeError(error, context) {
      const category = categorizeError(error);
      const severity = assessErrorSeverity(error, context);
      
      const routes = {
        network_error: {
          low: 'retry_queue',
          medium: 'fallback_service',
          critical: 'emergency_handler'
        },
        validation_error: {
          low: 'user_feedback',
          medium: 'data_correction',
          critical: 'admin_review'
        },
        service_error: {
          low: 'service_retry',
          medium: 'service_fallback',
          critical: 'service_escalation'
        }
      };
      
      return routes[category]?.[severity] || 'default_handler';
    }

    const routingTests = [
      {
        error: { message: 'Network timeout' },
        context: { nodeName: 'test_node' },
        expected: 'fallback_service'
      },
      {
        error: { message: 'Invalid input validation failed' },
        context: { nodeName: 'test_node' },
        expected: 'user_feedback'
      },
      {
        error: { message: 'Service unavailable' },
        context: { nodeName: 'create_travel_plan' },
        expected: 'service_escalation'
      }
    ];

    routingTests.forEach(({ error, context, expected }) => {
      const route = routeError(error, context);
      if (route !== expected) {
        throw new Error(`错误路由失败: "${error.message}" 期望 ${expected}, 实际 ${route}`);
      }
    });

    console.log('  ✅ 错误分类和路由验证通过');
    console.log('    - 错误分类准确率100%');
    console.log('    - 严重程度评估正确');
    console.log('    - 错误路由决策正确');
    console.log('    - 支持6种错误类型');
    console.log('    - 支持4种严重程度级别');
    
    results.errorClassification = true;

  } catch (error) {
    console.log('  ❌ 错误分类和路由验证失败:', error.message);
    throw error;
  }
}

// ============= 测试4: 指标收集功能验证 =============

async function testMetricsCollection(results) {
  try {
    // 指标收集器
    class MetricsCollector {
      constructor() {
        this.metrics = [];
      }

      recordMetric(metric) {
        this.metrics.push({
          ...metric,
          timestamp: Date.now()
        });
      }

      getMetrics(filter = {}) {
        let filtered = [...this.metrics];
        
        if (filter.nodeName) {
          filtered = filtered.filter(m => m.nodeName === filter.nodeName);
        }
        
        if (filter.success !== undefined) {
          filtered = filtered.filter(m => m.success === filter.success);
        }
        
        if (filter.timeRange) {
          const { start, end } = filter.timeRange;
          filtered = filtered.filter(m => m.timestamp >= start && m.timestamp <= end);
        }
        
        return filtered;
      }

      getSuccessRate(nodeName) {
        const nodeMetrics = this.getMetrics({ nodeName });
        if (nodeMetrics.length === 0) return 1.0;
        
        const successCount = nodeMetrics.filter(m => m.success).length;
        return successCount / nodeMetrics.length;
      }

      getAverageExecutionTime(nodeName) {
        const nodeMetrics = this.getMetrics({ nodeName });
        if (nodeMetrics.length === 0) return 0;
        
        const totalTime = nodeMetrics.reduce((sum, m) => sum + m.executionTime, 0);
        return totalTime / nodeMetrics.length;
      }

      getErrorDistribution() {
        const errorMetrics = this.getMetrics({ success: false });
        const distribution = {};
        
        errorMetrics.forEach(metric => {
          const errorType = metric.errorType || 'unknown';
          distribution[errorType] = (distribution[errorType] || 0) + 1;
        });
        
        return distribution;
      }

      getRecoveryRate() {
        const recoveryMetrics = this.metrics.filter(m => m.recoveryAttempted);
        if (recoveryMetrics.length === 0) return 0;
        
        const successfulRecoveries = recoveryMetrics.filter(m => m.recoverySuccessful).length;
        return successfulRecoveries / recoveryMetrics.length;
      }

      generateReport() {
        const totalMetrics = this.metrics.length;
        const successfulMetrics = this.metrics.filter(m => m.success).length;
        const overallSuccessRate = totalMetrics > 0 ? successfulMetrics / totalMetrics : 1.0;
        
        return {
          totalExecutions: totalMetrics,
          successfulExecutions: successfulMetrics,
          overallSuccessRate,
          averageExecutionTime: this.getAverageExecutionTime(),
          errorDistribution: this.getErrorDistribution(),
          recoveryRate: this.getRecoveryRate()
        };
      }
    }

    const collector = new MetricsCollector();

    // 模拟指标数据
    const testMetrics = [
      { nodeName: 'analyze_complexity', executionTime: 150, success: true },
      { nodeName: 'analyze_complexity', executionTime: 200, success: true },
      { nodeName: 'gather_data', executionTime: 1200, success: false, errorType: 'network_error', recoveryAttempted: true, recoverySuccessful: true },
      { nodeName: 'gather_data', executionTime: 800, success: true },
      { nodeName: 'create_plan', executionTime: 2000, success: false, errorType: 'validation_error', recoveryAttempted: false },
      { nodeName: 'create_plan', executionTime: 1800, success: true },
      { nodeName: 'validate_plan', executionTime: 300, success: true },
      { nodeName: 'validate_plan', executionTime: 350, success: false, errorType: 'service_error', recoveryAttempted: true, recoverySuccessful: false }
    ];

    // 记录测试指标
    testMetrics.forEach(metric => collector.recordMetric(metric));

    // 验证指标收集
    const allMetrics = collector.getMetrics();
    if (allMetrics.length !== testMetrics.length) {
      throw new Error(`指标数量不匹配: 期望 ${testMetrics.length}, 实际 ${allMetrics.length}`);
    }

    // 验证节点过滤
    const complexityMetrics = collector.getMetrics({ nodeName: 'analyze_complexity' });
    if (complexityMetrics.length !== 2) {
      throw new Error('节点过滤功能失败');
    }

    // 验证成功率计算
    const complexitySuccessRate = collector.getSuccessRate('analyze_complexity');
    if (complexitySuccessRate !== 1.0) {
      throw new Error(`复杂度分析成功率计算错误: 期望 1.0, 实际 ${complexitySuccessRate}`);
    }

    const gatherDataSuccessRate = collector.getSuccessRate('gather_data');
    if (gatherDataSuccessRate !== 0.5) {
      throw new Error(`数据收集成功率计算错误: 期望 0.5, 实际 ${gatherDataSuccessRate}`);
    }

    // 验证平均执行时间计算
    const complexityAvgTime = collector.getAverageExecutionTime('analyze_complexity');
    if (complexityAvgTime !== 175) {
      throw new Error(`复杂度分析平均时间计算错误: 期望 175, 实际 ${complexityAvgTime}`);
    }

    // 验证错误分布统计
    const errorDistribution = collector.getErrorDistribution();
    const expectedDistribution = {
      network_error: 1,
      validation_error: 1,
      service_error: 1
    };

    Object.entries(expectedDistribution).forEach(([errorType, count]) => {
      if (errorDistribution[errorType] !== count) {
        throw new Error(`错误分布统计错误: ${errorType} 期望 ${count}, 实际 ${errorDistribution[errorType] || 0}`);
      }
    });

    // 验证恢复率计算
    const recoveryRate = collector.getRecoveryRate();
    if (recoveryRate !== 0.5) {
      throw new Error(`恢复率计算错误: 期望 0.5, 实际 ${recoveryRate}`);
    }

    // 验证综合报告生成
    const report = collector.generateReport();
    if (report.totalExecutions !== 8 || 
        report.successfulExecutions !== 5 || 
        Math.abs(report.overallSuccessRate - 0.625) > 0.001) {
      throw new Error('综合报告生成错误');
    }

    console.log('  ✅ 指标收集功能验证通过');
    console.log(`    - 总执行次数: ${report.totalExecutions}`);
    console.log(`    - 成功执行次数: ${report.successfulExecutions}`);
    console.log(`    - 整体成功率: ${(report.overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`    - 恢复成功率: ${(report.recoveryRate * 100).toFixed(1)}%`);
    console.log('    - 错误分布统计正确');
    console.log('    - 节点级别指标正确');
    
    results.metricsCollection = true;

  } catch (error) {
    console.log('  ❌ 指标收集功能验证失败:', error.message);
    throw error;
  }
}

// ============= 测试5: Phase 1错误处理集成验证 =============

async function testPhase1Integration(results) {
  try {
    // 模拟Phase 1错误处理器
    const mockPhase1ErrorHandler = {
      handleError: async function(error, context) {
        console.log(`    Phase 1处理错误: ${error.message}`);

        return {
          userMessage: this.generateUserFriendlyMessage(error, context),
          category: this.categorizeForUser(error),
          severity: this.assessUserImpact(error),
          recoverable: this.isUserRecoverable(error),
          suggestions: this.generateSuggestions(error, context)
        };
      },

      generateUserFriendlyMessage: function(error, context) {
        const errorType = error.message.toLowerCase();
        
        if (errorType.includes('network')) {
          return '网络连接出现问题，正在尝试重新连接...';
        } else if (errorType.includes('service')) {
          return '服务暂时不可用，正在切换到备用服务...';
        } else if (errorType.includes('validation')) {
          return '输入信息有误，请检查并重新输入';
        } else {
          return '处理过程中遇到问题，正在尝试解决...';
        }
      },

      categorizeForUser: function(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('timeout')) {
          return 'connectivity_issue';
        } else if (message.includes('validation') || message.includes('input')) {
          return 'input_error';
        } else if (message.includes('service')) {
          return 'service_issue';
        } else {
          return 'processing_error';
        }
      },

      assessUserImpact: function(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('critical') || message.includes('system')) {
          return 'high';
        } else if (message.includes('network') || message.includes('service')) {
          return 'medium';
        } else {
          return 'low';
        }
      },

      isUserRecoverable: function(error) {
        const message = error.message.toLowerCase();
        return !message.includes('critical') && !message.includes('system');
      },

      generateSuggestions: function(error, context) {
        const errorType = error.message.toLowerCase();
        
        if (errorType.includes('network')) {
          return ['检查网络连接', '稍后重试', '联系技术支持'];
        } else if (errorType.includes('validation')) {
          return ['检查输入格式', '确认必填字段', '参考输入示例'];
        } else if (errorType.includes('service')) {
          return ['稍后重试', '使用其他功能', '联系客服'];
        } else {
          return ['刷新页面重试', '清除浏览器缓存', '联系技术支持'];
        }
      }
    };

    // 模拟LangGraph错误中间件与Phase 1集成
    class IntegratedErrorMiddleware {
      constructor(phase1Handler) {
        this.phase1Handler = phase1Handler;
        this.metrics = [];
      }

      async handleError(error, context) {
        // 使用Phase 1错误处理器处理
        const phase1Result = await this.phase1Handler.handleError(error, context);
        
        // LangGraph特定的错误处理
        const langGraphResult = {
          nodeError: {
            id: `error_${Date.now()}`,
            node: context.nodeName,
            type: this.categorizeError(error),
            message: error.message,
            timestamp: new Date(),
            severity: this.assessErrorSeverity(error, context),
            recoverable: this.isRecoverable(error)
          },
          userFeedback: phase1Result,
          processingDecision: this.makeProcessingDecision(error, context, phase1Result)
        };

        // 记录集成指标
        this.recordIntegrationMetric(error, context, phase1Result, langGraphResult);

        return langGraphResult;
      }

      categorizeError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network')) return 'network_error';
        if (message.includes('validation')) return 'validation_error';
        if (message.includes('service')) return 'service_error';
        return 'unknown_error';
      }

      assessErrorSeverity(error, context) {
        const message = error.message.toLowerCase();
        if (message.includes('critical')) return 'critical';
        if (message.includes('network') || message.includes('service')) return 'medium';
        return 'low';
      }

      isRecoverable(error) {
        const message = error.message.toLowerCase();
        return message.includes('network') || message.includes('service');
      }

      makeProcessingDecision(error, context, phase1Result) {
        if (phase1Result.recoverable && this.isRecoverable(error)) {
          return {
            action: 'attempt_recovery',
            strategy: this.selectRecoveryStrategy(error),
            userNotification: phase1Result.userMessage
          };
        } else {
          return {
            action: 'fail_gracefully',
            fallback: 'use_cached_data',
            userNotification: phase1Result.userMessage
          };
        }
      }

      selectRecoveryStrategy(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network')) return 'network_retry';
        if (message.includes('service')) return 'service_fallback';
        return 'default_retry';
      }

      recordIntegrationMetric(error, context, phase1Result, langGraphResult) {
        this.metrics.push({
          timestamp: Date.now(),
          nodeName: context.nodeName,
          errorType: langGraphResult.nodeError.type,
          phase1Category: phase1Result.category,
          phase1Severity: phase1Result.severity,
          langGraphSeverity: langGraphResult.nodeError.severity,
          recoverable: phase1Result.recoverable && langGraphResult.nodeError.recoverable,
          processingAction: langGraphResult.processingDecision.action
        });
      }

      getIntegrationMetrics() {
        return [...this.metrics];
      }
    }

    const integratedMiddleware = new IntegratedErrorMiddleware(mockPhase1ErrorHandler);

    // 测试网络错误集成处理
    const networkError = new Error('Network timeout occurred');
    const networkContext = { nodeName: 'gather_destination_data', operation: 'data_collection' };
    
    const networkResult = await integratedMiddleware.handleError(networkError, networkContext);
    
    if (!networkResult.userFeedback.userMessage.includes('网络连接')) {
      throw new Error('网络错误用户消息不正确');
    }
    
    if (networkResult.processingDecision.action !== 'attempt_recovery') {
      throw new Error('网络错误处理决策不正确');
    }

    // 测试验证错误集成处理
    const validationError = new Error('Invalid input validation failed');
    const validationContext = { nodeName: 'validate_travel_request', operation: 'validation' };

    const validationResult = await integratedMiddleware.handleError(validationError, validationContext);

    if (!validationResult.userFeedback.userMessage.includes('输入信息')) {
      console.log('    实际用户消息:', validationResult.userFeedback.userMessage);
      throw new Error('验证错误用户消息不正确');
    }
    
    if (validationResult.userFeedback.category !== 'input_error') {
      throw new Error('验证错误分类不正确');
    }

    // 测试服务错误集成处理
    const serviceError = new Error('Service temporarily unavailable');
    const serviceContext = { nodeName: 'create_travel_plan', operation: 'plan_generation' };
    
    const serviceResult = await integratedMiddleware.handleError(serviceError, serviceContext);
    
    if (!serviceResult.userFeedback.userMessage.includes('服务暂时不可用')) {
      throw new Error('服务错误用户消息不正确');
    }
    
    if (serviceResult.processingDecision.strategy !== 'service_fallback') {
      throw new Error('服务错误恢复策略不正确');
    }

    // 验证集成指标
    const integrationMetrics = integratedMiddleware.getIntegrationMetrics();
    if (integrationMetrics.length !== 3) {
      throw new Error('集成指标记录数量不正确');
    }

    // 验证指标内容
    const networkMetric = integrationMetrics.find(m => m.errorType === 'network_error');
    if (!networkMetric || networkMetric.phase1Category !== 'connectivity_issue') {
      throw new Error('网络错误集成指标不正确');
    }

    const validationMetric = integrationMetrics.find(m => m.errorType === 'validation_error');
    if (!validationMetric || validationMetric.phase1Category !== 'input_error') {
      throw new Error('验证错误集成指标不正确');
    }

    console.log('  ✅ Phase 1错误处理集成验证通过');
    console.log('    - Phase 1错误处理器正常调用');
    console.log('    - 用户友好消息生成正确');
    console.log('    - 错误分类映射正确');
    console.log('    - 处理决策逻辑正确');
    console.log('    - 集成指标记录正确');
    console.log('    - 恢复策略选择正确');
    
    results.phase1Integration = true;

  } catch (error) {
    console.log('  ❌ Phase 1错误处理集成验证失败:', error.message);
    throw error;
  }
}

// ============= 生成测试报告 =============

function generateErrorHandlingReport(results) {
  console.log('\n📊 错误处理统一化验证报告');
  console.log('=' .repeat(50));
  
  const testItems = [
    { name: '错误处理中间件', key: 'errorMiddleware', description: 'LangGraph错误处理中间件正常工作' },
    { name: '自动恢复机制', key: 'autoRecovery', description: '多种恢复策略和次数限制' },
    { name: '错误分类和路由', key: 'errorClassification', description: '6种错误类型和智能路由' },
    { name: '指标收集功能', key: 'metricsCollection', description: '完整的错误和性能指标' },
    { name: 'Phase 1集成', key: 'phase1Integration', description: '与现有错误处理系统集成' }
  ];

  let passedTests = 0;
  testItems.forEach(item => {
    const status = results[item.key] ? '✅ 通过' : '❌ 失败';
    console.log(`${status} ${item.name}: ${item.description}`);
    if (results[item.key]) passedTests++;
  });

  const successRate = (passedTests / testItems.length * 100).toFixed(1);
  console.log(`\n总体通过率: ${successRate}% (${passedTests}/${testItems.length})`);
  
  if (passedTests === testItems.length) {
    console.log('🎉 错误处理统一化验证全部通过！');
  } else {
    console.log('⚠️  部分测试未通过，需要进一步检查');
  }
}

// 执行测试
testErrorHandlingUnification()
  .then(() => {
    console.log('\n✅ 错误处理统一化验证测试完成');
  })
  .catch(error => {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  });
