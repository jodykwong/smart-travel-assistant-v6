/**
 * 集成测试
 * 测试整个时间线解析系统的端到端功能
 */

import { TimelineParsingService } from '../timeline-parsing-service';
import { REAL_LLM_RESPONSES } from './test-utils';

describe('时间线解析系统集成测试', () => {
  let service: TimelineParsingService;

  beforeEach(() => {
    service = new TimelineParsingService();
  });

  describe('TimelineParsingService', () => {
    it('应该能够解析真实的LLM响应', async () => {
      const result = await service.parseTimeline(
        REAL_LLM_RESPONSES.CHENGDU_DAY1,
        { destination: '成都' }
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(3);
      
      const activities = result.data!;
      expect(activities[0].period).toBe('上午');
      expect(activities[1].period).toBe('下午');
      expect(activities[2].period).toBe('晚上');
    });

    it('应该支持向后兼容的API', () => {
      const activities = service.parseTimelineActivities(
        REAL_LLM_RESPONSES.BEIJING_DAY1,
        '北京'
      );

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
      
      activities.forEach(activity => {
        expect(activity.title).toBeDefined();
        expect(activity.period).toBeDefined();
        expect(activity.time).toBeDefined();
      });
    });

    it('应该提供解析器统计信息', () => {
      const stats = service.getParserStats();
      
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      
      stats.forEach(stat => {
        expect(stat.name).toBeDefined();
        expect(typeof stat.priority).toBe('number');
        expect(typeof stat.canHandle).toBe('function');
      });
    });

    it('应该能够测试解析器能力', () => {
      const testResults = service.testParsers(REAL_LLM_RESPONSES.MIXED_FORMAT);
      
      expect(Array.isArray(testResults)).toBe(true);
      expect(testResults.length).toBeGreaterThan(0);
      
      // 至少应该有一个解析器能处理混合格式
      expect(testResults.some(r => r.canHandle)).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量数据', async () => {
      const largeContent = REAL_LLM_RESPONSES.CHENGDU_DAY1.repeat(10);
      
      const startTime = Date.now();
      const result = await service.parseTimeline(largeContent, { destination: '成都' });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('错误处理', () => {
    it('应该优雅地处理各种错误情况', async () => {
      const errorCases = [
        null,
        undefined,
        '',
        '   ',
        '无效的内容格式',
        '🚀🎉💯' // 只有emoji的内容
      ];

      for (const errorCase of errorCases) {
        const result = await service.parseTimeline(
          errorCase as any,
          { destination: '测试城市' }
        );

        // 即使出错，也应该有合理的响应
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        
        if (!result.success) {
          expect(Array.isArray(result.errors)).toBe(true);
          expect(result.errors!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('特性开关测试', () => {
    it('应该支持特性开关控制', async () => {
      // 测试新解析器开关
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'true';
      
      const result1 = await service.parseTimeline(
        REAL_LLM_RESPONSES.BEIJING_DAY1,
        { destination: '北京' }
      );
      
      expect(result1.success).toBe(true);
      
      // 测试兼容模式
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'false';
      
      const result2 = await service.parseTimeline(
        REAL_LLM_RESPONSES.BEIJING_DAY1,
        { destination: '北京' }
      );
      
      expect(result2.success).toBe(true);
      
      // 清理环境变量
      delete process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER;
    });
  });
});
