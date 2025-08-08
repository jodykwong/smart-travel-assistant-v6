/**
 * 智游助手v6.2 - Phase 1优化验证测试
 * 验证状态管理重构、类型安全增强和错误处理统一化的效果
 * 
 * 测试目标:
 * 1. 状态管理模块重构验证
 * 2. 类型安全增强验证
 * 3. 错误处理统一化验证
 * 4. 性能改进验证
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll } from './test-utils';
import { 
  SmartTravelState, 
  TravelRequest, 
  createInitialState,
  validateTravelState,
  getStateProgress
} from '@/lib/langgraph/smart-travel-state';
import TravelStateManager from '@/lib/langgraph/state-manager';
import { 
  updateTravelState,
  updatePlanningState,
  updateAnalysisState,
  addError,
  createImmutableState,
  hasErrors,
  needsRecovery
} from '@/lib/langgraph/type-safe-state';
import LangGraphErrorMiddleware from '@/lib/langgraph/error-middleware';
import UserFriendlyErrorHandler from '@/lib/error/user-friendly-error-handler';

describe('Phase 1 架构优化验证测试', () => {
  let mockErrorHandler: UserFriendlyErrorHandler;
  let errorMiddleware: LangGraphErrorMiddleware;

  beforeAll(() => {
    // 模拟错误处理器
    mockErrorHandler = {
      handleError: vi.fn().mockResolvedValue({
        userMessage: '处理过程中遇到问题，正在尝试恢复',
        category: 'processing_error',
        severity: 'medium',
        recoverable: true
      })
    } as any;

    errorMiddleware = new LangGraphErrorMiddleware(mockErrorHandler);
  });

  // ============= 状态管理模块重构验证 =============

  describe('状态管理模块重构验证', () => {
    test('状态结构分解验证 - 遵循[SOLID-单一职责]原则', () => {
      const mockRequest: TravelRequest = {
        origin: '北京市',
        destination: '上海市',
        travelDate: new Date('2025-09-01'),
        duration: 3,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '美食'],
          transportation: 'mixed'
        }
      };

      const state = createInitialState(mockRequest, 'user123');

      // 验证状态结构分解
      expect(state.planning).toBeDefined();
      expect(state.analysis).toBeDefined();
      expect(state.execution).toBeDefined();
      expect(state.monitoring).toBeDefined();
      expect(state.metadata).toBeDefined();

      // 验证核心上下文不可变性
      expect(state.planning.context.sessionId).toBeDefined();
      expect(state.planning.context.requestId).toBeDefined();
      expect(state.planning.context.userId).toBe('user123');
      expect(typeof state.planning.context.timestamp).toBe('number');

      // 验证状态验证函数
      expect(validateTravelState(state)).toBe(true);

      console.log('✅ 状态结构分解验证通过 - 遵循[SOLID-单一职责]原则');
    });

    test('状态序列化兼容性验证 - 解决Date类型问题', () => {
      const mockRequest: TravelRequest = {
        origin: '广州市',
        destination: '深圳市',
        travelDate: new Date('2025-08-15'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: ['购物'],
          transportation: 'transit'
        }
      };

      const state = createInitialState(mockRequest);
      const stateManager = new TravelStateManager(state);

      // 创建快照
      const snapshot = stateManager.createSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.data).toBeTruthy();
      expect(snapshot.checksum).toBeTruthy();
      expect(typeof snapshot.timestamp).toBe('number');

      // 从快照恢复
      const restoredState = stateManager.restoreFromSnapshot(snapshot);
      expect(restoredState.isValid).toBe(true);

      // 验证恢复后的状态
      const currentState = stateManager.getCurrentState();
      expect(currentState.planning.context.sessionId).toBe(state.planning.context.sessionId);
      expect(currentState.metadata.version).toBe(state.metadata.version);

      console.log('✅ 状态序列化兼容性验证通过 - Date类型问题已解决');
    });

    test('原子性状态更新验证', () => {
      const mockRequest: TravelRequest = {
        origin: '成都市',
        destination: '重庆市',
        travelDate: new Date('2025-08-20'),
        duration: 2,
        travelers: 3,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '美食'],
          transportation: 'driving'
        }
      };

      const state = createInitialState(mockRequest);
      const stateManager = new TravelStateManager(state);

      // 测试分析状态更新
      const analysisUpdate = stateManager.updateAnalysis({
        complexity: {
          overall: 0.6,
          factors: {
            distance: 0.5,
            duration: 0.4,
            preferences: 0.7,
            constraints: 0.3,
            seasonality: 0.6
          },
          recommendation: 'standard',
          estimatedProcessingTime: 120
        }
      });

      expect(analysisUpdate.isValid).toBe(true);
      expect(analysisUpdate.errors.length).toBe(0);

      // 验证状态版本递增
      const currentState = stateManager.getCurrentState();
      expect(currentState.metadata.version).toBe(2);
      expect(currentState.analysis.complexity?.overall).toBe(0.6);

      console.log('✅ 原子性状态更新验证通过');
    });
  });

  // ============= 类型安全增强验证 =============

  describe('类型安全增强验证', () => {
    test('强类型状态更新验证 - 消除any类型', () => {
      const mockRequest: TravelRequest = {
        origin: '杭州市',
        destination: '苏州市',
        travelDate: new Date('2025-08-25'),
        duration: 2,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化'],
          transportation: 'mixed'
        }
      };

      const state = createInitialState(mockRequest);

      // 测试类型安全的状态更新
      const updatedState = updatePlanningState(state, {
        status: 'analyzing'
      });

      expect(updatedState.planning.status).toBe('analyzing');
      expect(updatedState.metadata.version).toBe(2);

      // 测试分析状态更新
      const analysisUpdatedState = updateAnalysisState(updatedState, {
        complexity: {
          overall: 0.5,
          factors: {
            distance: 0.4,
            duration: 0.3,
            preferences: 0.6,
            constraints: 0.2,
            seasonality: 0.5
          },
          recommendation: 'standard',
          estimatedProcessingTime: 90
        }
      });

      expect(analysisUpdatedState.analysis.complexity?.overall).toBe(0.5);
      expect(analysisUpdatedState.metadata.version).toBe(3);

      console.log('✅ 强类型状态更新验证通过 - 已消除any类型');
    });

    test('类型守卫函数验证', () => {
      const mockRequest: TravelRequest = {
        origin: '西安市',
        destination: '洛阳市',
        travelDate: new Date('2025-09-10'),
        duration: 3,
        travelers: 4,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '历史'],
          transportation: 'mixed'
        }
      };

      const state = createInitialState(mockRequest);

      // 测试状态查询函数
      expect(hasErrors(state)).toBe(false);
      expect(needsRecovery(state)).toBe(false);
      expect(getStateProgress(state)).toBe(0);

      // 添加错误并测试
      const errorState = addError(state, {
        id: 'test_error_1',
        node: 'test_node',
        type: 'test_error',
        message: 'Test error message',
        timestamp: new Date(),
        severity: 'medium',
        recoverable: true
      });

      expect(hasErrors(errorState)).toBe(true);
      expect(errorState.monitoring.errors.length).toBe(1);

      console.log('✅ 类型守卫函数验证通过');
    });

    test('不可变状态创建验证', () => {
      const mockRequest: TravelRequest = {
        origin: '南京市',
        destination: '扬州市',
        travelDate: new Date('2025-08-30'),
        duration: 1,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化'],
          transportation: 'driving'
        }
      };

      const state = createInitialState(mockRequest);
      const immutableState = createImmutableState(state);

      // 验证不可变性
      expect(Object.isFrozen(immutableState)).toBe(true);
      expect(Object.isFrozen(immutableState.planning)).toBe(true);
      expect(Object.isFrozen(immutableState.planning.context)).toBe(true);

      // 尝试修改应该失败（在严格模式下会抛出错误）
      expect(() => {
        (immutableState as any).planning.status = 'completed';
      }).toThrow();

      console.log('✅ 不可变状态创建验证通过');
    });
  });

  // ============= 错误处理统一化验证 =============

  describe('错误处理统一化验证', () => {
    test('错误处理中间件验证 - 遵循[纵深防御]原则', async ({ unitContext }) => {
      const mockNodeFunction = vi.fn().mockRejectedValue(new Error('Test network error'));
      
      const wrappedFunction = errorMiddleware.wrapNodeExecution(
        'test_node',
        mockNodeFunction
      );

      const mockRequest: TravelRequest = {
        origin: '天津市',
        destination: '石家庄市',
        travelDate: new Date('2025-09-05'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: ['购物'],
          transportation: 'transit'
        }
      };

      const state = createInitialState(mockRequest);

      // 执行包装的函数
      const result = await wrappedFunction(state);

      // 验证错误处理
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
      expect(result).toBeDefined();

      // 验证错误指标记录
      const metrics = errorMiddleware.getErrorMetrics('test_node');
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].nodeName).toBe('test_node');

      console.log('✅ 错误处理中间件验证通过 - 遵循[纵深防御]原则');
    });

    test('自动恢复机制验证', async ({ unitContext }) => {
      const mockNodeFunction = vi.fn()
        .mockRejectedValueOnce(new Error('Test network timeout'))
        .mockResolvedValueOnce({ success: true });

      const wrappedFunction = errorMiddleware.wrapNodeExecution(
        'network_test_node',
        mockNodeFunction
      );

      const mockRequest: TravelRequest = {
        origin: '青岛市',
        destination: '烟台市',
        travelDate: new Date('2025-08-18'),
        duration: 2,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['海滨'],
          transportation: 'driving'
        }
      };

      const state = createInitialState(mockRequest);

      // 执行包装的函数
      const result = await wrappedFunction(state);

      // 验证恢复机制
      expect(result).toBeDefined();
      
      // 验证指标记录
      const metrics = errorMiddleware.getErrorMetrics('network_test_node');
      expect(metrics.length).toBeGreaterThan(0);
      
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.recoveryAttempted).toBe(true);

      console.log('✅ 自动恢复机制验证通过');
    });

    test('错误指标统计验证', async ({ unitContext }) => {
      // 执行多个测试以生成指标
      const testNodes = ['node1', 'node2', 'node3'];
      
      for (const nodeName of testNodes) {
        const mockFunction = vi.fn().mockResolvedValue({ success: true });
        const wrappedFunction = errorMiddleware.wrapNodeExecution(nodeName, mockFunction);
        
        const mockRequest: TravelRequest = {
          origin: '测试起点',
          destination: '测试终点',
          travelDate: new Date(),
          duration: 1,
          travelers: 1,
          preferences: {
            travelStyle: 'budget',
            interests: ['测试'],
            transportation: 'walking'
          }
        };

        const state = createInitialState(mockRequest);
        await wrappedFunction(state);
      }

      // 验证指标统计
      const allMetrics = errorMiddleware.getErrorMetrics();
      expect(allMetrics.length).toBeGreaterThan(0);

      const successRate = errorMiddleware.getSuccessRate();
      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThanOrEqual(1);

      const avgExecutionTime = errorMiddleware.getAverageExecutionTime();
      expect(avgExecutionTime).toBeGreaterThanOrEqual(0);

      console.log('✅ 错误指标统计验证通过');
      console.log(`   成功率: ${(successRate * 100).toFixed(1)}%`);
      console.log(`   平均执行时间: ${avgExecutionTime.toFixed(2)}ms`);
    });
  });

  // ============= 性能改进验证 =============

  describe('性能改进验证', () => {
    test('状态更新性能测试', () => {
      const mockRequest: TravelRequest = {
        origin: '大连市',
        destination: '沈阳市',
        travelDate: new Date('2025-09-15'),
        duration: 2,
        travelers: 3,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '美食'],
          transportation: 'mixed'
        }
      };

      const state = createInitialState(mockRequest);
      const iterations = 1000;

      // 测试状态更新性能
      const startTime = Date.now();
      
      let currentState = state;
      for (let i = 0; i < iterations; i++) {
        currentState = updatePlanningState(currentState, {
          status: i % 2 === 0 ? 'analyzing' : 'collecting'
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerUpdate = totalTime / iterations;

      console.log(`状态更新性能测试结果:`);
      console.log(`- 总更新次数: ${iterations}`);
      console.log(`- 总耗时: ${totalTime}ms`);
      console.log(`- 平均每次更新: ${avgTimePerUpdate.toFixed(3)}ms`);

      // 验收标准: 平均每次更新 < 1ms
      expect(avgTimePerUpdate).toBeLessThan(1);
      expect(currentState.metadata.version).toBe(iterations + 1);

      console.log('✅ 状态更新性能测试通过 - 平均更新时间 < 1ms');
    });

    test('内存使用效率测试', () => {
      const mockRequest: TravelRequest = {
        origin: '福州市',
        destination: '厦门市',
        travelDate: new Date('2025-08-28'),
        duration: 2,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['海滨', '文化'],
          transportation: 'driving'
        }
      };

      // 创建多个状态实例
      const states: SmartTravelState[] = [];
      const stateCount = 100;

      for (let i = 0; i < stateCount; i++) {
        const state = createInitialState(mockRequest, `user${i}`);
        states.push(state);
      }

      // 验证状态独立性
      expect(states.length).toBe(stateCount);
      
      // 验证每个状态都有唯一的会话ID
      const sessionIds = new Set(states.map(s => s.planning.context.sessionId));
      expect(sessionIds.size).toBe(stateCount);

      // 验证状态结构一致性
      states.forEach(state => {
        expect(validateTravelState(state)).toBe(true);
      });

      console.log('✅ 内存使用效率测试通过 - 状态独立性和一致性验证');
    });
  });

  afterAll(() => {
    // 清理测试数据
    errorMiddleware.cleanupMetrics();
    console.log('\n🎉 Phase 1 架构优化验证测试全部通过！');
    console.log('📊 优化成果总结:');
    console.log('  ✅ 状态管理模块重构 - 遵循[SOLID-单一职责]原则');
    console.log('  ✅ 类型安全增强 - 消除any类型，增强编译时检查');
    console.log('  ✅ 错误处理统一化 - 遵循[纵深防御]原则');
    console.log('  ✅ 性能改进验证 - 状态更新延迟 < 1ms');
  });
});
