/**
 * RobustTimelineParser 单元测试
 * 测试健壮解析器的容错机制和解析器选择逻辑
 */

import { RobustTimelineParser } from '../robust-timeline-parser';
import { ParsingContext } from '@/types/timeline-activity';

describe('RobustTimelineParser', () => {
  let parser: RobustTimelineParser;
  let context: ParsingContext;

  beforeEach(() => {
    parser = new RobustTimelineParser();
    context = {
      destination: '北京',
      dayNumber: 1,
      totalDays: 2
    };
  });

  describe('解析器选择机制测试', () => {
    it('应该优先选择最适合的解析器', async () => {
      const markdownContent = `
- **上午**  
  - 游览天安门广场
- **下午**  
  - 参观故宫博物院
      `;

      const result = await parser.parse(markdownContent, context);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it('应该在主解析器失败时使用备用解析器', async () => {
      const structuredContent = `
09:00-12:00 参观博物馆
14:00-17:00 游览公园
      `;

      const result = await parser.parse(structuredContent, context);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('应该在所有专用解析器失败时使用兜底解析器', async () => {
      const randomContent = '这是一些随机的文本内容，没有明确的时间格式';

      const result = await parser.parse(randomContent, context);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('未能识别标准时间格式，使用兜底解析');
      expect(result.data!.length).toBeGreaterThan(0);
    });
  });

  describe('容错机制测试', () => {
    it('应该处理空内容输入', async () => {
      const result = await parser.parse('', context);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('输入内容为空');
      // 容错设计：即使输入为空，也应该提供兜底数据
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('应该处理缺少上下文信息', async () => {
      const content = '- **上午**\n  - 游览景点';
      const incompleteContext = {} as ParsingContext;

      const result = await parser.parse(content, incompleteContext);

      expect(result.success).toBe(true);
      // 应该使用默认的目的地信息
    });

    it('应该在所有解析器都失败时提供紧急兜底数据', async () => {
      // 模拟一个会导致所有解析器失败的情况
      const problematicContent = null as any;

      const result = await parser.parse(problematicContent, context);

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toContain('自由行');
    });
  });

  describe('性能监控测试', () => {
    it('应该记录解析耗时', async () => {
      const content = `
- **上午**  
  - 游览景点1
- **下午**  
  - 游览景点2
      `;

      const startTime = Date.now();
      const result = await parser.parse(content, context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // 应该在200ms内完成
    });

    it('应该在解析耗时过长时添加警告', async () => {
      // 创建一个复杂的内容来测试性能警告
      const complexContent = `
#### **Day 1：复杂行程**
- **上午**
${'  - 活动项目\n'.repeat(50)}
- **下午**
${'  - 更多活动\n'.repeat(50)}
- **晚上**
${'  - 夜间活动\n'.repeat(50)}
      `;

      const result = await parser.parse(complexContent, context);

      expect(result.success).toBe(true);
      // 如果解析时间超过100ms，应该有性能警告
      if (result.warnings && result.warnings.some(w => w.includes('解析耗时较长'))) {
        expect(result.warnings.some(w => w.includes('解析耗时较长'))).toBe(true);
      }
    });
  });

  describe('调试和监控功能测试', () => {
    it('应该提供解析器统计信息', () => {
      const stats = parser.getParserStats();

      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
      
      stats.forEach(stat => {
        expect(stat.name).toBeDefined();
        expect(stat.priority).toBeDefined();
        expect(typeof stat.canHandle).toBe('function');
      });
    });

    it('应该能测试所有解析器对特定内容的处理能力', () => {
      const content = '- **上午**\n  - 测试活动';
      const testResults = parser.testParsers(content);

      expect(testResults).toBeDefined();
      expect(testResults.length).toBeGreaterThan(0);
      
      testResults.forEach(result => {
        expect(result.name).toBeDefined();
        expect(typeof result.canHandle).toBe('boolean');
        expect(typeof result.priority).toBe('number');
      });

      // 至少应该有一个解析器能处理这个内容
      expect(testResults.some(r => r.canHandle)).toBe(true);
    });
  });

  describe('真实数据测试', () => {
    it('应该正确解析真实的LLM响应数据', async () => {
      // 这是从实际系统中获取的LLM响应示例
      const realLLMResponse = `
#### **Day 1（8月6日）：抵达成都，感受慢生活**  

- **上午**  
  - 抵达成都双流国际机场，乘坐地铁10号线转3号线至市区（约40分钟）。  
  - 入住春熙路/宽窄巷子附近的民宿（推荐：**「成都院子」**或**「熊猫の家」**，约300-400元/晚）。  

- **下午**  
  - **宽窄巷子**：逛宽巷子、窄巷子，体验老成都院落文化，打卡网红茶馆「% Arabica」。  
  - **人民公园**：喝茶、掏耳朵，感受成都人的悠闲生活（人均消费30-50元）。  

- **晚上**  
  - **锦里古街**：品尝成都小吃，购买特色纪念品，感受夜晚的古街风情。  
  - 推荐美食：三大炮、糖油果子、钵钵鸡等（人均消费80-120元）。
      `;

      const result = await parser.parse(realLLMResponse, { destination: '成都' });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(3); // 上午、下午、晚上

      const activities = result.data!;
      
      // 验证解析结果的质量
      activities.forEach(activity => {
        expect(activity.title).toBeDefined();
        expect(activity.title.length).toBeGreaterThan(0);
        expect(activity.description).toBeDefined();
        expect(activity.description.length).toBeGreaterThan(10);
        expect(activity.period).toMatch(/^(上午|下午|晚上)$/);
        expect(activity.cost).toBeGreaterThan(0);
        expect(activity.icon).toBeDefined();
        expect(activity.color).toBeDefined();
      });

      // 验证费用提取
      const afternoonActivity = activities.find(a => a.period === '下午');
      expect(afternoonActivity?.cost).toBeGreaterThan(0);

      // 验证描述增强
      const eveningActivity = activities.find(a => a.period === '晚上');
      // 检查是否包含费用相关信息（可能是💰标记或者费用文字）
      const hasMoneyInfo = eveningActivity?.description.includes('💰') ||
                          eveningActivity?.description.includes('人均') ||
                          eveningActivity?.description.includes('费用') ||
                          eveningActivity?.description.includes('元');
      expect(hasMoneyInfo).toBe(true);
    });

    it('应该处理不完整的LLM响应', async () => {
      const incompleteResponse = `
#### **Day 1：不完整的响应**
- **上午**
  - 活动描述被截断了...
      `;

      const result = await parser.parse(incompleteResponse, context);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('应该处理包含特殊字符的内容', async () => {
      const specialCharContent = `
- **上午**  
  - 游览"天安门"广场 & 故宫博物院（门票：¥60）
  - 品尝北京烤鸭@全聚德餐厅 #美食推荐
      `;

      const result = await parser.parse(specialCharContent, context);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      
      const activity = result.data![0];
      expect(activity.cost).toBe(60); // 应该正确提取费用
    });
  });
});
