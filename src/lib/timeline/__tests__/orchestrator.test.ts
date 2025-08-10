/**
 * Timeline解析架构 - Orchestrator单元测试
 */

import { TimelineOrchestrator, parseTimelineContent } from '../orchestrator';
import { createParseContext } from '../index';

describe('TimelineOrchestrator', () => {
  let orchestrator: TimelineOrchestrator;

  beforeEach(() => {
    orchestrator = new TimelineOrchestrator();
  });

  describe('JSON格式解析', () => {
    it('应该成功解析标准JSON格式', async () => {
      const jsonContent = `{
        "days": [
          {
            "day": 1,
            "title": "抵达哈尔滨",
            "segments": [
              {
                "period": "morning",
                "time": "09:00-12:00",
                "activities": [
                  {
                    "title": "中央大街",
                    "description": "漫步百年老街，感受欧式建筑风情",
                    "cost": 0
                  }
                ]
              }
            ]
          }
        ]
      }`;

      const context = createParseContext('哈尔滨', 1, 'test-session-1');
      const result = await orchestrator.parseTimeline(jsonContent, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('抵达哈尔滨');
      expect(result.data![0].segments).toHaveLength(1);
      expect(result.parser).toBe('JsonParser');
      expect(result.metadata?.structuredHit).toBe(true);
    });

    it('应该处理带有fenced code block的JSON', async () => {
      const jsonContent = `
        这是一个旅行计划：
        
        \`\`\`json
        {
          "days": [
            {
              "day": 1,
              "title": "第一天",
              "segments": [
                {
                  "period": "afternoon",
                  "time": "14:00-17:00",
                  "activities": [
                    {
                      "title": "景点游览",
                      "description": "参观当地景点"
                    }
                  ]
                }
              ]
            }
          ]
        }
        \`\`\`
      `;

      const context = createParseContext('测试城市', 1, 'test-session-2');
      const result = await orchestrator.parseTimeline(jsonContent, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.parser).toBe('JsonParser');
    });
  });

  describe('Markdown时间段格式解析', () => {
    it('应该成功解析Markdown时间段格式', async () => {
      const markdownContent = `
        Day 1：哈尔滨初体验
        
        **上午**
        - 中央大街漫步
        - 索菲亚大教堂参观
        
        **下午**
        - 松花江畔散步
        - 防洪纪念塔
        
        **晚上**
        - 东北菜晚餐
      `;

      const context = createParseContext('哈尔滨', 1, 'test-session-3');
      const result = await orchestrator.parseTimeline(markdownContent, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].segments.length).toBeGreaterThan(0);
      expect(result.parser).toBe('MarkdownPeriodParser');
    });
  });

  describe('数字列表格式解析', () => {
    it('应该成功解析数字列表格式', async () => {
      const numberedContent = `
        Day 1：长春深度游
        
        1. **早餐**：酒店自助早餐
        2. **上午**：净月潭国家森林公园
        3. **午餐**：东北菜餐厅
        4. **下午**：长影世纪城
        5. **晚餐**：特色烧烤
      `;

      const context = createParseContext('长春', 1, 'test-session-4');
      const result = await orchestrator.parseTimeline(numberedContent, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].segments.length).toBeGreaterThan(0);
      expect(result.parser).toBe('NumberedListParser');
    });
  });

  describe('启发式解析', () => {
    it('应该作为兜底方案解析任意格式', async () => {
      const randomContent = `
        今天我们要去哈尔滨旅游。
        早上先去中央大街看看。
        中午在当地餐厅吃饭。
        下午去松花江边走走。
        晚上回酒店休息。
      `;

      const context = createParseContext('哈尔滨', 1, 'test-session-5');
      const result = await orchestrator.parseTimeline(randomContent, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.parser).toBe('HeuristicTimeParser');
    });
  });

  describe('错误处理', () => {
    it('应该处理空内容', async () => {
      const context = createParseContext('测试城市', 1, 'test-session-6');
      const result = await orchestrator.parseTimeline('', context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('没有找到合适的解析器');
    });

    it('应该处理无效JSON', async () => {
      const invalidJson = '{ invalid json content }';
      const context = createParseContext('测试城市', 1, 'test-session-7');
      const result = await orchestrator.parseTimeline(invalidJson, context);

      // 应该回退到其他解析器
      expect(result.success).toBe(true);
      expect(result.parser).not.toBe('JsonParser');
    });
  });

  describe('解析器优先级', () => {
    it('应该优先使用JSON解析器', async () => {
      const mixedContent = `
        这是一个包含JSON的混合内容：
        
        \`\`\`json
        {
          "days": [
            {
              "day": 1,
              "title": "测试",
              "segments": [
                {
                  "period": "morning",
                  "time": "09:00-12:00",
                  "activities": [{"title": "活动", "description": "描述"}]
                }
              ]
            }
          ]
        }
        \`\`\`
        
        **上午**
        - 其他格式的内容
      `;

      const context = createParseContext('测试城市', 1, 'test-session-8');
      const result = await orchestrator.parseTimeline(mixedContent, context);

      expect(result.success).toBe(true);
      expect(result.parser).toBe('JsonParser'); // 应该优先使用JSON解析器
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成解析', async () => {
      const largeContent = `
        Day 1：大型内容测试
        
        **上午**
        ${'- 活动项目\n'.repeat(100)}
        
        **下午**
        ${'- 更多活动\n'.repeat(100)}
      `;

      const context = createParseContext('测试城市', 1, 'test-session-9');
      const startTime = Date.now();
      
      const result = await orchestrator.parseTimeline(largeContent, context);
      
      const parseTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(parseTime).toBeLessThan(5000); // 应该在5秒内完成
      expect(result.metadata?.parseTime).toBeLessThan(5000);
    });
  });
});

describe('便捷函数', () => {
  it('parseTimelineContent应该正常工作', async () => {
    const content = `{
      "days": [
        {
          "day": 1,
          "title": "测试",
          "segments": [
            {
              "period": "morning",
              "time": "09:00-12:00",
              "activities": [{"title": "活动", "description": "描述"}]
            }
          ]
        }
      ]
    }`;

    const context = createParseContext('测试城市', 1, 'test-session-10');
    const result = await parseTimelineContent(content, context);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
