/**
 * 智游助手v5.0 - 简化架构集成测试
 * 验证重构后的架构是否正常工作
 * 
 * 测试覆盖：
 * 1. 端到端旅行规划流程
 * 2. 性能基准测试
 * 3. 错误处理验证
 * 4. 向后兼容性检查
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll, vi } from './test-utils';

import { TravelPlanServiceV2 } from '../../services/travel-plan-service-v2';
import { TravelDataService } from '../../services/travel-data-service';
import { TravelPlanParserV2 } from '../../services/parsers/travel-plan-parser-v2';
import { SimplifiedAmapService } from '../../services/external-apis/simplified-amap-service';

// 测试数据
const mockLLMResponse = `
# 哈尔滨5日深度游攻略

哈尔滨作为东北的明珠城市，拥有独特的俄式建筑风情和丰富的冰雪文化。这次5天的行程将带您深度体验哈尔滨的精华景点、地道美食和独特文化。

## 住宿推荐

### 推荐酒店
1. 哈尔滨香格里拉大酒店 - 位于市中心，交通便利，设施齐全，价格约1200元/晚
2. 哈尔滨马迭尔宾馆 - 历史悠久的俄式建筑，体验老哈尔滨风情，价格约800元/晚
3. 哈尔滨万达嘉华酒店 - 现代化设施，靠近商业区，价格约600元/晚

### 预订建议
- 建议提前2周预订，冬季旺季需要更早预订
- 选择地铁沿线酒店，出行更方便
- 考虑季节因素，冬季价格会上涨

## 美食体验

### 必尝特色
- 哈尔滨红肠
- 锅包肉
- 马迭尔冰棍
- 俄式大列巴
- 东北饺子

### 推荐餐厅
1. 老昌春饼 - 正宗东北春饼，传统口味，人均80元
2. 华梅西餐厅 - 百年俄式西餐厅，经典俄餐，人均200元
3. 张包铺 - 哈尔滨特色包子，地道小吃，人均30元

### 美食街区
- 中央大街 - 各种特色小吃和俄式餐厅
- 道外区 - 传统东北菜聚集地

## 交通指南

### 到达方式
- 飞机：哈尔滨太平国际机场，机场大巴直达市区，约1小时，票价20元
- 高铁：哈尔滨西站、哈尔滨站，地铁直达，约30分钟，票价3-5元
- 长途汽车：各大汽车站，公交接驳，约1小时

### 当地交通
- 地铁：1、2、3号线覆盖主要景点，票价2-4元，建议购买一卡通
- 公交：线路密集，票价2元，支持一卡通
- 出租车：起步价8元，夜间加收20%
- 共享单车：便宜便民，但冬季较少

### 交通卡
哈尔滨城市通 - 20元押金，可乘坐地铁公交，享受折扣优惠

## 实用贴士

### 天气提醒
- 春季（3-5月）：温度5-20°C，多风，建议穿外套
- 夏季（6-8月）：温度15-30°C，凉爽舒适，最佳旅游季节
- 秋季（9-11月）：温度0-15°C，干燥，需要保暖衣物
- 冬季（12-2月）：温度-30-0°C，严寒，需要厚羽绒服

### 文化礼仪
- 参观教堂等宗教场所需要保持安静
- 在冰雪大世界等景点注意安全
- 尊重当地习俗，文明旅游

### 安全提醒
- 冬季路面湿滑，注意防滑
- 保管好个人财物，避免在人多地方露财
- 紧急电话：110（报警）、120（急救）、119（消防）

### 购物建议
- 中央大街：俄罗斯商品和纪念品
- 秋林公司：哈尔滨特产和俄式食品
- 红博广场：现代购物中心

### 预算建议
- 住宿：600-1200元/晚
- 餐饮：80-200元/天
- 交通：30-80元/天
- 门票：100-200元/天
- 总预算：约800-1500元/天
`;

const testMetadata = {
  id: 'test-harbin-5days',
  title: '哈尔滨5日深度游',
  destination: '哈尔滨',
  totalDays: 5,
  startDate: '2024-03-01',
  endDate: '2024-03-05',
  totalCost: 6000,
  groupSize: 2,
};

describe('简化架构集成测试', () => {
  let travelPlanService: TravelPlanServiceV2;
  let travelDataService: TravelDataService;
  let amapService: SimplifiedAmapService;

  beforeEach(() => {
    travelPlanService = new TravelPlanServiceV2({
      cacheEnabled: false, // 测试时禁用缓存
      dataQualityThreshold: 0.6,
    });

    travelDataService = new TravelDataService({
      enableCache: false,
    });

    amapService = new SimplifiedAmapService();
  });

  describe('端到端流程测试', () => {
    test('应该成功创建完整的旅行计划', async ({ unitContext }) => {
      const result = await travelPlanService.createTravelPlan(mockLLMResponse, testMetadata);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('test-harbin-5days');
      expect(result.data?.destination).toBe('哈尔滨');
      expect(result.data?.accommodation).toBeDefined();
      expect(result.data?.foodExperience).toBeDefined();
      expect(result.data?.transportation).toBeDefined();
      expect(result.data?.tips).toBeDefined();
    }, 15000);

    test('应该提供性能指标', async ({ unitContext }) => {
      const result = await travelPlanService.createTravelPlan(mockLLMResponse, testMetadata);

      expect(result.performance).toBeDefined();
      expect(result.performance?.duration).toBeLessThan(10000); // 10秒内完成
      expect(result.performance?.dataQuality).toBeGreaterThan(0.5);
    });
  });

  describe('数据服务测试', () => {
    test('应该成功获取住宿数据', async ({ unitContext }) => {
      const result = await travelDataService.getAccommodationData('哈尔滨');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.quality).toBeGreaterThan(0.3);
    }, 10000);

    test('应该成功获取美食数据', async ({ unitContext }) => {
      const result = await travelDataService.getFoodData('哈尔滨');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.quality).toBeGreaterThan(0.3);
    }, 10000);

    test('应该成功获取交通数据', async ({ unitContext }) => {
      const result = await travelDataService.getTransportData('哈尔滨');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.quality).toBeGreaterThan(0.8); // 交通数据质量应该很高
    }, 10000);

    test('应该成功获取天气数据', async ({ unitContext }) => {
      const result = await travelDataService.getTipsData('哈尔滨');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.quality).toBeGreaterThan(0.3);
    }, 10000);
  });

  describe('解析器测试', () => {
    test('应该成功解析LLM响应', async ({ unitContext }) => {
      const parser = new TravelPlanParserV2(mockLLMResponse);
      const result = await parser.parse(testMetadata);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.performance.parseTime).toBeLessThan(5000); // 5秒内完成解析
      expect(result.performance.successRate).toBeGreaterThan(0.5);
    });

    test('应该提供详细的解析统计', async ({ unitContext }) => {
      const parser = new TravelPlanParserV2(mockLLMResponse);
      const result = await parser.parse(testMetadata);
      const stats = parser.getParseStats(result);

      expect(stats.totalModules).toBe(4);
      expect(stats.architecture).toBe('simplified-v2');
      expect(stats.moduleStats).toHaveLength(4);
    });
  });

  describe('高德API服务测试', () => {
    test('应该通过健康检查', async ({ unitContext }) => {
      const health = await amapService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toBeDefined();
    });

    test('应该成功进行地理编码', async ({ unitContext }) => {
      const result = await amapService.geocode('哈尔滨');

      expect(result).toBeDefined();
      expect(result.address).toContain('哈尔滨');
    }, 8000);
  });

  describe('性能基准测试', () => {
    test('完整流程应该在合理时间内完成', async ({ unitContext }) => {
      const startTime = Date.now();
      
      const result = await travelPlanService.createTravelPlan(mockLLMResponse, testMetadata);
      
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(15000); // 15秒内完成
      
      console.log(`性能测试结果: ${duration}ms`);
    });

    test('并发处理能力测试', async ({ unitContext }) => {
      const promises = Array.from({ length: 3 }, (_, i) => 
        travelPlanService.createTravelPlan(mockLLMResponse, {
          ...testMetadata,
          id: `test-concurrent-${i}`,
        })
      );

      const results = await Promise.all(promises);
      
      expect(results.every(r => r.success)).toBe(true);
      console.log('并发测试通过');
    }, 30000);
  });

  describe('错误处理测试', () => {
    test('应该优雅处理空内容', async ({ unitContext }) => {
      const result = await travelPlanService.createTravelPlan('', testMetadata);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该优雅处理无效元数据', async ({ unitContext }) => {
      const invalidMetadata = {
        ...testMetadata,
        destination: '',
        totalDays: 0,
      };

      const result = await travelPlanService.createTravelPlan(mockLLMResponse, invalidMetadata);

      // 应该有警告但仍能处理
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('向后兼容性测试', () => {
    test('数据结构应该与原版兼容', async ({ unitContext }) => {
      const result = await travelPlanService.createTravelPlan(mockLLMResponse, testMetadata);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // 检查关键字段
      expect(result.data?.accommodation).toBeDefined();
      expect(result.data?.foodExperience).toBeDefined();
      expect(result.data?.transportation).toBeDefined();
      expect(result.data?.tips).toBeDefined();
      
      // 检查字段类型
      expect(typeof result.data?.id).toBe('string');
      expect(typeof result.data?.destination).toBe('string');
      expect(typeof result.data?.totalDays).toBe('number');
    });
  });

  describe('架构简化验证', () => {
    test('应该使用简化的服务架构', async ({ unitContext }) => {
      const serviceStats = travelPlanService.getServiceStats();

      expect(serviceStats.architecture).toBe('simplified');
      expect(serviceStats.dataSource).toBe('amap-unified');
    });

    test('应该减少外部依赖', async ({ unitContext }) => {
      const health = await travelPlanService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.config).toBeDefined();
    });
  });
});

// 性能基准测试
export const runPerformanceBenchmark = async () => {
  console.log('🚀 开始性能基准测试...');
  
  const service = new TravelPlanServiceV2();
  const iterations = 5;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    const result = await service.createTravelPlan(mockLLMResponse, {
      ...testMetadata,
      id: `benchmark-${i}`,
    });
    
    const duration = Date.now() - startTime;
    results.push({
      iteration: i + 1,
      duration,
      success: result.success,
      dataQuality: result.performance?.dataQuality || 0,
    });
    
    console.log(`第${i + 1}次: ${duration}ms, 成功: ${result.success}`);
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const successRate = results.filter(r => r.success).length / results.length;
  const avgQuality = results.reduce((sum, r) => sum + r.dataQuality, 0) / results.length;

  console.log('\n📊 性能基准测试结果:');
  console.log(`平均响应时间: ${avgDuration.toFixed(0)}ms`);
  console.log(`成功率: ${(successRate * 100).toFixed(1)}%`);
  console.log(`平均数据质量: ${(avgQuality * 100).toFixed(1)}%`);
  
  return {
    avgDuration,
    successRate,
    avgQuality,
    results,
  };
};

// 如果直接运行此文件
if (require.main === module) {
  runPerformanceBenchmark();
}
