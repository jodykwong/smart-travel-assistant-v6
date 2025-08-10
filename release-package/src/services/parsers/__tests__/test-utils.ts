/**
 * 测试工具函数
 * 提供测试中常用的辅助函数和模拟数据
 */

import { ParsingContext, TimelineActivity } from '@/types/timeline-activity';

/**
 * 创建测试用的解析上下文
 */
export function createTestContext(overrides: Partial<ParsingContext> = {}): ParsingContext {
  return {
    destination: '测试城市',
    dayNumber: 1,
    totalDays: 3,
    ...overrides
  };
}

/**
 * 验证TimelineActivity对象的基本结构
 */
export function validateTimelineActivity(activity: TimelineActivity): void {
  expect(activity).toBeDefined();
  expect(activity.time).toBeDefined();
  expect(activity.period).toBeDefined();
  expect(activity.title).toBeDefined();
  expect(activity.description).toBeDefined();
  expect(activity.icon).toBeDefined();
  expect(typeof activity.cost).toBe('number');
  expect(activity.duration).toBeDefined();
  expect(activity.color).toBeDefined();
}

/**
 * 验证TimelineActivity数组的基本结构
 */
export function validateTimelineActivities(activities: TimelineActivity[]): void {
  expect(Array.isArray(activities)).toBe(true);
  activities.forEach(validateTimelineActivity);
}

/**
 * 测试用的真实LLM响应数据
 */
export const REAL_LLM_RESPONSES = {
  CHENGDU_DAY1: `
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
  `,

  BEIJING_DAY1: `
#### **Day 1：北京经典一日游**

- **上午**
  - 08:00-09:00 前往天安门广场，建议地铁1号线天安门东站下车
  - 09:00-12:00 游览天安门广场和故宫博物院，门票60元

- **下午**  
  - 14:00-17:00 参观景山公园，俯瞰紫禁城全景，门票2元
  - 17:00-18:00 漫步什刹海，感受老北京胡同文化

- **晚上**
  - 19:00-21:00 品尝北京烤鸭，推荐全聚德或便宜坊，人均150-200元
  `,

  STRUCTURED_TIME: `
09:00-12:00 参观博物馆，了解当地历史文化
12:00-13:00 午餐时间，品尝当地特色菜
14:00-17:00 游览城市公园，享受自然风光
19:00-21:00 夜市美食之旅，体验当地夜生活
  `,

  MIXED_FORMAT: `
#### **混合格式测试**
- **上午**
  - 自由活动时间
  
14:00-16:00 下午茶时间

- **晚上**
  - 19点-21点 晚餐和夜游
  `,

  INCOMPLETE_CONTENT: `
#### **Day 1：不完整内容**
- **上午**
  - 活动描述被截断了
  `,

  EMPTY_TIME_BLOCKS: `
- **上午**
  
- **下午**
  - 有内容的时间段
  
- **晚上**
  
  `,

  NO_TIME_MARKERS: `
这是一段没有明确时间标记的旅行描述。
包含了一些景点和活动的介绍，但是格式比较自由。
可能需要使用兜底解析器来处理。
  `
};

/**
 * 性能测试辅助函数
 */
export async function measureParseTime<T>(
  parseFunction: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await parseFunction();
  const endTime = Date.now();
  
  return {
    result,
    duration: endTime - startTime
  };
}

/**
 * 创建大量测试数据
 */
export function createLargeTestContent(timeBlocks: number = 10, activitiesPerBlock: number = 5): string {
  const periods = ['上午', '下午', '晚上'];
  let content = '#### **大量数据测试**\n\n';
  
  for (let i = 0; i < timeBlocks; i++) {
    const period = periods[i % periods.length];
    content += `- **${period}**\n`;
    
    for (let j = 0; j < activitiesPerBlock; j++) {
      content += `  - 测试活动 ${i}-${j}：这是一个测试活动的描述\n`;
    }
    content += '\n';
  }
  
  return content;
}
