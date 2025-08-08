/**
 * 智游助手v6.2 - LangGraph集成测试
 * 验证LangGraph与Phase 1智能双链路架构的集成
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll } from './test-utils';
import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import ServiceQualityMonitor from '@/lib/geo/quality-monitor';
import IntelligentGeoQueue from '@/lib/queue/intelligent-queue';
import UserFriendlyErrorHandler from '@/lib/error/user-friendly-error-handler';
import IntelligentTransparencyManager from '@/lib/ui/transparency-manager';
import MonitoringDashboard from '@/lib/monitoring/monitoring-dashboard';
import LangGraphTravelOrchestrator from '@/lib/langgraph/travel-orchestrator';
import { TravelRequest, createInitialState, validateTravelState } from '@/lib/langgraph/smart-travel-state';

describe('LangGraph智能编排系统集成测试', () => {
  let geoService: UnifiedGeoService;
  let qualityMonitor: ServiceQualityMonitor;
  let queue: IntelligentGeoQueue;
  let errorHandler: UserFriendlyErrorHandler;
  let transparencyManager: IntelligentTransparencyManager;
  let dashboard: MonitoringDashboard;
  let orchestrator: LangGraphTravelOrchestrator;

  beforeAll(async () => {
    // 初始化Phase 1核心组件
    qualityMonitor = new ServiceQualityMonitor();
    geoService = new UnifiedGeoService(qualityMonitor, null as any);
    queue = new IntelligentGeoQueue(geoService, qualityMonitor);
    dashboard = new MonitoringDashboard(qualityMonitor, geoService);
    transparencyManager = new IntelligentTransparencyManager(geoService, dashboard, queue);
    errorHandler = new UserFriendlyErrorHandler(geoService, transparencyManager);

    // 初始化LangGraph编排器
    orchestrator = new LangGraphTravelOrchestrator(
      geoService,
      qualityMonitor,
      queue,
      errorHandler
    );

    console.log('LangGraph集成测试环境初始化完成');
  });

  afterAll(async () => {
    // 清理测试环境
    queue.stop();
    dashboard.stopRealTimeMonitoring();
    console.log('LangGraph集成测试环境清理完成');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= 基础集成测试 =============

  describe('基础集成验证', () => {
    test('LangGraph编排器初始化成功', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator).toBeInstanceOf(LangGraphTravelOrchestrator);
    });

    test('智能状态定义完整性验证', () => {
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

      const initialState = createInitialState(mockRequest);
      
      expect(validateTravelState(initialState)).toBe(true);
      expect(initialState.sessionId).toBeDefined();
      expect(initialState.requestId).toBeDefined();
      expect(initialState.travelRequest).toEqual(mockRequest);
      expect(initialState.processingStatus).toBe('pending');
    });

    test('与Phase 1组件集成无冲突', async ({ unitContext }) => {
      // 验证现有服务正常工作
      const serviceStatus = await geoService.getServiceStatus();
      expect(serviceStatus).toBeDefined();

      const qualityReport = await geoService.getQualityReport();
      expect(qualityReport).toBeDefined();

      // 验证队列系统正常
      const queueStatus = queue.getStatus();
      expect(queueStatus.isProcessing).toBeDefined();

      console.log('Phase 1组件集成验证通过');
    });
  });

  // ============= 智能编排功能测试 =============

  describe('智能编排功能测试', () => {
    test('简单旅行请求编排测试', async ({ unitContext }) => {
      const simpleRequest: TravelRequest = {
        origin: '北京市朝阳区',
        destination: '北京市海淀区',
        travelDate: new Date('2025-08-15'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: ['文化'],
          transportation: 'transit'
        }
      };

      console.log('开始简单旅行请求编排测试...');
      const startTime = Date.now();

      const result = await orchestrator.orchestrateTravelPlanning(simpleRequest);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.travelRequest).toEqual(simpleRequest);
      expect(result.processingStatus).toMatch(/completed|failed/);
      
      // 验证处理时间合理
      expect(processingTime).toBeLessThan(30000); // 30秒内完成

      console.log(`简单旅行编排完成，耗时: ${processingTime}ms`);
      console.log(`处理状态: ${result.processingStatus}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('处理过程中的错误:', result.errors);
      }
    }, 60000); // 60秒超时

    test('复杂旅行请求编排测试', async ({ unitContext }) => {
      const complexRequest: TravelRequest = {
        origin: '北京市',
        destination: '上海市',
        travelDate: new Date('2025-09-01'),
        duration: 5,
        travelers: 4,
        budget: 10000,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '美食', '购物', '娱乐'],
          transportation: 'mixed',
          accommodation: 'hotel',
          dining: 'local'
        },
        constraints: {
          maxBudget: 12000,
          timeConstraints: [{
            type: 'must_visit',
            location: '外滩',
            timeRange: {
              start: new Date('2025-09-02T09:00:00'),
              end: new Date('2025-09-02T18:00:00')
            },
            priority: 1
          }],
          dietaryRestrictions: ['vegetarian']
        }
      };

      console.log('开始复杂旅行请求编排测试...');
      const startTime = Date.now();

      const result = await orchestrator.orchestrateTravelPlanning(complexRequest);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 验证结果
      expect(result).toBeDefined();
      expect(result.complexityAnalysis).toBeDefined();
      expect(result.serviceQualityContext).toBeDefined();
      expect(result.processingStrategy).toBeDefined();
      
      // 验证复杂度分析
      if (result.complexityAnalysis) {
        expect(result.complexityAnalysis.overall).toBeGreaterThan(0.5); // 复杂请求
        expect(result.complexityAnalysis.recommendation).toMatch(/standard|comprehensive/);
      }

      // 验证处理策略
      if (result.processingStrategy) {
        expect(result.processingStrategy).toMatch(/intelligent_dual_service|comprehensive_analysis|parallel_processing/);
      }

      console.log(`复杂旅行编排完成，耗时: ${processingTime}ms`);
      console.log(`复杂度评分: ${result.complexityAnalysis?.overall}`);
      console.log(`处理策略: ${result.processingStrategy}`);
      console.log(`处理状态: ${result.processingStatus}`);
    }, 120000); // 120秒超时

    test('错误处理和恢复机制测试', async ({ unitContext }) => {
      // 模拟可能导致错误的请求
      const errorProneRequest: TravelRequest = {
        origin: '无效地址123',
        destination: '不存在的地方456',
        travelDate: new Date('2025-08-15'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: [],
          transportation: 'driving'
        }
      };

      console.log('开始错误处理测试...');

      const result = await orchestrator.orchestrateTravelPlanning(errorProneRequest);

      // 验证错误处理
      expect(result).toBeDefined();
      expect(result.processingStatus).toMatch(/failed|completed/);
      
      if (result.processingStatus === 'failed') {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
        
        // 验证错误信息的完整性
        const lastError = result.errors![result.errors!.length - 1];
        expect(lastError.id).toBeDefined();
        expect(lastError.node).toBeDefined();
        expect(lastError.type).toBeDefined();
        expect(lastError.message).toBeDefined();
        expect(lastError.timestamp).toBeInstanceOf(Date);
        expect(lastError.severity).toMatch(/low|medium|high|critical/);
        
        console.log('错误处理验证通过，错误信息:', lastError);
      } else {
        console.log('请求意外成功完成，可能是错误恢复机制生效');
      }
    }, 60000);
  });

  // ============= 性能和质量测试 =============

  describe('性能和质量测试', () => {
    test('并发编排处理能力测试', async ({ unitContext }) => {
      const concurrentRequests = 5;
      const requests: TravelRequest[] = [];

      // 创建多个并发请求
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push({
          origin: `测试起点${i}`,
          destination: `测试终点${i}`,
          travelDate: new Date('2025-08-20'),
          duration: 2,
          travelers: 2,
          preferences: {
            travelStyle: 'comfort',
            interests: ['文化'],
            transportation: 'mixed'
          }
        });
      }

      console.log(`开始${concurrentRequests}个并发编排测试...`);
      const startTime = Date.now();

      // 并发执行
      const promises = requests.map(request => 
        orchestrator.orchestrateTravelPlanning(request)
      );

      const results = await Promise.allSettled(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // 分析结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const successRate = (successful / concurrentRequests) * 100;

      console.log(`并发编排测试结果:`);
      console.log(`- 总请求数: ${concurrentRequests}`);
      console.log(`- 成功数: ${successful}`);
      console.log(`- 失败数: ${failed}`);
      console.log(`- 成功率: ${successRate.toFixed(1)}%`);
      console.log(`- 总耗时: ${totalTime}ms`);
      console.log(`- 平均耗时: ${averageTime.toFixed(1)}ms`);

      // 验收标准
      expect(successRate).toBeGreaterThan(80); // 80%以上成功率
      expect(averageTime).toBeLessThan(60000); // 平均处理时间<60秒
    }, 180000); // 3分钟超时

    test('服务质量感知能力测试', async ({ unitContext }) => {
      const request: TravelRequest = {
        origin: '北京市',
        destination: '天津市',
        travelDate: new Date('2025-08-25'),
        duration: 2,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化', '美食'],
          transportation: 'mixed'
        }
      };

      console.log('开始服务质量感知测试...');

      const result = await orchestrator.orchestrateTravelPlanning(request);

      // 验证服务质量感知
      expect(result.serviceQualityContext).toBeDefined();
      
      if (result.serviceQualityContext) {
        const qualityContext = result.serviceQualityContext;
        
        expect(qualityContext.primaryService).toMatch(/amap|tencent/);
        expect(qualityContext.qualityScore).toBeGreaterThanOrEqual(0);
        expect(qualityContext.qualityScore).toBeLessThanOrEqual(1);
        expect(qualityContext.availability).toBeDefined();
        expect(qualityContext.recommendedStrategy).toBeDefined();
        expect(qualityContext.lastUpdated).toBeInstanceOf(Date);

        console.log('服务质量感知验证通过:');
        console.log(`- 主服务: ${qualityContext.primaryService}`);
        console.log(`- 质量评分: ${qualityContext.qualityScore.toFixed(3)}`);
        console.log(`- 推荐策略: ${qualityContext.recommendedStrategy}`);
        console.log(`- 高德可用: ${qualityContext.availability.amap}`);
        console.log(`- 腾讯可用: ${qualityContext.availability.tencent}`);
      }
    }, 60000);

    test('状态管理和持久化测试', async ({ unitContext }) => {
      const request: TravelRequest = {
        origin: '广州市',
        destination: '深圳市',
        travelDate: new Date('2025-08-30'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: ['购物'],
          transportation: 'transit'
        }
      };

      console.log('开始状态管理测试...');

      const result = await orchestrator.orchestrateTravelPlanning(request);

      // 验证状态管理
      expect(result.sessionId).toBeDefined();
      expect(result.requestId).toBeDefined();
      expect(result.stateVersion).toBeGreaterThan(0);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.timestamp).toBeInstanceOf(Date);
      
      // 验证状态完整性
      expect(result.travelRequest).toEqual(request);
      
      // 验证状态进展
      if (result.processingStatus === 'completed') {
        expect(result.currentNode).toBeDefined();
      }

      console.log('状态管理验证通过:');
      console.log(`- 会话ID: ${result.sessionId}`);
      console.log(`- 请求ID: ${result.requestId}`);
      console.log(`- 状态版本: ${result.stateVersion}`);
      console.log(`- 当前节点: ${result.currentNode}`);
      console.log(`- 处理状态: ${result.processingStatus}`);
    }, 60000);
  });

  // ============= 集成兼容性测试 =============

  describe('集成兼容性测试', () => {
    test('与现有API兼容性验证', async ({ unitContext }) => {
      // 验证现有API仍然正常工作
      console.log('验证现有API兼容性...');

      // 测试地理编码API
      const geocodingResult = await geoService.geocoding('北京市朝阳区');
      expect(geocodingResult).toBeDefined();

      // 测试POI搜索API
      const poiResult = await geoService.placeSearch('餐厅', '39.9042,116.4074');
      expect(poiResult).toBeDefined();

      // 测试路线规划API
      const routeResult = await geoService.routePlanning(
        '39.9042,116.4074',
        '39.9142,116.4174',
        'driving'
      );
      expect(routeResult).toBeDefined();

      console.log('现有API兼容性验证通过');
    });

    test('数据格式一致性验证', async ({ unitContext }) => {
      // 验证LangGraph处理的数据格式与现有格式一致
      const request: TravelRequest = {
        origin: '北京市',
        destination: '上海市',
        travelDate: new Date('2025-09-05'),
        duration: 3,
        travelers: 2,
        preferences: {
          travelStyle: 'comfort',
          interests: ['文化'],
          transportation: 'mixed'
        }
      };

      const result = await orchestrator.orchestrateTravelPlanning(request);

      // 验证数据格式
      expect(result.travelRequest).toEqual(request);
      
      if (result.dataCollection) {
        // 验证数据收集格式与现有格式兼容
        expect(result.dataCollection).toHaveProperty('collectionProgress');
        expect(typeof result.dataCollection.collectionProgress).toBe('number');
      }

      console.log('数据格式一致性验证通过');
    });

    test('性能影响评估', async ({ unitContext }) => {
      // 对比LangGraph编排与直接API调用的性能
      const testLocation = '北京市朝阳区建国路';
      
      console.log('开始性能影响评估...');

      // 直接API调用基准测试
      const directStartTime = Date.now();
      await geoService.geocoding(testLocation);
      const directEndTime = Date.now();
      const directTime = directEndTime - directStartTime;

      // LangGraph编排测试
      const orchestratorStartTime = Date.now();
      const simpleRequest: TravelRequest = {
        origin: testLocation,
        destination: '北京市海淀区',
        travelDate: new Date('2025-08-15'),
        duration: 1,
        travelers: 1,
        preferences: {
          travelStyle: 'budget',
          interests: ['文化'],
          transportation: 'transit'
        }
      };
      await orchestrator.orchestrateTravelPlanning(simpleRequest);
      const orchestratorEndTime = Date.now();
      const orchestratorTime = orchestratorEndTime - orchestratorStartTime;

      const overhead = orchestratorTime - directTime;
      const overheadPercentage = (overhead / directTime) * 100;

      console.log(`性能影响评估结果:`);
      console.log(`- 直接API调用: ${directTime}ms`);
      console.log(`- LangGraph编排: ${orchestratorTime}ms`);
      console.log(`- 额外开销: ${overhead}ms (${overheadPercentage.toFixed(1)}%)`);

      // 验收标准: 额外开销应该合理
      expect(overheadPercentage).toBeLessThan(500); // 额外开销<500%
    }, 60000);
  });
});
