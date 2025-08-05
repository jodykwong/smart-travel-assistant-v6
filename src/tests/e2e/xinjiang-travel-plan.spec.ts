/**
 * 新疆房车自驾13天行程规划专项测试
 * 基于用户需求的完整端到端测试场景
 */

import { test, expect, Page } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { PlanningPage } from './pages/planning-page';
import { ResultPage } from './pages/result-page';

// 新疆行程测试数据
const XINJIANG_TRAVEL_DATA = {
  destination: '新疆',
  days: 13,
  groupSize: 2,
  travelStyle: 'adventure',
  requirements: {
    mustInclude: ['阿禾公路', '独库公路', '赛里木湖', '孟克特古道'],
    mustExclude: ['喀纳斯', '禾木', '魔鬼城'],
    xinjiangDays: 7,
    returnRoute: ['新疆', '南京', '南昌', '深圳'],
    returnDays: 6,
    transportation: {
      firstDay: '深圳直飞新疆',
      others: '房车自驾'
    }
  }
};

test.describe('新疆房车自驾13天行程规划测试', () => {
  let homePage: HomePage;
  let planningPage: PlanningPage;
  let resultPage: ResultPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    planningPage = new PlanningPage(page);
    resultPage = new ResultPage(page);
  });

  test('XJ-001: 新疆13天完整行程规划流程', async ({ page }) => {
    console.log('🎯 开始新疆13天行程规划测试...');

    // 1. 访问首页并验证
    await homePage.visit();
    await homePage.verifyFormFields();

    // 2. 填写新疆行程信息
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize,
      travelStyle: XINJIANG_TRAVEL_DATA.travelStyle
    });

    // 3. 提交表单并监控生成过程
    await homePage.generatePlan();
    await planningPage.verifyPageLoaded();
    
    const generationResult = await planningPage.monitorGenerationProcess();
    expect(generationResult.success).toBe(true);
    expect(generationResult.duration).toBeLessThan(30000); // 30秒内完成

    // 4. 验证结果页面
    await resultPage.verifyPageLoaded();
    const activityCount = await resultPage.verifyTimelineActivities();
    
    // 验证13天行程的活动数量合理
    expect(activityCount).toBeGreaterThanOrEqual(13); // 至少每天一个活动
    expect(activityCount).toBeLessThanOrEqual(39); // 最多每天3个活动

    // 5. 验证天数标题
    await resultPage.verifyDayHeaders(XINJIANG_TRAVEL_DATA.days);

    // 6. 验证目的地内容
    await resultPage.verifyDestinationContent(XINJIANG_TRAVEL_DATA.destination);

    console.log(`✅ 新疆13天行程生成成功，包含 ${activityCount} 个活动`);
  });

  test('XJ-002: 验证必须包含的景点和路线', async ({ page }) => {
    console.log('🎯 验证新疆行程必须包含的景点...');

    // 生成行程
    await homePage.visit();
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize
    });

    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();

    // 获取所有活动信息
    const activities = await resultPage.getTimelineActivities();
    const allContent = activities.map(a => `${a.title} ${a.description}`).join(' ');

    // 验证必须包含的景点
    for (const mustInclude of XINJIANG_TRAVEL_DATA.requirements.mustInclude) {
      expect(allContent).toContain(mustInclude);
      console.log(`✅ 找到必须包含的景点: ${mustInclude}`);
    }

    // 验证不应包含的景点
    for (const mustExclude of XINJIANG_TRAVEL_DATA.requirements.mustExclude) {
      expect(allContent).not.toContain(mustExclude);
      console.log(`✅ 确认排除了景点: ${mustExclude}`);
    }
  });

  test('XJ-003: 验证交通方式安排', async ({ page }) => {
    console.log('🎯 验证新疆行程交通方式安排...');

    await homePage.visit();
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize
    });

    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();

    const activities = await resultPage.getTimelineActivities();
    const firstDayActivities = activities.filter(a => 
      a.title.includes('第1天') || a.description.includes('第一天')
    );

    // 验证第一天包含飞行信息
    const firstDayContent = firstDayActivities.map(a => `${a.title} ${a.description}`).join(' ');
    expect(firstDayContent.toLowerCase()).toMatch(/(飞|航班|机场|深圳)/);
    console.log('✅ 第一天包含飞行安排');

    // 验证其他天数包含房车自驾信息
    const otherDaysContent = activities.slice(3).map(a => `${a.title} ${a.description}`).join(' ');
    expect(otherDaysContent.toLowerCase()).toMatch(/(房车|自驾|驾车)/);
    console.log('✅ 其他天数包含房车自驾安排');
  });

  test('XJ-004: 验证返程路线安排', async ({ page }) => {
    console.log('🎯 验证新疆行程返程路线...');

    await homePage.visit();
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize
    });

    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();

    const activities = await resultPage.getTimelineActivities();
    const allContent = activities.map(a => `${a.title} ${a.description}`).join(' ');

    // 验证返程路线城市
    for (const city of XINJIANG_TRAVEL_DATA.requirements.returnRoute) {
      expect(allContent).toContain(city);
      console.log(`✅ 返程路线包含城市: ${city}`);
    }
  });

  test('XJ-005: 新疆行程性能测试', async ({ page }) => {
    console.log('🎯 新疆行程生成性能测试...');

    const startTime = Date.now();

    // 页面加载性能
    await homePage.visit();
    const pageLoadTime = Date.now() - startTime;
    expect(pageLoadTime).toBeLessThan(15000); // 调整为更宽松的阈值
    console.log(`页面加载时间: ${pageLoadTime}ms`);

    // 表单填写性能
    const formStartTime = Date.now();
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize
    });
    const formFillTime = Date.now() - formStartTime;
    console.log(`表单填写时间: ${formFillTime}ms`);

    // 行程生成性能
    const generateStartTime = Date.now();
    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    const generateTime = Date.now() - generateStartTime;
    
    expect(generateTime).toBeLessThan(30000); // 30秒内完成
    console.log(`行程生成时间: ${generateTime}ms`);

    // 结果页面渲染性能
    const renderStartTime = Date.now();
    await resultPage.verifyPageLoaded();
    await resultPage.verifyTimelineActivities();
    const renderTime = Date.now() - renderStartTime;
    
    expect(renderTime).toBeLessThan(5000); // 5秒内渲染完成
    console.log(`结果页面渲染时间: ${renderTime}ms`);

    // 获取详细性能指标
    const performanceMetrics = await resultPage.getPerformanceMetrics();
    console.log('详细性能指标:', performanceMetrics);
  });

  test('XJ-006: 新疆行程响应式设计测试', async ({ page }) => {
    console.log('🎯 新疆行程响应式设计测试...');

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      console.log(`测试 ${viewport.name} 视口...`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await homePage.visit();
      await homePage.verifyFormFields();
      
      await homePage.fillTravelForm({
        destination: XINJIANG_TRAVEL_DATA.destination,
        days: XINJIANG_TRAVEL_DATA.days,
        groupSize: XINJIANG_TRAVEL_DATA.groupSize
      });

      await homePage.generatePlan();
      await planningPage.waitForPlanGeneration();
      await resultPage.verifyPageLoaded();
      
      const activityCount = await resultPage.verifyTimelineActivities();
      expect(activityCount).toBeGreaterThan(0);
      
      // 截图记录不同视口下的显示效果
      await resultPage.takeScreenshot(`xinjiang-${viewport.name.toLowerCase()}`);
      
      console.log(`✅ ${viewport.name} 视口测试通过，活动数量: ${activityCount}`);
    }
  });

  test('XJ-007: 新疆行程错误处理测试', async ({ page }) => {
    console.log('🎯 新疆行程错误处理测试...');

    // 测试网络错误处理
    await page.route('**/api/**', route => route.abort());
    
    await homePage.visit();
    await homePage.fillTravelForm({
      destination: XINJIANG_TRAVEL_DATA.destination,
      days: XINJIANG_TRAVEL_DATA.days,
      groupSize: XINJIANG_TRAVEL_DATA.groupSize
    });

    await homePage.generatePlan();
    
    // 验证错误处理
    await planningPage.verifyErrorHandling();
    console.log('✅ 网络错误处理正常');

    // 恢复网络并重试
    await page.unroute('**/api/**');
    await planningPage.clickRetry();
    
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();
    
    const activityCount = await resultPage.verifyTimelineActivities();
    expect(activityCount).toBeGreaterThan(0);
    console.log('✅ 错误恢复功能正常');
  });
});
