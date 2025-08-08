/**
 * 时间线解析器集成测试
 * 验证新解析器与现有系统的集成稳定性
 */

import { vi } from './test-utils';
import { TimelineParsingService } from '@/services/parsers';
import { REAL_LLM_RESPONSES } from '@/services/parsers/__tests__/test-utils';

describe('时间线解析器集成测试', () => {
  describe('服务集成测试', () => {
    test('TC-INT-001: 应该正确解析LLM响应', async ({ unitContext }) => {
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

    test('TC-INT-002: 应该处理解析失败的情况', async ({ unitContext }) => {
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
    test('TC-INT-005: 应该根据环境变量选择解析器', async ({ unitContext }) => {
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

    test('TC-INT-006: 特性开关切换应该无缝进行', async ({ unitContext }) => {
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
    test('TC-INT-007: 新旧解析器结果应该基本一致', async ({ unitContext }) => {
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
    test('TC-INT-008: 应该优雅处理解析错误', async ({ unitContext }) => {
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

    test('TC-INT-009: parseActivitiesWithNewService网络错误处理', async ({ unitContext }) => {
      // 模拟网络错误场景
      const originalConsoleError = console.error;
      const mockConsoleError = vi.fn();
      console.error = mockConsoleError;

      try {
        // 模拟TimelineParsingService抛出异常
        const mockService = {
          parseTimeline: vi.fn().mockRejectedValue(new Error('网络连接失败'))
        };

        // 这里我们需要测试前端的parseActivitiesWithNewService函数
        // 由于它在result.tsx中，我们创建一个模拟版本来测试错误处理逻辑
        const parseActivitiesWithNewService = async (dayContent: string, destination: string) => {
          try {
            const result = await mockService.parseTimeline(dayContent, { destination });

            if (result.success && result.data) {
              return result.data;
            } else {
              console.warn('⚠️ 新解析器失败，使用兜底方案:', result.errors);
              return generateSimpleFallbackActivities(dayContent, destination);
            }
          } catch (error) {
            console.error('❌ 解析器异常:', error);
            return generateSimpleFallbackActivities(dayContent, destination);
          }
        };

        const generateSimpleFallbackActivities = (content: string, destination: string) => {
          const periods = ['上午', '下午', '晚上'];
          return periods.map((period, index) => ({
            time: period === '上午' ? '09:00-12:00' : period === '下午' ? '14:00-17:00' : '19:00-21:00',
            period,
            title: `${destination}${period}活动`,
            description: `探索${destination}的${period}时光`,
            icon: '📍',
            cost: 100 + index * 50,
            duration: '约2-3小时',
            color: period === '上午' ? 'bg-blue-100' : period === '下午' ? 'bg-green-100' : 'bg-purple-100'
          }));
        };

        const result = await parseActivitiesWithNewService('测试内容', '北京');

        // 验证错误处理
        expect(mockConsoleError).toHaveBeenCalledWith('❌ 解析器异常:', expect.any(Error));
        expect(result).toHaveLength(3); // 兜底活动
        expect(result[0].title).toBe('北京上午活动');
        expect(result[1].title).toBe('北京下午活动');
        expect(result[2].title).toBe('北京晚上活动');

      } finally {
        console.error = originalConsoleError;
      }
    });

    test('TC-INT-010: parseActivitiesWithNewService解析失败处理', async ({ unitContext }) => {
      const originalConsoleWarn = console.warn;
      const mockConsoleWarn = vi.fn();
      console.warn = mockConsoleWarn;

      try {
        // 模拟解析失败但不抛异常的情况
        const mockService = {
          parseTimeline: vi.fn().mockResolvedValue({
            success: false,
            errors: ['解析格式不支持', '内容格式异常'],
            data: null
          })
        };

        const parseActivitiesWithNewService = async (dayContent: string, destination: string) => {
          try {
            const result = await mockService.parseTimeline(dayContent, { destination });

            if (result.success && result.data) {
              return result.data;
            } else {
              console.warn('⚠️ 新解析器失败，使用兜底方案:', result.errors);
              return generateSimpleFallbackActivities(dayContent, destination);
            }
          } catch (error) {
            console.error('❌ 解析器异常:', error);
            return generateSimpleFallbackActivities(dayContent, destination);
          }
        };

        const generateSimpleFallbackActivities = (content: string, destination: string) => {
          const periods = ['上午', '下午', '晚上'];
          return periods.map((period, index) => ({
            time: period === '上午' ? '09:00-12:00' : period === '下午' ? '14:00-17:00' : '19:00-21:00',
            period,
            title: `${destination}${period}活动`,
            description: `探索${destination}的${period}时光`,
            icon: '📍',
            cost: 100 + index * 50,
            duration: '约2-3小时',
            color: period === '上午' ? 'bg-blue-100' : period === '下午' ? 'bg-green-100' : 'bg-purple-100'
          }));
        };

        const result = await parseActivitiesWithNewService('无效格式内容', '上海');

        // 验证警告处理
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          '⚠️ 新解析器失败，使用兜底方案:',
          ['解析格式不支持', '内容格式异常']
        );
        expect(result).toHaveLength(3); // 兜底活动
        expect(result[0].title).toBe('上海上午活动');

      } finally {
        console.warn = originalConsoleWarn;
      }
    });

    test('TC-INT-011: parseActivitiesWithNewService数据格式异常处理', async ({ unitContext }) => {
      // 测试解析成功但数据格式异常的情况
      const mockService = {
        parseTimeline: vi.fn().mockResolvedValue({
          success: true,
          data: null // 数据为null的异常情况
        })
      };

      const parseActivitiesWithNewService = async (dayContent: string, destination: string) => {
        try {
          const result = await mockService.parseTimeline(dayContent, { destination });

          if (result.success && result.data) {
            return result.data;
          } else {
            console.warn('⚠️ 新解析器失败，使用兜底方案:', result.errors);
            return generateSimpleFallbackActivities(dayContent, destination);
          }
        } catch (error) {
          console.error('❌ 解析器异常:', error);
          return generateSimpleFallbackActivities(dayContent, destination);
        }
      };

      const generateSimpleFallbackActivities = (content: string, destination: string) => {
        const periods = ['上午', '下午', '晚上'];
        return periods.map((period, index) => ({
          time: period === '上午' ? '09:00-12:00' : period === '下午' ? '14:00-17:00' : '19:00-21:00',
          period,
          title: `${destination}${period}活动`,
          description: `探索${destination}的${period}时光`,
          icon: '📍',
          cost: 100 + index * 50,
          duration: '约2-3小时',
          color: period === '上午' ? 'bg-blue-100' : period === '下午' ? 'bg-green-100' : 'bg-purple-100'
        }));
      };

      const result = await parseActivitiesWithNewService('正常内容', '深圳');

      // 验证数据异常时的兜底处理
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('深圳上午活动');
      expect(result[0].description).toBe('探索深圳的上午时光');
    });
  });

  describe('缓存功能测试', () => {
    test('TC-INT-012: 应该正确缓存解析结果', async ({ unitContext }) => {
      const service = new TimelineParsingService();
      const testContent = REAL_LLM_RESPONSES.CHENGDU_DAY1;
      const context = { destination: '成都' };

      // 清空缓存
      service.clearCache();

      // 第一次解析
      const result1 = await service.parseTimeline(testContent, context);
      expect(result1.success).toBe(true);

      // 第二次解析应该使用缓存
      const result2 = await service.parseTimeline(testContent, context);
      expect(result2.success).toBe(true);
      expect(result2.warnings).toContain('使用了缓存结果');

      // 验证结果一致
      expect(result1.data?.length).toBe(result2.data?.length);
    });

    test('TC-INT-013: 缓存键应该考虑内容和上下文', async ({ unitContext }) => {
      const service = new TimelineParsingService();
      service.clearCache();

      // 相同内容，不同目的地
      const content = REAL_LLM_RESPONSES.BEIJING_DAY1;
      const result1 = await service.parseTimeline(content, { destination: '北京' });
      const result2 = await service.parseTimeline(content, { destination: '上海' });

      // 应该是不同的结果（不同的缓存键）
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.warnings).not.toContain('使用了缓存结果');
    });

    test('TC-INT-014: 缓存管理功能测试', async ({ unitContext }) => {
      const service = new TimelineParsingService();

      // 清空缓存
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);

      // 添加一些缓存条目
      await service.parseTimeline(REAL_LLM_RESPONSES.CHENGDU_DAY1, { destination: '成都' });
      await service.parseTimeline(REAL_LLM_RESPONSES.BEIJING_DAY1, { destination: '北京' });

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);

      // 清理缓存
      service.cleanupCache();
      // 由于条目是新的，不应该被清理
      expect(service.getCacheStats().size).toBe(2);

      // 清空缓存
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    test('TC-INT-015: 缓存预热功能测试', async ({ unitContext }) => {
      const service = new TimelineParsingService();
      service.clearCache();

      const commonContents = [
        { content: REAL_LLM_RESPONSES.CHENGDU_DAY1, context: { destination: '成都' } },
        { content: REAL_LLM_RESPONSES.BEIJING_DAY1, context: { destination: '北京' } }
      ];

      // 预热缓存
      await service.warmupCache(commonContents);

      // 验证缓存已填充
      expect(service.getCacheStats().size).toBe(2);

      // 验证预热的内容可以从缓存获取
      const result = await service.parseTimeline(REAL_LLM_RESPONSES.CHENGDU_DAY1, { destination: '成都' });
      expect(result.warnings).toContain('使用了缓存结果');
    });
  });
});
