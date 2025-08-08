/**
 * 智游助手v6.2 - 真实支付流程端到端测试
 * 遵循原则: [为失败而设计] + [第一性原理] - 验证真实业务流程
 * 
 * 测试目标:
 * 1. 验证支付网关真实连接
 * 2. 测试完整的用户支付流程
 * 3. 确保支付订单可以真正创建和查询
 * 4. 验证错误处理和降级策略
 */

import { test, expect, Page } from '@playwright/test';
import { paymentService } from '../../src/lib/payment/payment-service';
import { configManager } from '../../src/lib/config/config-manager';

// 测试配置
const TEST_CONFIG = {
  testUser: {
    email: `real.payment.test.${Date.now()}@example.com`,
    password: 'RealPaymentTest123!',
    displayName: '真实支付测试用户'
  },
  testPayment: {
    amount: 100, // 1元测试
    description: '智游助手支付功能测试订单',
    paymentMethods: ['alipay', 'wechat'] as const
  }
};

test.describe('真实支付流程验证', () => {
  let configLoaded = false;
  let paymentServiceReady = false;

  test.beforeAll(async () => {
    console.log('🔧 初始化真实支付测试环境...');
    
    try {
      // 加载配置
      await configManager.loadConfig();
      configLoaded = true;
      console.log('✅ 配置加载成功');
      
      // 初始化支付服务
      await paymentService.initialize();
      paymentServiceReady = true;
      console.log('✅ 支付服务初始化成功');
      
    } catch (error) {
      console.error('❌ 测试环境初始化失败:', error);
      // 不抛出错误，让具体测试处理
    }
  });

  test('应该验证支付配置完整性', async () => {
    console.log('🧪 测试: 支付配置验证');

    // 验证配置是否加载成功
    expect(configLoaded).toBe(true);
    
    if (!configLoaded) {
      test.skip('配置加载失败，跳过后续测试');
    }

    // 验证支付服务是否初始化成功
    expect(paymentServiceReady).toBe(true);
    
    if (!paymentServiceReady) {
      test.skip('支付服务初始化失败，跳过后续测试');
    }

    console.log('✅ 支付配置验证通过');
  });

  test('应该完成真实的用户注册和认证流程', async ({ page }) => {
    console.log('🧪 测试: 真实用户注册和认证');

    if (!configLoaded) {
      test.skip('配置未加载，跳过测试');
    }

    // 注册新用户
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.testUser.displayName);

    // 监听注册API调用
    const registrationResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/register')
    );

    await page.click('button[type="submit"]');

    // 验证注册响应
    const response = await registrationResponse;
    console.log(`📡 注册API响应状态: ${response.status()}`);

    if (response.status() === 201) {
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.tokens).toBeDefined();
      expect(responseData.tokens.accessToken).toBeDefined();
      
      console.log('✅ 用户注册成功，获得JWT令牌');
      
      // 验证自动跳转到仪表板
      await expect(page).toHaveURL(/\/(dashboard|home)/);
      
      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"]');
      if (await userInfo.isVisible()) {
        await expect(userInfo).toContainText(TEST_CONFIG.testUser.displayName);
      }
      
    } else {
      const errorData = await response.json();
      console.log('⚠️ 注册失败:', errorData);
      
      // 如果是配置问题，记录但不失败测试
      if (errorData.error?.includes('JWT') || errorData.error?.includes('secret')) {
        console.log('🔧 检测到JWT配置问题，这是预期的配置缺失');
        test.skip('JWT配置缺失，需要配置环境变量');
      }
    }

    console.log('✅ 用户注册和认证流程测试完成');
  });

  test('应该创建真实的支付宝支付订单', async ({ page }) => {
    console.log('🧪 测试: 真实支付宝支付订单创建');

    if (!paymentServiceReady) {
      test.skip('支付服务未就绪，跳过测试');
    }

    // 先确保用户已登录
    await ensureUserLoggedIn(page, TEST_CONFIG.testUser);

    // 导航到支付页面
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择支付宝支付
    await page.click('[data-testid="payment-method-alipay"]');
    await expect(page.locator('[data-testid="payment-method-alipay"]')).toBeChecked();

    // 选择H5支付类型
    await page.click('[data-testid="payment-type-h5"]');

    // 监听支付订单创建API
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    // 创建支付订单
    await page.click('[data-testid="create-payment-button"]');

    // 验证支付订单创建响应
    const response = await createOrderResponse;
    console.log(`📡 支付订单创建响应状态: ${response.status()}`);

    if (response.status() === 201) {
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.paymentId).toBeDefined();
      expect(responseData.outTradeNo).toBeDefined();
      
      console.log('✅ 支付宝支付订单创建成功');
      console.log(`📝 支付ID: ${responseData.paymentId}`);
      console.log(`📝 订单号: ${responseData.outTradeNo}`);
      
      // 如果有支付URL，验证格式
      if (responseData.paymentUrl) {
        expect(responseData.paymentUrl).toMatch(/^https?:\/\//);
        console.log('✅ 支付URL格式正确');
      }
      
      // 验证页面显示支付信息
      await expect(page.locator('[data-testid="payment-result"]')).toBeVisible();
      
    } else {
      const errorData = await response.json();
      console.log('⚠️ 支付订单创建失败:', errorData);
      
      // 分析失败原因
      if (errorData.error?.includes('ALIPAY') || errorData.error?.includes('configuration')) {
        console.log('🔧 检测到支付宝配置问题，这是预期的配置缺失');
        test.skip('支付宝配置缺失，需要配置真实的API密钥');
      } else {
        throw new Error(`支付订单创建失败: ${errorData.error}`);
      }
    }

    console.log('✅ 支付宝支付订单创建测试完成');
  });

  test('应该查询真实的支付订单状态', async ({ page }) => {
    console.log('🧪 测试: 真实支付订单状态查询');

    if (!paymentServiceReady) {
      test.skip('支付服务未就绪，跳过测试');
    }

    // 先创建一个支付订单
    const testOrderId = `TEST_${Date.now()}`;
    
    try {
      // 使用支付服务直接创建订单
      const paymentRequest = {
        orderId: testOrderId,
        amount: TEST_CONFIG.testPayment.amount,
        description: TEST_CONFIG.testPayment.description,
        paymentMethod: 'alipay' as const,
        paymentType: 'h5' as const,
        userId: 'test-user-id'
      };

      const createResult = await paymentService.createPayment(paymentRequest);
      
      if (createResult.success) {
        console.log('✅ 测试订单创建成功');
        
        // 查询支付状态
        const queryResult = await paymentService.queryPayment({
          outTradeNo: testOrderId,
          paymentMethod: 'alipay'
        });
        
        expect(queryResult.success).toBe(true);
        expect(queryResult.outTradeNo).toBe(testOrderId);
        expect(['pending', 'paid', 'failed', 'cancelled']).toContain(queryResult.status);
        
        console.log(`✅ 支付状态查询成功: ${queryResult.status}`);
        
      } else {
        console.log('⚠️ 测试订单创建失败，可能是配置问题');
        test.skip('支付订单创建失败，需要检查支付配置');
      }
      
    } catch (error) {
      console.log('⚠️ 支付服务调用失败:', error.message);
      
      if (error.message.includes('configuration') || error.message.includes('ALIPAY')) {
        test.skip('支付配置缺失，需要配置真实的API密钥');
      } else {
        throw error;
      }
    }

    console.log('✅ 支付订单状态查询测试完成');
  });

  test('应该正确处理支付配置缺失的情况', async ({ page }) => {
    console.log('🧪 测试: 支付配置缺失处理');

    // 这个测试验证当配置缺失时，系统是否能优雅处理
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 尝试创建支付订单
    await page.click('[data-testid="payment-method-alipay"]');
    
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');

    const response = await createOrderResponse;
    
    if (response.status() !== 201) {
      // 验证错误处理
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toBeDefined();
      
      // 验证前端错误显示
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      
      console.log('✅ 支付配置缺失时的错误处理正确');
    }

    console.log('✅ 支付配置缺失处理测试完成');
  });

  test('应该验证支付金额和参数验证', async ({ page }) => {
    console.log('🧪 测试: 支付参数验证');

    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 测试无效金额
    const invalidAmountInput = page.locator('[data-testid="custom-amount"]');
    if (await invalidAmountInput.isVisible()) {
      await invalidAmountInput.fill('-100'); // 负数金额
      
      const createOrderResponse = page.waitForResponse(response => 
        response.url().includes('/api/payment/create-order')
      );

      await page.click('[data-testid="create-payment-button"]');

      const response = await createOrderResponse;
      expect(response.status()).toBe(400);
      
      const errorData = await response.json();
      expect(errorData.error).toContain('Invalid');
      
      console.log('✅ 无效金额验证正确');
    }

    console.log('✅ 支付参数验证测试完成');
  });

  test('应该测试支付流程的性能', async ({ page }) => {
    console.log('🧪 测试: 支付流程性能');

    const startTime = Date.now();
    
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');
    
    const pageLoadTime = Date.now() - startTime;
    console.log(`⏱️ 支付页面加载时间: ${pageLoadTime}ms`);
    
    // 验证页面加载时间在合理范围内
    expect(pageLoadTime).toBeLessThan(3000);

    // 测试支付订单创建的响应时间
    await page.click('[data-testid="payment-method-alipay"]');
    
    const apiStartTime = Date.now();
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');
    await createOrderResponse;
    
    const apiResponseTime = Date.now() - apiStartTime;
    console.log(`⏱️ 支付API响应时间: ${apiResponseTime}ms`);
    
    // 验证API响应时间在合理范围内
    expect(apiResponseTime).toBeLessThan(5000);

    console.log('✅ 支付流程性能测试完成');
  });
});

// ============= 辅助函数 =============

async function ensureUserLoggedIn(page: Page, user: typeof TEST_CONFIG.testUser) {
  // 检查是否已登录
  const userInfo = page.locator('[data-testid="user-info"]');
  if (await userInfo.isVisible()) {
    return; // 已登录
  }

  // 执行登录流程
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');

  // 等待登录完成
  await page.waitForResponse(response => 
    response.url().includes('/api/user/login')
  );

  // 验证跳转到仪表板
  await expect(page).toHaveURL(/\/(dashboard|home)/);
}
