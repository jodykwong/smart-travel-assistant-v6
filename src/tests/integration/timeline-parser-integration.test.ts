/**
 * 时间线解析器集成测试
 * 验证新解析器与现有系统的集成稳定性
 */

import { TimelineParsingService } from '@/services/parsers';
import { REAL_LLM_RESPONSES } from '@/services/parsers/__tests__/test-utils';

describe('时间线解析器集成测试', () => {
  describe('服务集成测试', () => {
    it('TC-INT-001: 应该正确解析LLM响应', async () => {
      const service = new TimelineParsingService();
      const mockLLMResponse = REAL_LLM_RESPONSES.CHENGDU_DAY1;

      const result = await service.parseTimeline(mockLLMResponse, { destination: '成都' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(3); // 上午、下午、晚上

      const periods = result.data!.map(a => a.period);
      expect(periods).toContain('上午');
      expect(periods).toContain('下午');
      expect(periods).toContain('晚上');
    });

    it('TC-INT-002: 应该处理解析失败的情况', async () => {
      const service = new TimelineParsingService();

      const result = await service.parseTimeline('', { destination: '成都' });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('向后兼容性测试', () => {
    it('TC-INT-003: 原有parseTimelineActivities函数应该正常工作', () => {
      const service = new TimelineParsingService();
      
      const dayContent = `
      - **上午**
        - 游览天安门广场
        - 参观故宫博物院，门票60元
      - **下午**  
        - 品尝北京烤鸭
        - 逛王府井大街
      `;
      
      const activities = service.parseTimelineActivities(dayContent, '北京');
      
      expect(activities).toHaveLength(2);
      expect(activities[0].period).toBe('上午');
      expect(activities[1].period).toBe('下午');
      expect(activities[0].cost).toBe(60);
    });

    it('TC-INT-004: 应该保持相同的数据结构', () => {
      const service = new TimelineParsingService();
      const activities = service.parseTimelineActivities(
        REAL_LLM_RESPONSES.BEIJING_DAY1, 
        '北京'
      );

      activities.forEach(activity => {
        expect(activity).toHaveProperty('time');
        expect(activity).toHaveProperty('period');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('icon');
        expect(activity).toHaveProperty('cost');
        expect(activity).toHaveProperty('duration');
        expect(activity).toHaveProperty('color');
      });
    });
  });

  describe('特性开关测试', () => {
    it('TC-INT-005: 应该根据环境变量选择解析器', async () => {
      const service = new TimelineParsingService();
      const testContent = REAL_LLM_RESPONSES.MIXED_FORMAT;
      const context = { destination: '测试城市' };

      // 测试新解析器
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'true';
      const result1 = await service.parseTimeline(testContent, context);
      
      // 测试兼容模式
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'false';
      const result2 = await service.parseTimeline(testContent, context);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // 清理环境变量
      delete process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER;
    });

    it('TC-INT-006: 特性开关切换应该无缝进行', async () => {
      const service = new TimelineParsingService();
      const testContent = REAL_LLM_RESPONSES.STRUCTURED_TIME;
      const context = { destination: '测试城市' };

      // 多次切换特性开关
      for (let i = 0; i < 5; i++) {
        process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = i % 2 === 0 ? 'true' : 'false';
        
        const result = await service.parseTimeline(testContent, context);
        expect(result.success).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      }
      
      delete process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER;
    });
  });

  describe('数据一致性测试', () => {
    it('TC-INT-007: 新旧解析器结果应该基本一致', async () => {
      const service = new TimelineParsingService();
      const testContent = REAL_LLM_RESPONSES.CHENGDU_DAY1;
      const context = { destination: '成都' };

      // 使用新解析器
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'true';
      const newResult = await service.parseTimeline(testContent, context);
      
      // 使用旧解析器（兼容模式）
      process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER = 'false';
      const oldResult = await service.parseTimeline(testContent, context);

      expect(newResult.success).toBe(true);
      expect(oldResult.success).toBe(true);
      
      // 验证活动数量基本一致（允许±1的差异）
      const countDiff = Math.abs(newResult.data.length - oldResult.data.length);
      expect(countDiff).toBeLessThanOrEqual(1);
      
      // 验证时间段覆盖一致
      const newPeriods = new Set(newResult.data.map(a => a.period));
      const oldPeriods = new Set(oldResult.data.map(a => a.period));
      const intersection = new Set([...newPeriods].filter(p => oldPeriods.has(p)));
      
      expect(intersection.size).toBeGreaterThanOrEqual(Math.min(newPeriods.size, oldPeriods.size) * 0.8);
      
      delete process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER;
    });
  });

  describe('错误处理集成测试', () => {
    it('TC-INT-008: 应该优雅处理解析错误', async () => {
      const service = new TimelineParsingService();
      
      const errorCases = [
        { input: '', description: '空内容' },
        { input: null, description: 'null内容' },
        { input: '🚀🎉💯', description: '只有emoji' },
        { input: 'A'.repeat(50000), description: '超长内容' }
      ];

      for (const testCase of errorCases) {
        const result = await service.parseTimeline(
          testCase.input as any, 
          { destination: '测试城市' }
        );

        // 即使输入有问题，也应该有合理的响应
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        
        if (!result.success) {
          expect(Array.isArray(result.errors)).toBe(true);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
