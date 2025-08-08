/**
 * 智能旅游助手冒烟测试
 * 快速验证核心功能是否正常工作
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { PlanningPage } from './pages/planning-page';
import { ResultPage } from './pages/result-page';

// 冒烟测试数据 - 使用简单快速的测试用例
const SMOKE_TEST_DATA = [
  { destination: '成都', days: 3, groupSize: 2 },
  { destination: '北京', days: 5, groupSize: 4 }
];

test.describe('智能旅游助手冒烟测试', () => {
  test('SMOKE-001: 核心功能快速验证', async ({ page }) => {
    console.log('🔥 开始核心功能冒烟测试...');

    const homePage = new HomePage(page);
    const planningPage = new PlanningPage(page);
    const resultPage = new ResultPage(page);

    // 1. 首页加载验证
    await homePage.visit();
    await homePage.verifyPageLoaded();
    console.log('✅ 首页加载正常');

    // 2. 表单功能验证
    await homePage.verifyFormFields();
    await homePage.fillTravelForm(SMOKE_TEST_DATA[0]);
    console.log('✅ 表单填写正常');

    // 3. 计划生成验证
    await homePage.generatePlan();
    await planningPage.verifyPageLoaded();
    console.log('✅ 计划生成页面正常');

    // 4. 结果页面验证
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();
    const activityCount = await resultPage.verifyTimelineActivities();
    expect(activityCount).toBeGreaterThan(0);
    console.log(`✅ 结果页面正常，生成了 ${activityCount} 个活动`);

    // 5. 基本交互验证
    await resultPage.clickFirstActivity();
    await resultPage.verifyActivityDetails();
    console.log('✅ 活动交互正常');

    console.log('🎉 核心功能冒烟测试通过');
  });

  test('SMOKE-002: 多目的地快速验证', async ({ page }) => {
    console.log('🔥 开始多目的地冒烟测试...');

    const homePage = new HomePage(page);
    const planningPage = new PlanningPage(page);
    const resultPage = new ResultPage(page);

    for (const testData of SMOKE_TEST_DATA) {
      console.log(`测试目的地: ${testData.destination}`);

      await homePage.visit();
      await homePage.fillTravelForm(testData);
      await homePage.generatePlan();
      
      await planningPage.waitForPlanGeneration();
      await resultPage.verifyPageLoaded();
      
      const activityCount = await resultPage.verifyTimelineActivities();
      expect(activityCount).toBeGreaterThan(0);
      
      await resultPage.verifyDestinationContent(testData.destination);
      console.log(`✅ ${testData.destination} 测试通过，活动数: ${activityCount}`);
    }

    console.log('🎉 多目的地冒烟测试通过');
  });

  test('SMOKE-003: 错误处理快速验证', async ({ page }) => {
    console.log('🔥 开始错误处理冒烟测试...');

    const homePage = new HomePage(page);

    await homePage.visit();

    // 测试空表单提交
    await homePage.generatePlan();
    await homePage.verifyValidationError();
    console.log('✅ 表单验证正常');

    // 测试无效输入
    await homePage.fillTravelForm({
      destination: '',
      days: 0,
      groupSize: 0
    });
    await homePage.generatePlan();
    await homePage.verifyValidationError();
    console.log('✅ 无效输入处理正常');

    console.log('🎉 错误处理冒烟测试通过');
  });

  test('SMOKE-004: 响应式设计快速验证', async ({ page }) => {
    console.log('🔥 开始响应式设计冒烟测试...');

    const homePage = new HomePage(page);
    const planningPage = new PlanningPage(page);
    const resultPage = new ResultPage(page);

    // 测试移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await homePage.visit();
    await homePage.verifyFormFields();
    await homePage.fillTravelForm(SMOKE_TEST_DATA[0]);
    await homePage.generatePlan();
    
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();
    
    const mobileActivityCount = await resultPage.verifyTimelineActivities();
    expect(mobileActivityCount).toBeGreaterThan(0);
    console.log(`✅ 移动端测试通过，活动数: ${mobileActivityCount}`);

    // 测试桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await homePage.visit();
    await homePage.fillTravelForm(SMOKE_TEST_DATA[1]);
    await homePage.generatePlan();
    
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();
    
    const desktopActivityCount = await resultPage.verifyTimelineActivities();
    expect(desktopActivityCount).toBeGreaterThan(0);
    console.log(`✅ 桌面端测试通过，活动数: ${desktopActivityCount}`);

    console.log('🎉 响应式设计冒烟测试通过');
  });

  test('SMOKE-005: 性能基准快速验证', async ({ page }) => {
    console.log('🔥 开始性能基准冒烟测试...');

    const homePage = new HomePage(page);
    const planningPage = new PlanningPage(page);
    const resultPage = new ResultPage(page);

    // 页面加载性能
    const pageLoadStart = Date.now();
    await homePage.visit();
    const pageLoadTime = Date.now() - pageLoadStart;
    
    expect(pageLoadTime).toBeLessThan(5000); // 冒烟测试使用宽松阈值
    console.log(`✅ 页面加载时间: ${pageLoadTime}ms`);

    // 计划生成性能
    const generateStart = Date.now();
    await homePage.fillTravelForm(SMOKE_TEST_DATA[0]);
    await homePage.generatePlan();
    await planningPage.waitForPlanGeneration();
    const generateTime = Date.now() - generateStart;
    
    expect(generateTime).toBeLessThan(60000); // 冒烟测试使用宽松阈值
    console.log(`✅ 计划生成时间: ${generateTime}ms`);

    // 结果渲染性能
    const renderStart = Date.now();
    await resultPage.verifyPageLoaded();
    await resultPage.verifyTimelineActivities();
    const renderTime = Date.now() - renderStart;
    
    expect(renderTime).toBeLessThan(10000); // 冒烟测试使用宽松阈值
    console.log(`✅ 结果渲染时间: ${renderTime}ms`);

    console.log('🎉 性能基准冒烟测试通过');
  });

  test('SMOKE-006: 新解析器功能快速验证', async ({ page }) => {
    console.log('🔥 开始新解析器功能冒烟测试...');

    const homePage = new HomePage(page);
    const planningPage = new PlanningPage(page);
    const resultPage = new ResultPage(page);

    // 启用新解析器特性
    await page.addInitScript(() => {
      window.localStorage.setItem('ENABLE_NEW_PARSER', 'true');
    });

    await homePage.visit();
    await homePage.fillTravelForm(SMOKE_TEST_DATA[0]);
    await homePage.generatePlan();
    
    await planningPage.waitForPlanGeneration();
    await resultPage.verifyPageLoaded();
    
    const activityCount = await resultPage.verifyTimelineActivities();
    expect(activityCount).toBeGreaterThan(0);
    console.log(`✅ 新解析器生成活动数: ${activityCount}`);

    // 检查是否有增强功能
    const hasEnhancedFeatures = await resultPage.verifyEnhancedFeatures();
    console.log(`增强功能状态: ${hasEnhancedFeatures ? '已启用' : '未检测到'}`);

    console.log('🎉 新解析器功能冒烟测试通过');
  });
});
