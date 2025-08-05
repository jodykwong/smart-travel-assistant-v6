/**
 * 智能旅游助手性能测试
 * 专门测试应用的性能指标和用户体验
 */

import { test, expect, Page } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { PlanningPage } from './pages/planning-page';
import { ResultPage } from './pages/result-page';

// 性能测试配置
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // 页面加载时间 < 3秒
  planGeneration: 10000, // 计划生成时间 < 10秒
  firstPaint: 1500,      // 首次绘制 < 1.5秒
  firstContentfulPaint: 2000, // 首次内容绘制 < 2秒
  largestContentfulPaint: 2500, // 最大内容绘制 < 2.5秒
  cumulativeLayoutShift: 0.1,   // 累积布局偏移 < 0.1
  firstInputDelay: 100,  // 首次输入延迟 < 100ms
};

// 测试数据集
const PERFORMANCE_TEST_CASES = [
  { destination: '成都', days: 3, complexity: 'simple' },
  { destination: '北京', days: 7, complexity: 'medium' },
  { destination: '新疆', days: 13, complexity: 'complex' }
];

test.describe('智能旅游助手性能测试', () => {
  let homePage: HomePage;
  let planningPage: PlanningPage;
  let resultPage: ResultPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    planningPage = new PlanningPage(page);
    resultPage = new ResultPage(page);
  });

  test('PERF-001: 首页加载性能测试', async ({ page }) => {
    console.log('🚀 开始首页加载性能测试...');

    const startTime = Date.now();
    
    // 导航到首页
    await page.goto('/');
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 获取Web Vitals指标
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-paint') {
              vitals.firstPaint = entry.startTime;
            }
            if (entry.name === 'first-contentful-paint') {
              vitals.firstContentfulPaint = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.largestContentfulPaint = entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.cumulativeLayoutShift = (vitals.cumulativeLayoutShift || 0) + entry.value;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
        
        // 5秒后返回结果
        setTimeout(() => resolve({}), 5000);
      });
    });

    // 验证性能指标
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    console.log(`✅ 页面加载时间: ${loadTime}ms (阈值: ${PERFORMANCE_THRESHOLDS.pageLoad}ms)`);

    if (vitals.firstPaint) {
      expect(vitals.firstPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstPaint);
      console.log(`✅ 首次绘制时间: ${vitals.firstPaint}ms`);
    }

    if (vitals.firstContentfulPaint) {
      expect(vitals.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
      console.log(`✅ 首次内容绘制时间: ${vitals.firstContentfulPaint}ms`);
    }

    if (vitals.largestContentfulPaint) {
      expect(vitals.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
      console.log(`✅ 最大内容绘制时间: ${vitals.largestContentfulPaint}ms`);
    }

    if (vitals.cumulativeLayoutShift !== undefined) {
      expect(vitals.cumulativeLayoutShift).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift);
      console.log(`✅ 累积布局偏移: ${vitals.cumulativeLayoutShift}`);
    }
  });

  test('PERF-002: 计划生成性能测试', async ({ page }) => {
    console.log('🚀 开始计划生成性能测试...');

    for (const testCase of PERFORMANCE_TEST_CASES) {
      console.log(`测试 ${testCase.complexity} 复杂度: ${testCase.destination} ${testCase.days}天`);

      await homePage.visit();
      
      const startTime = Date.now();
      
      await homePage.fillTravelForm({
        destination: testCase.destination,
        days: testCase.days,
        groupSize: 2
      });

      await homePage.generatePlan();
      await planningPage.waitForPlanGeneration();
      
      const generationTime = Date.now() - startTime;
      
      // 根据复杂度调整阈值
      let threshold = PERFORMANCE_THRESHOLDS.planGeneration;
      if (testCase.complexity === 'complex') {
        threshold = threshold * 2; // 复杂行程允许更长时间
      }
      
      expect(generationTime).toBeLessThan(threshold);
      console.log(`✅ ${testCase.destination} ${testCase.days}天生成时间: ${generationTime}ms`);
      
      // 验证结果质量
      await resultPage.verifyPageLoaded();
      const activityCount = await resultPage.verifyTimelineActivities();
      expect(activityCount).toBeGreaterThan(0);
      console.log(`   活动数量: ${activityCount}`);
    }
  });

  test('PERF-003: 缓存性能测试', async ({ page }) => {
    console.log('🚀 开始缓存性能测试...');

    const testData = { destination: '成都', days: 3, groupSize: 2 };

    // 第一次生成（无缓存）
    await homePage.visit();
    
    const firstStartTime = Date.now();
    await homePage.fillTravelForm(testData);
    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    const firstGenerationTime = Date.now() - firstStartTime;
    
    await resultPage.verifyPageLoaded();
    console.log(`首次生成时间: ${firstGenerationTime}ms`);

    // 第二次生成（应该使用缓存）
    await homePage.visit();
    
    const secondStartTime = Date.now();
    await homePage.fillTravelForm(testData);
    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    const secondGenerationTime = Date.now() - secondStartTime;
    
    await resultPage.verifyPageLoaded();
    console.log(`缓存生成时间: ${secondGenerationTime}ms`);

    // 验证缓存效果（第二次应该明显更快）
    const improvementRatio = firstGenerationTime / secondGenerationTime;
    expect(improvementRatio).toBeGreaterThan(1.5); // 至少50%的性能提升
    console.log(`✅ 缓存性能提升: ${((improvementRatio - 1) * 100).toFixed(1)}%`);
  });

  test('PERF-004: 并发用户性能测试', async ({ browser }) => {
    console.log('🚀 开始并发用户性能测试...');

    const concurrentUsers = 3;
    const testPromises: Promise<any>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          const homePage = new HomePage(page);
          const planningPage = new PlanningPage(page);
          const resultPage = new ResultPage(page);

          const startTime = Date.now();
          
          await homePage.visit();
          await homePage.fillTravelForm({
            destination: '北京',
            days: 5,
            groupSize: 2
          });

          await homePage.generatePlan();
          await planningPage.waitForPlanGeneration();
          await resultPage.verifyPageLoaded();
          
          const totalTime = Date.now() - startTime;
          
          return {
            userId: i + 1,
            totalTime,
            success: true
          };
        } catch (error) {
          return {
            userId: i + 1,
            error: error.message,
            success: false
          };
        } finally {
          await context.close();
        }
      })();
      
      testPromises.push(promise);
    }

    const results = await Promise.all(testPromises);
    
    // 验证所有用户都成功完成
    const successfulUsers = results.filter(r => r.success);
    expect(successfulUsers.length).toBe(concurrentUsers);
    
    // 验证平均响应时间
    const averageTime = successfulUsers.reduce((sum, r) => sum + r.totalTime, 0) / successfulUsers.length;
    expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.planGeneration * 2); // 并发情况下允许更长时间
    
    console.log(`✅ ${concurrentUsers}个并发用户测试完成`);
    console.log(`平均响应时间: ${averageTime.toFixed(0)}ms`);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`用户${result.userId}: ${result.totalTime}ms`);
      } else {
        console.error(`用户${result.userId}失败: ${result.error}`);
      }
    });
  });

  test('PERF-005: 内存使用性能测试', async ({ page }) => {
    console.log('🚀 开始内存使用性能测试...');

    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (!initialMemory) {
      console.log('⚠️ 浏览器不支持内存监控，跳过内存测试');
      return;
    }

    console.log('初始内存使用:', initialMemory);

    // 执行多次计划生成
    for (let i = 0; i < 3; i++) {
      await homePage.visit();
      await homePage.fillTravelForm({
        destination: `测试目的地${i + 1}`,
        days: 5,
        groupSize: 2
      });

      await homePage.generatePlan();
      await planningPage.waitForPlanGeneration();
      await resultPage.verifyPageLoaded();
      
      // 强制垃圾回收（如果支持）
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
    }

    // 获取最终内存使用
    const finalMemory = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    });

    console.log('最终内存使用:', finalMemory);

    // 计算内存增长
    const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    const memoryGrowthMB = memoryGrowth / (1024 * 1024);
    
    console.log(`内存增长: ${memoryGrowthMB.toFixed(2)}MB`);
    
    // 验证内存增长在合理范围内（不超过50MB）
    expect(memoryGrowthMB).toBeLessThan(50);
    console.log('✅ 内存使用在合理范围内');
  });
});
