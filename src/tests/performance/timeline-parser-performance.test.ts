/**
 * 时间线解析器性能测试
 * 评估解析器在高并发和大数据量场景下的性能表现
 */

import { TimelineParsingService } from '@/services/parsers';
import { REAL_LLM_RESPONSES, createLargeTestContent } from '@/services/parsers/__tests__/test-utils';

// 性能测试配置
const PERFORMANCE_CONFIG = {
  TARGET_PARSE_TIME: 100, // ms
  MAX_ACCEPTABLE_TIME: 200, // ms
  MEMORY_LIMIT: 50, // MB
  TEST_ITERATIONS: 1000,
  CONCURRENT_REQUESTS: 100
};

// 性能测试工具函数
const measurePerformance = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number; memory: number }> => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const result = await fn();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  return {
    result,
    duration: endTime - startTime,
    memory: (endMemory - startMemory) / 1024 / 1024 // MB
  };
};

describe('时间线解析器性能测试', () => {
  let service: TimelineParsingService;

  beforeEach(() => {
    service = new TimelineParsingService();
  });

  describe('单次解析性能测试', () => {
    it('PERF-001: 标准内容解析应在100ms内完成', async () => {
      const testData = REAL_LLM_RESPONSES.CHENGDU_DAY1;
      const context = { destination: '成都' };

      const { result, duration } = await measurePerformance(async () => {
        return await service.parseTimeline(testData, context);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.TARGET_PARSE_TIME);
      
      console.log(`✅ 标准解析耗时: ${duration.toFixed(2)}ms`);
    });

    it('PERF-002: 大文本解析性能测试', async () => {
      const largeContent = createLargeTestContent(20, 10); // 20个时间段，每段10个活动
      const context = { destination: '测试城市' };

      const { result, duration } = await measurePerformance(async () => {
        return await service.parseTimeline(largeContent, context);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);
      
      console.log(`✅ 大文本解析耗时: ${duration.toFixed(2)}ms, 内容长度: ${largeContent.length}`);
    });

    it('PERF-003: 复杂格式解析性能测试', async () => {
      const complexContent = `
        #### **Day 1：复杂格式测试**
        - **上午**
          - 09:00-10:30 活动1，费用¥100，建议提前预订
          - 10:45-12:00 活动2，包含交通费用
        - **下午**
          - 14点-16点 活动3，注意天气变化
          - 16:30-18:00 活动4，推荐携带相机
        - **晚上**
          - 19:00~21:30 活动5，人均消费150元
          - 22:00 返回酒店休息
      `;

      const { result, duration } = await measurePerformance(async () => {
        return await service.parseTimeline(complexContent, { destination: '测试城市' });
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.TARGET_PARSE_TIME);
      
      console.log(`✅ 复杂格式解析耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('并发性能测试', () => {
    it('PERF-004: 应该支持100+并发请求', async () => {
      const testData = REAL_LLM_RESPONSES.BEIJING_DAY1;
      const context = { destination: '北京' };

      // 创建100个并发请求
      const promises = Array.from({ length: PERFORMANCE_CONFIG.CONCURRENT_REQUESTS }, (_, index) =>
        measurePerformance(async () => {
          return await service.parseTimeline(testData, { ...context, requestId: index });
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // 验证所有请求都成功
      results.forEach((result, index) => {
        expect(result.result.success).toBe(true);
        expect(result.duration).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);
      });

      // 验证平均响应时间
      const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxTime = Math.max(...results.map(r => r.duration));
      const minTime = Math.min(...results.map(r => r.duration));

      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);

      console.log(`✅ 并发测试完成:`);
      console.log(`   - 总耗时: ${totalTime.toFixed(2)}ms`);
      console.log(`   - 平均响应时间: ${avgTime.toFixed(2)}ms`);
      console.log(`   - 最大响应时间: ${maxTime.toFixed(2)}ms`);
      console.log(`   - 最小响应时间: ${minTime.toFixed(2)}ms`);
    });

    it('PERF-005: 高并发下的错误处理性能', async () => {
      const errorInputs = ['', null, '🚀', 'invalid content'];
      const promises = [];

      // 创建混合的正常和错误请求
      for (let i = 0; i < 50; i++) {
        // 正常请求
        promises.push(
          measurePerformance(() => 
            service.parseTimeline(REAL_LLM_RESPONSES.MIXED_FORMAT, { destination: '测试' })
          )
        );
        
        // 错误请求
        const errorInput = errorInputs[i % errorInputs.length];
        promises.push(
          measurePerformance(() => 
            service.parseTimeline(errorInput as any, { destination: '测试' })
          )
        );
      }

      const results = await Promise.all(promises);

      // 验证所有请求都有合理的响应时间
      results.forEach(result => {
        expect(result.duration).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);
      });

      const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`✅ 混合并发测试平均响应时间: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('内存使用测试', () => {
    it('PERF-006: 长时间运行不应出现内存泄漏', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memorySnapshots = [];

      // 执行1000次解析操作
      for (let i = 0; i < PERFORMANCE_CONFIG.TEST_ITERATIONS; i++) {
        await service.parseTimeline(
          REAL_LLM_RESPONSES.MIXED_FORMAT, 
          { destination: '测试', iteration: i }
        );

        // 每100次检查一次内存
        if (i % 100 === 0) {
          // 强制垃圾回收（如果可用）
          if (global.gc) {
            global.gc();
          }
          
          const currentMemory = process.memoryUsage().heapUsed;
          const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024; // MB
          
          memorySnapshots.push({
            iteration: i,
            memory: currentMemory,
            increase: memoryIncrease
          });

          expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_LIMIT);
        }
      }

      // 分析内存使用趋势
      const finalMemoryIncrease = memorySnapshots[memorySnapshots.length - 1].increase;
      console.log(`✅ 内存使用测试完成:`);
      console.log(`   - 初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   - 最终内存增长: ${finalMemoryIncrease.toFixed(2)}MB`);
      console.log(`   - 内存快照:`, memorySnapshots.map(s => `${s.iteration}: +${s.increase.toFixed(2)}MB`));
    });

    it('PERF-007: 大对象处理的内存效率', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB的大文本
      const iterations = 100;

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        const { memory } = await measurePerformance(async () => {
          return await service.parseTimeline(largeContent, { destination: '测试' });
        });

        // 每次操作的内存增长应该是合理的
        expect(memory).toBeLessThan(10); // 每次操作内存增长不超过10MB
      }

      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const totalIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(totalIncrease).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_LIMIT);
      console.log(`✅ 大对象处理内存增长: ${totalIncrease.toFixed(2)}MB`);
    });
  });

  describe('解析器选择性能测试', () => {
    it('PERF-008: 解析器选择策略的效率', async () => {
      const testCases = [
        { content: REAL_LLM_RESPONSES.CHENGDU_DAY1, expectedParser: 'TimelineActivityParser' },
        { content: REAL_LLM_RESPONSES.STRUCTURED_TIME, expectedParser: 'StructuredTimelineParser' },
        { content: REAL_LLM_RESPONSES.NO_TIME_MARKERS, expectedParser: 'FallbackTimelineParser' }
      ];

      for (const testCase of testCases) {
        const { duration } = await measurePerformance(async () => {
          return await service.parseTimeline(testCase.content, { destination: '测试' });
        });

        // 解析器选择应该很快
        expect(duration).toBeLessThan(PERFORMANCE_CONFIG.TARGET_PARSE_TIME);
      }
    });

    it('PERF-009: 解析器缓存效果测试', async () => {
      const testContent = REAL_LLM_RESPONSES.BEIJING_DAY1;
      const context = { destination: '北京' };

      // 第一次解析（冷启动）
      const { duration: firstDuration } = await measurePerformance(async () => {
        return await service.parseTimeline(testContent, context);
      });

      // 后续解析（可能有缓存效果）
      const subsequentDurations = [];
      for (let i = 0; i < 10; i++) {
        const { duration } = await measurePerformance(async () => {
          return await service.parseTimeline(testContent, context);
        });
        subsequentDurations.push(duration);
      }

      const avgSubsequentDuration = subsequentDurations.reduce((a, b) => a + b, 0) / subsequentDurations.length;

      console.log(`✅ 缓存效果测试:`);
      console.log(`   - 首次解析: ${firstDuration.toFixed(2)}ms`);
      console.log(`   - 后续平均: ${avgSubsequentDuration.toFixed(2)}ms`);

      // 所有解析都应该在可接受范围内
      expect(firstDuration).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);
      expect(avgSubsequentDuration).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_TIME);
    });
  });
});
