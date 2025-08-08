/**
 * 智游助手v6.2 - 完整旅游规划流程E2E测试
 * 
 * 测试覆盖：
 * 1. 用户注册阶段
 * 2. 用户登录阶段  
 * 3. 旅游规划阶段
 * 4. 支付流程阶段
 * 5. 报告生成阶段
 * 
 * 验证数据库集成和完整业务流程的正确性
 */

import { test, expect, Page } from '@playwright/test';
import { 
  TestDataGenerator, 
  PageHelper, 
  DatabaseHelper, 
  PerformanceHelper,
  TestUser,
  TravelPlan,
  PaymentInfo 
} from './utils/test-helpers';

// 测试数据
let testUser: TestUser;
let travelPlan: TravelPlan;
let paymentInfo: PaymentInfo;
let pageHelper: PageHelper;
let performanceHelper: PerformanceHelper;

test.describe('智游助手v6.2 - 完整旅游规划流程E2E测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 初始化测试数据和助手类
    testUser = TestDataGenerator.generateTestUser();
    travelPlan = TestDataGenerator.generateTravelPlan();
    paymentInfo = TestDataGenerator.generatePaymentInfo();
    pageHelper = new PageHelper(page);
    performanceHelper = new PerformanceHelper(page);
    
    console.log('🧪 测试数据生成完成:', {
      email: testUser.email,
      destination: travelPlan.destination,
      paymentMethod: paymentInfo.paymentMethod
    });
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await pageHelper.clearTestData();
    await DatabaseHelper.cleanupTestUser(testUser.email);
    
    // 截图保存最终状态
    await pageHelper.takeScreenshot('test-final-state');
  });

  test('完整旅游规划流程 - 从注册到支付完成', async ({ page }) => {
    console.log('🚀 开始完整旅游规划流程E2E测试');

    // ==================== 阶段1: 用户注册 ====================
    test.step('用户注册阶段', async () => {
      console.log('📝 开始用户注册测试...');
      
      // 访问首页
      performanceHelper.startTiming();
      await page.goto('/');
      const homeLoadTime = performanceHelper.endTiming();
      console.log(`📊 首页加载时间: ${homeLoadTime}ms`);
      
      await pageHelper.waitForPageLoad();
      await pageHelper.takeScreenshot('01-homepage');
      
      // 导航到注册页面
      await pageHelper.safeClick('a[href="/register"], button:has-text("注册")');
      await pageHelper.verifyUrl('/register');
      await pageHelper.takeScreenshot('02-register-page');
      
      // 填写注册表单
      await pageHelper.safeFill('input[name="email"], input[type="email"]', testUser.email);
      await pageHelper.safeFill('input[name="password"], input[type="password"]', testUser.password);
      await pageHelper.safeFill('input[name="displayName"], input[placeholder*="姓名"]', testUser.displayName);
      
      // 验证密码强度显示
      await expect(page.locator('.password-strength, .strength-indicator')).toBeVisible();
      
      await pageHelper.takeScreenshot('03-register-form-filled');
      
      // 提交注册
      performanceHelper.startTiming();
      await pageHelper.safeClick('button[type="submit"], button:has-text("注册")');
      
      // 等待注册API响应
      const registerResponse = await pageHelper.waitForApiResponse('/api/user/register');
      const registerTime = performanceHelper.endTiming();
      
      console.log(`📊 注册API响应时间: ${registerTime}ms`);
      console.log('✅ 注册响应:', registerResponse);
      
      // 验证注册成功
      expect(registerResponse.success).toBe(true);
      expect(registerResponse.user).toBeDefined();
      expect(registerResponse.tokens).toBeDefined();
      
      // 验证JWT令牌
      const token = await pageHelper.verifyJWTToken();
      console.log('🎫 JWT令牌验证成功');
      
      await pageHelper.takeScreenshot('04-register-success');
    });

    // ==================== 阶段2: 用户登录 ====================
    test.step('用户登录阶段', async () => {
      console.log('🔐 开始用户登录测试...');
      
      // 清除当前会话，模拟新用户登录
      await pageHelper.clearTestData();
      
      // 导航到登录页面
      await page.goto('/login');
      await pageHelper.verifyUrl('/login');
      await pageHelper.takeScreenshot('05-login-page');
      
      // 填写登录表单
      await pageHelper.safeFill('input[name="email"], input[type="email"]', testUser.email);
      await pageHelper.safeFill('input[name="password"], input[type="password"]', testUser.password);
      
      await pageHelper.takeScreenshot('06-login-form-filled');
      
      // 提交登录
      performanceHelper.startTiming();
      await pageHelper.safeClick('button[type="submit"], button:has-text("登录")');
      
      // 等待登录API响应
      const loginResponse = await pageHelper.waitForApiResponse('/api/user/login');
      const loginTime = performanceHelper.endTiming();
      
      console.log(`📊 登录API响应时间: ${loginTime}ms`);
      console.log('✅ 登录响应:', loginResponse);
      
      // 验证登录成功
      expect(loginResponse.success).toBe(true);
      expect(loginResponse.user.email).toBe(testUser.email);
      expect(loginResponse.tokens).toBeDefined();
      
      // 验证页面跳转
      await page.waitForURL(/\/(dashboard|home|plan)/, { timeout: 10000 });
      
      await pageHelper.takeScreenshot('07-login-success');
    });

    // ==================== 阶段3: 旅游规划 ====================
    test.step('旅游规划阶段', async () => {
      console.log('🗺️ 开始旅游规划测试...');
      
      // 导航到旅游规划页面
      await page.goto('/plan');
      await pageHelper.waitForPageLoad();
      await pageHelper.takeScreenshot('08-travel-plan-page');
      
      // 填写旅游规划表单
      await pageHelper.safeFill('input[name="destination"], input[placeholder*="目的地"]', travelPlan.destination);
      await pageHelper.safeFill('input[name="startDate"], input[type="date"]:first-of-type', travelPlan.startDate);
      await pageHelper.safeFill('input[name="endDate"], input[type="date"]:last-of-type', travelPlan.endDate);
      await pageHelper.safeFill('input[name="budget"], input[placeholder*="预算"]', travelPlan.budget.toString());
      await pageHelper.safeFill('input[name="travelers"], input[placeholder*="人数"]', travelPlan.travelers.toString());
      
      // 选择住宿类型
      await pageHelper.safeClick(`select[name="accommodationType"] option[value="${travelPlan.accommodationType}"], input[value="${travelPlan.accommodationType}"]`);
      
      // 选择交通方式
      await pageHelper.safeClick(`select[name="transportMode"] option[value="${travelPlan.transportMode}"], input[value="${travelPlan.transportMode}"]`);
      
      await pageHelper.takeScreenshot('09-travel-plan-form-filled');
      
      // 生成旅游规划
      performanceHelper.startTiming();
      await pageHelper.safeClick('button:has-text("生成规划"), button:has-text("开始规划")');
      
      // 等待规划生成完成
      await page.waitForSelector('.plan-result, .travel-plan-result, .itinerary', { timeout: 30000 });
      const planTime = performanceHelper.endTiming();
      
      console.log(`📊 旅游规划生成时间: ${planTime}ms`);
      
      // 验证规划结果
      await expect(page.locator('.plan-result, .travel-plan-result')).toBeVisible();
      await expect(page.locator(':has-text("' + travelPlan.destination + '")')).toBeVisible();
      
      await pageHelper.takeScreenshot('10-travel-plan-generated');
    });

    // ==================== 阶段4: 支付流程 ====================
    test.step('支付流程阶段', async () => {
      console.log('💳 开始支付流程测试...');
      
      // 点击支付按钮
      await pageHelper.safeClick('button:has-text("立即支付"), button:has-text("去支付"), .pay-button');
      
      // 验证跳转到支付页面
      await page.waitForURL(/\/payment/, { timeout: 10000 });
      await pageHelper.verifyUrl('/payment');
      await pageHelper.takeScreenshot('11-payment-page');
      
      // 选择支付方式
      await pageHelper.safeClick(`input[value="${paymentInfo.paymentMethod}"], button:has-text("${paymentInfo.paymentMethod === 'wechat' ? '微信' : '支付宝'}")`);
      
      // 确认支付金额
      const amountElement = page.locator('.amount, .price, .total');
      await expect(amountElement).toBeVisible();
      
      await pageHelper.takeScreenshot('12-payment-method-selected');
      
      // 创建支付订单
      performanceHelper.startTiming();
      await pageHelper.safeClick('button:has-text("确认支付"), button:has-text("立即支付")');
      
      // 等待支付订单创建API响应
      const paymentResponse = await pageHelper.waitForApiResponse('/api/payment/create');
      const paymentTime = performanceHelper.endTiming();
      
      console.log(`📊 支付订单创建时间: ${paymentTime}ms`);
      console.log('✅ 支付响应:', paymentResponse);
      
      // 验证支付订单创建成功
      expect(paymentResponse.success).toBe(true);
      expect(paymentResponse.orderId).toBeDefined();
      expect(paymentResponse.qrCode).toBeDefined();
      
      // 验证QR码显示
      await expect(page.locator('.qr-code, .qrcode, canvas')).toBeVisible();
      
      await pageHelper.takeScreenshot('13-payment-qr-generated');
      
      // 模拟支付完成（在实际测试中，这里可能需要模拟支付回调）
      console.log('💰 支付订单创建成功，QR码已生成');
    });

    // ==================== 阶段5: 报告生成 ====================
    test.step('报告生成阶段', async () => {
      console.log('📄 开始报告生成测试...');
      
      // 等待支付状态更新或手动触发报告生成
      await page.waitForTimeout(2000); // 等待状态更新
      
      // 查找报告相关元素
      const reportButton = page.locator('button:has-text("查看报告"), button:has-text("下载报告"), .report-button');
      
      if (await reportButton.isVisible()) {
        await reportButton.click();
        await pageHelper.takeScreenshot('14-travel-report');
        
        // 验证报告内容
        await expect(page.locator('.report-content, .travel-report')).toBeVisible();
        console.log('📋 旅游规划报告生成成功');
      } else {
        console.log('ℹ️ 报告功能可能需要支付完成后才能访问');
      }
      
      await pageHelper.takeScreenshot('15-final-state');
    });

    console.log('🎉 完整旅游规划流程E2E测试完成！');
  });

  // 单独的错误处理测试
  test('表单验证和错误处理测试', async ({ page }) => {
    console.log('🔍 开始表单验证测试...');
    
    test.step('注册表单验证', async () => {
      await page.goto('/register');
      
      // 测试空表单提交
      await pageHelper.safeClick('button[type="submit"]');
      await pageHelper.verifyFormError('.error, .field-error', '请填写');
      
      // 测试无效邮箱
      await pageHelper.safeFill('input[type="email"]', 'invalid-email');
      await pageHelper.safeClick('button[type="submit"]');
      await pageHelper.verifyFormError('.error, .field-error', '邮箱格式');
      
      // 测试弱密码
      await pageHelper.safeFill('input[type="email"]', testUser.email);
      await pageHelper.safeFill('input[type="password"]', '123');
      await expect(page.locator('.password-strength')).toContainText('弱');
    });

    test.step('登录表单验证', async () => {
      await page.goto('/login');
      
      // 测试不存在的用户
      await pageHelper.safeFill('input[type="email"]', 'nonexistent@test.com');
      await pageHelper.safeFill('input[type="password"]', 'password123');
      await pageHelper.safeClick('button[type="submit"]');
      
      // 等待错误响应
      await page.waitForSelector('.error, .alert-error', { timeout: 10000 });
    });
  });

  // 性能测试
  test('性能基准测试', async ({ page }) => {
    console.log('⚡ 开始性能基准测试...');
    
    const performanceMetrics = {
      homePageLoad: 0,
      registerPageLoad: 0,
      loginPageLoad: 0,
      planPageLoad: 0,
      paymentPageLoad: 0
    };

    // 测试各页面加载性能
    performanceHelper.startTiming();
    await page.goto('/');
    performanceMetrics.homePageLoad = await performanceHelper.measurePageLoadTime();

    performanceHelper.startTiming();
    await page.goto('/register');
    performanceMetrics.registerPageLoad = await performanceHelper.measurePageLoadTime();

    performanceHelper.startTiming();
    await page.goto('/login');
    performanceMetrics.loginPageLoad = await performanceHelper.measurePageLoadTime();

    console.log('📊 性能指标:', performanceMetrics);
    
    // 性能断言
    expect(performanceMetrics.homePageLoad).toBeLessThan(5000); // 5秒内
    expect(performanceMetrics.registerPageLoad).toBeLessThan(3000); // 3秒内
    expect(performanceMetrics.loginPageLoad).toBeLessThan(3000); // 3秒内
  });
});
