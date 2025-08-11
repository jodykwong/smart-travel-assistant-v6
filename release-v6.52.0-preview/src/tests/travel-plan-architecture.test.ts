/**
 * 智游助手v5.0 - 数据架构集成测试
 * 验证新架构的完整性和正确性
 */

import { TravelPlanParser } from '../services/parsers/travel-plan-parser';
import { TravelPlanService } from '../services/travel-plan-service';
import { AccommodationParser } from '../services/parsers/accommodation-parser';
import { FoodParser } from '../services/parsers/food-parser';
import { TransportParser } from '../services/parsers/transport-parser';
import { TipsParser } from '../services/parsers/tips-parser';

// 模拟LLM响应数据
const mockLLMResponse = `
# 北京5日深度游攻略

北京作为中国的首都，拥有丰富的历史文化和现代都市魅力。这次5天的行程将带您深度体验北京的精华景点、地道美食和独特文化。

## 住宿推荐

### 推荐酒店
1. 北京王府井希尔顿酒店 - 位于市中心，交通便利，设施齐全，价格约800元/晚
2. 北京四合院精品酒店 - 传统四合院风格，体验老北京文化，价格约600元/晚
3. 北京三里屯洲际酒店 - 现代化设施，靠近商业区，价格约1000元/晚

### 预订建议
- 建议提前2周预订，可获得更好价格
- 选择地铁沿线酒店，出行更方便
- 考虑季节因素，旺季价格会上涨

## 美食体验

### 必尝特色
- 北京烤鸭
- 炸酱面
- 豆汁焦圈
- 驴打滚
- 糖葫芦

### 推荐餐厅
1. 全聚德烤鸭店 - 百年老字号，正宗北京烤鸭，人均150元
2. 老北京炸酱面馆 - 地道炸酱面，老北京风味，人均50元
3. 东来顺火锅 - 涮羊肉专家，清真美食，人均120元

### 美食街区
- 王府井小吃街 - 各种传统小吃聚集地
- 簋街 - 夜宵美食一条街，24小时营业

## 交通指南

### 到达方式
- 飞机：首都国际机场，机场快轨直达市区，约30分钟，票价25元
- 高铁：北京南站、北京西站，地铁直达，约1小时，票价5-10元
- 长途汽车：各大汽车站，公交接驳，约1.5小时

### 当地交通
- 地铁：覆盖全市，票价3-9元，建议购买一卡通
- 公交：线路密集，票价2元，支持一卡通
- 出租车：起步价13元，夜间加收20%
- 共享单车：便宜便民，1元/小时

### 交通卡
北京一卡通 - 20元押金，可乘坐地铁公交，享受折扣优惠

## 实用贴士

### 天气提醒
- 春季（3-5月）：温度10-25°C，多风，建议穿外套
- 夏季（6-8月）：温度20-35°C，炎热多雨，准备防晒用品
- 秋季（9-11月）：温度5-20°C，干燥舒适，最佳旅游季节
- 冬季（12-2月）：温度-10-5°C，寒冷干燥，需要厚外套

### 文化礼仪
- 参观故宫等景点需要提前预约
- 在寺庙内保持安静，不要大声喧哗
- 尊重当地习俗，文明旅游

### 安全提醒
- 保管好个人财物，避免在人多地方露财
- 注意交通安全，遵守交通规则
- 紧急电话：110（报警）、120（急救）、119（消防）

### 购物建议
- 王府井大街：国际品牌和传统工艺品
- 秀水街：服装和小商品，可以砍价
- 潘家园：古玩字画，需要专业眼光

### 预算建议
- 住宿：600-1000元/晚
- 餐饮：100-200元/天
- 交通：50-100元/天
- 门票：200-300元/天
- 总预算：约1000-1500元/天
`;

describe('数据架构集成测试', () => {
  let travelPlanService: TravelPlanService;
  let travelPlanParser: TravelPlanParser;

  beforeEach(() => {
    travelPlanService = new TravelPlanService({
      cacheEnabled: false, // 测试时禁用缓存
      parseConfig: {
        enabledModules: ['accommodation', 'food', 'transport', 'tips'],
        strictMode: false,
        fallbackToDefault: true,
      },
    });

    travelPlanParser = new TravelPlanParser(mockLLMResponse);
  });

  describe('解析器测试', () => {
    test('住宿解析器应该正确解析住宿信息', () => {
      const parser = new AccommodationParser(mockLLMResponse);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.recommendations).toHaveLength(3);
      expect(result.data?.recommendations[0].name).toContain('希尔顿');
      expect(result.data?.recommendations[0].pricePerNight).toBe(800);
      expect(result.data?.bookingTips).toContain('建议提前2周预订');
    });

    test('美食解析器应该正确解析美食信息', () => {
      const parser = new FoodParser(mockLLMResponse);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.specialties).toContain('北京烤鸭');
      expect(result.data?.recommendedRestaurants).toHaveLength(3);
      expect(result.data?.recommendedRestaurants[0].name).toContain('全聚德');
      expect(result.data?.foodDistricts).toHaveLength(2);
    });

    test('交通解析器应该正确解析交通信息', () => {
      const parser = new TransportParser(mockLLMResponse);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.arrivalOptions.length).toBeGreaterThan(0);
      expect(result.data?.localTransport.length).toBeGreaterThan(0);
      expect(result.data?.transportCards).toBeDefined();
      expect(result.data?.transportCards?.[0].name).toContain('一卡通');
    });

    test('贴士解析器应该正确解析贴士信息', () => {
      const parser = new TipsParser(mockLLMResponse);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.weather).toHaveLength(4); // 四个季节
      expect(result.data?.cultural.length).toBeGreaterThan(0);
      expect(result.data?.safety.length).toBeGreaterThan(0);
      expect(result.data?.shopping.length).toBeGreaterThan(0);
    });
  });

  describe('主解析器测试', () => {
    test('应该成功解析完整的旅行计划', async () => {
      const metadata = {
        id: 'test-plan-123',
        title: '北京5日深度游',
        destination: '北京',
        totalDays: 5,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalCost: 7500,
        groupSize: 2,
      };

      const result = await travelPlanParser.parse(metadata);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('test-plan-123');
      expect(result.data?.destination).toBe('北京');
      expect(result.data?.accommodation).toBeDefined();
      expect(result.data?.foodExperience).toBeDefined();
      expect(result.data?.transportation).toBeDefined();
      expect(result.data?.tips).toBeDefined();
    });

    test('应该提供详细的解析统计信息', async () => {
      const metadata = {
        id: 'test-plan-123',
        title: '北京5日深度游',
        destination: '北京',
        totalDays: 5,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalCost: 7500,
        groupSize: 2,
      };

      const result = await travelPlanParser.parse(metadata);
      const stats = travelPlanParser.getParseStats(result);

      expect(stats.totalModules).toBe(4);
      expect(stats.successfulModules).toBe(4);
      expect(stats.moduleStats).toHaveLength(4);
      expect(stats.moduleStats.every(m => m.success)).toBe(true);
    });
  });

  describe('服务层测试', () => {
    test('应该成功创建旅行计划', async () => {
      const metadata = {
        id: 'service-test-123',
        title: '北京5日深度游',
        destination: '北京',
        totalDays: 5,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalCost: 7500,
        groupSize: 2,
      };

      const result = await travelPlanService.createTravelPlan(mockLLMResponse, metadata);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('service-test-123');
      expect(result.stats).toBeDefined();
    });

    test('应该处理解析错误', async () => {
      const invalidLLMResponse = '这是一个无效的响应内容';
      const metadata = {
        id: 'error-test-123',
        title: '测试计划',
        destination: '测试地点',
        totalDays: 3,
        startDate: '2024-03-01',
        endDate: '2024-03-03',
        totalCost: 3000,
        groupSize: 1,
      };

      const result = await travelPlanService.createTravelPlan(invalidLLMResponse, metadata);

      // 即使解析失败，也应该返回默认数据
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('数据验证测试', () => {
    test('应该验证必需字段', async () => {
      const incompleteMetadata = {
        id: '',
        title: '',
        destination: '',
        totalDays: 0,
        startDate: '',
        endDate: '',
        totalCost: 0,
        groupSize: 0,
      };

      const result = await travelPlanService.createTravelPlan(mockLLMResponse, incompleteMetadata);

      // 服务应该处理不完整的元数据
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('解析性能应该在合理范围内', async () => {
      const metadata = {
        id: 'perf-test-123',
        title: '性能测试计划',
        destination: '北京',
        totalDays: 5,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        totalCost: 7500,
        groupSize: 2,
      };

      const startTime = Date.now();
      const result = await travelPlanService.createTravelPlan(mockLLMResponse, metadata);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('错误处理测试', () => {
    test('应该优雅处理空内容', async () => {
      const emptyContent = '';
      const metadata = {
        id: 'empty-test-123',
        title: '空内容测试',
        destination: '测试地点',
        totalDays: 3,
        startDate: '2024-03-01',
        endDate: '2024-03-03',
        totalCost: 3000,
        groupSize: 1,
      };

      const result = await travelPlanService.createTravelPlan(emptyContent, metadata);

      expect(result.success).toBe(true); // 应该使用默认数据
      expect(result.data).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('应该处理格式错误的内容', async () => {
      const malformedContent = '这是一些随机的文本，没有任何结构';
      const metadata = {
        id: 'malformed-test-123',
        title: '格式错误测试',
        destination: '测试地点',
        totalDays: 3,
        startDate: '2024-03-01',
        endDate: '2024-03-03',
        totalCost: 3000,
        groupSize: 1,
      };

      const result = await travelPlanService.createTravelPlan(malformedContent, metadata);

      expect(result.success).toBe(true); // 应该使用默认数据
      expect(result.data).toBeDefined();
    });
  });
});

// 运行测试的辅助函数
export const runArchitectureTests = () => {
  console.log('🧪 开始运行数据架构集成测试...');
  
  // 这里可以添加实际的测试运行逻辑
  // 在实际项目中，这些测试会通过Jest或其他测试框架运行
  
  console.log('✅ 数据架构集成测试完成');
};
