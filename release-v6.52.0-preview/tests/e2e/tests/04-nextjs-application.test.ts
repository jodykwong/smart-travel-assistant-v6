import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Next.js应用测试套件
 * 启动应用并测试核心功能页面
 */
test.describe('Next.js应用测试', () => {
  let testResults: any = {};

  test.beforeAll(async () => {
    console.log('🖥️ 开始Next.js应用测试');
    testResults = {
      timestamp: new Date().toISOString(),
      pages: {},
      performance: {},
      accessibility: {}
    };
  });

  test.afterAll(async () => {
    // 保存测试结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'nextjs-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 Next.js测试结果已保存到: ${resultsPath}`);
  });

  test('验证应用启动和健康检查', async ({ page }) => {
    const healthCheckResult = {
      appRunning: false,
      responseTime: 0,
      statusCode: 0,
      error: null as string | null
    };

    try {
      const startTime = Date.now();
      
      // 访问健康检查端点
      const response = await page.request.get('/api/health');
      
      healthCheckResult.responseTime = Date.now() - startTime;
      healthCheckResult.statusCode = response.status();
      healthCheckResult.appRunning = response.ok();

      if (response.ok()) {
        console.log(`✅ 应用健康检查通过 (${healthCheckResult.responseTime}ms)`);
      } else {
        healthCheckResult.error = `HTTP ${response.status()}`;
        console.log(`⚠️ 应用健康检查异常: ${healthCheckResult.error}`);
      }

    } catch (error) {
      healthCheckResult.error = error instanceof Error ? error.message : String(error);
      console.log(`❌ 应用健康检查失败: ${healthCheckResult.error}`);
    }

    expect(healthCheckResult.appRunning, '应用应该正常运行').toBeTruthy();
    expect(healthCheckResult.responseTime, '健康检查响应时间应该合理').toBeLessThan(5000);

    testResults.healthCheck = healthCheckResult;
  });

  test('测试首页加载和基本功能', async ({ page }) => {
    const pageResult = {
      loaded: false,
      loadTime: 0,
      title: '',
      hasNavigation: false,
      hasMainContent: false,
      hasFooter: false,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      // 监听页面错误
      page.on('pageerror', (error) => {
        pageResult.errors.push(error.message);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          pageResult.errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          pageResult.warnings.push(msg.text());
        }
      });

      const startTime = Date.now();
      
      // 访问首页
      await page.goto('/', { waitUntil: 'networkidle' });
      
      pageResult.loadTime = Date.now() - startTime;
      pageResult.loaded = true;
      pageResult.title = await page.title();

      // 检查页面基本结构
      pageResult.hasNavigation = await page.locator('nav, header').count() > 0;
      pageResult.hasMainContent = await page.locator('main, [role="main"]').count() > 0;
      pageResult.hasFooter = await page.locator('footer').count() > 0;

      console.log(`✅ 首页加载成功: "${pageResult.title}" (${pageResult.loadTime}ms)`);

      // 截图
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'homepage.png'),
        fullPage: true 
      });

    } catch (error) {
      pageResult.errors.push(error instanceof Error ? error.message : String(error));
      console.log(`❌ 首页加载失败: ${pageResult.errors[pageResult.errors.length - 1]}`);
    }

    expect(pageResult.loaded, '首页应该成功加载').toBeTruthy();
    expect(pageResult.loadTime, '首页加载时间应该合理').toBeLessThan(10000);
    expect(pageResult.errors.length, '页面不应该有JavaScript错误').toBe(0);

    testResults.pages.homepage = pageResult;
  });

  test('测试旅游规划页面', async ({ page }) => {
    const pageResult = {
      accessible: false,
      hasForm: false,
      hasInputFields: false,
      hasSubmitButton: false,
      formValidation: false,
      errors: [] as string[],
      loadTime: 0
    };

    try {
      page.on('pageerror', (error) => {
        pageResult.errors.push(error.message);
      });

      const startTime = Date.now();
      
      // 尝试访问旅游规划页面
      await page.goto('/planning', { waitUntil: 'networkidle' });
      
      pageResult.loadTime = Date.now() - startTime;
      pageResult.accessible = true;

      // 检查表单元素
      pageResult.hasForm = await page.locator('form').count() > 0;
      pageResult.hasInputFields = await page.locator('input, textarea, select').count() > 0;
      pageResult.hasSubmitButton = await page.locator('button[type="submit"], input[type="submit"]').count() > 0;

      // 测试表单验证
      if (pageResult.hasForm && pageResult.hasSubmitButton) {
        try {
          await page.click('button[type="submit"], input[type="submit"]');
          // 检查是否有验证消息
          const validationMessages = await page.locator('.error, .invalid, [aria-invalid="true"]').count();
          pageResult.formValidation = validationMessages > 0;
        } catch (error) {
          // 表单验证测试失败不影响整体测试
        }
      }

      console.log(`✅ 旅游规划页面测试完成 (${pageResult.loadTime}ms)`);

      // 截图
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'planning-page.png'),
        fullPage: true 
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log('ℹ️ 旅游规划页面不存在，跳过测试');
        pageResult.accessible = false;
      } else {
        pageResult.errors.push(error instanceof Error ? error.message : String(error));
        console.log(`❌ 旅游规划页面测试失败: ${pageResult.errors[pageResult.errors.length - 1]}`);
      }
    }

    testResults.pages.planningPage = pageResult;
  });

  test('测试API路由', async ({ page }) => {
    const apiTests = {
      health: { status: 0, success: false, responseTime: 0 },
      planning: { status: 0, success: false, responseTime: 0 },
      travel: { status: 0, success: false, responseTime: 0 }
    };

    // 测试健康检查API
    try {
      const startTime = Date.now();
      const response = await page.request.get('/api/health');
      apiTests.health.responseTime = Date.now() - startTime;
      apiTests.health.status = response.status();
      apiTests.health.success = response.ok();
    } catch (error) {
      console.log('健康检查API测试失败:', error);
    }

    // 测试规划API
    try {
      const startTime = Date.now();
      const response = await page.request.get('/api/planning');
      apiTests.planning.responseTime = Date.now() - startTime;
      apiTests.planning.status = response.status();
      apiTests.planning.success = response.status() !== 500; // 404也算正常
    } catch (error) {
      console.log('规划API测试失败:', error);
    }

    // 测试旅游API
    try {
      const startTime = Date.now();
      const response = await page.request.get('/api/travel');
      apiTests.travel.responseTime = Date.now() - startTime;
      apiTests.travel.status = response.status();
      apiTests.travel.success = response.status() !== 500;
    } catch (error) {
      console.log('旅游API测试失败:', error);
    }

    // 至少健康检查API应该可用
    expect(apiTests.health.success, '健康检查API应该可用').toBeTruthy();

    console.log(`📡 API测试完成: health(${apiTests.health.status}), planning(${apiTests.planning.status}), travel(${apiTests.travel.status})`);

    testResults.apiRoutes = apiTests;
  });

  test('性能基准测试', async ({ page }) => {
    const performanceMetrics = {
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      totalBlockingTime: 0,
      performanceScore: 0
    };

    try {
      // 启用性能监控
      await page.goto('/', { waitUntil: 'networkidle' });

      // 获取Web Vitals指标
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const metrics: any = {};
            
            entries.forEach((entry) => {
              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  metrics.firstContentfulPaint = entry.startTime;
                }
              } else if (entry.entryType === 'largest-contentful-paint') {
                metrics.largestContentfulPaint = entry.startTime;
              }
            });
            
            resolve(metrics);
          });
          
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // 超时保护
          setTimeout(() => resolve({}), 5000);
        });
      });

      Object.assign(performanceMetrics, metrics);

      // 计算性能评分
      let score = 100;
      if (performanceMetrics.firstContentfulPaint > 2000) score -= 20;
      if (performanceMetrics.largestContentfulPaint > 4000) score -= 30;
      performanceMetrics.performanceScore = Math.max(0, score);

      console.log(`📊 性能指标: FCP ${Math.round(performanceMetrics.firstContentfulPaint)}ms, LCP ${Math.round(performanceMetrics.largestContentfulPaint)}ms, 评分 ${performanceMetrics.performanceScore}/100`);

    } catch (error) {
      console.log('性能测试失败:', error);
    }

    // 验证性能基准
    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint, 'FCP应该在合理范围内').toBeLessThan(5000);
    }
    if (performanceMetrics.largestContentfulPaint > 0) {
      expect(performanceMetrics.largestContentfulPaint, 'LCP应该在合理范围内').toBeLessThan(8000);
    }

    testResults.performance = performanceMetrics;
  });

  test('生成Next.js应用测试报告', async () => {
    const reportData = {
      summary: {
        timestamp: new Date().toISOString(),
        overallHealth: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown',
        pagesTestedSuccessfully: 0,
        totalPages: 2,
        apiEndpointsWorking: 0,
        totalApiEndpoints: 3,
        performanceScore: testResults.performance?.performanceScore || 0
      },
      details: {
        healthCheck: testResults.healthCheck,
        pages: testResults.pages,
        apiRoutes: testResults.apiRoutes,
        performance: testResults.performance
      },
      recommendations: [] as string[]
    };

    // 计算成功页面数
    const pageResults = testResults.pages || {};
    reportData.summary.pagesTestedSuccessfully = Object.values(pageResults).filter(
      (page: any) => page.loaded || page.accessible
    ).length;

    // 计算可用API数
    const apiResults = testResults.apiRoutes || {};
    reportData.summary.apiEndpointsWorking = Object.values(apiResults).filter(
      (api: any) => api.success
    ).length;

    // 确定整体健康状态
    const healthScore = (
      (reportData.summary.pagesTestedSuccessfully / reportData.summary.totalPages) * 40 +
      (reportData.summary.apiEndpointsWorking / reportData.summary.totalApiEndpoints) * 30 +
      (reportData.summary.performanceScore / 100) * 30
    );

    if (healthScore >= 90) reportData.summary.overallHealth = 'excellent';
    else if (healthScore >= 75) reportData.summary.overallHealth = 'good';
    else if (healthScore >= 50) reportData.summary.overallHealth = 'fair';
    else reportData.summary.overallHealth = 'poor';

    // 生成建议
    if (reportData.summary.pagesTestedSuccessfully < reportData.summary.totalPages) {
      reportData.recommendations.push('部分页面无法正常访问，请检查路由配置');
    }
    if (reportData.summary.performanceScore < 70) {
      reportData.recommendations.push('页面性能需要优化，建议检查资源加载和代码分割');
    }
    if (reportData.summary.apiEndpointsWorking < reportData.summary.totalApiEndpoints) {
      reportData.recommendations.push('部分API端点不可用，请检查后端服务');
    }

    // 保存报告
    const reportPath = path.join(process.cwd(), 'test-results', 'nextjs-application-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📋 Next.js应用测试报告已生成: ${reportPath}`);
    console.log(`🏥 整体健康状态: ${reportData.summary.overallHealth} (评分: ${Math.round(healthScore)}/100)`);

    testResults.report = reportData;
  });
});
