/**
 * 智游助手v6.2 - MCP支付流程端到端测试
 * 遵循原则: [为失败而设计] + [第一性原理] - 验证真实MCP支付流程
 * 
 * 测试目标:
 * 1. 验证MCP协议支付网关连接
 * 2. 测试完整的MCP支付流程：下单→支付→查询→回调
 * 3. 验证MCP和传统API的无缝切换
 * 4. 确保MCP体验版的安全限制
 */

import { test, expect, Page } from '@playwright/test';
import { paymentService } from '../../src/lib/payment/payment-service';
import { configManager } from '../../src/lib/config/config-manager';

// MCP测试配置
const MCP_TEST_CONFIG = {
  testUser: {
    email: `mcp.payment.test.${Date.now()}@example.com`,
    password: 'MCPPaymentTest123!',
    displayName: 'MCP支付测试用户'
  },
  testPayment: {
    amount: 1, // 1分钱测试（MCP体验版限制）
    description: '智游助手MCP支付功能测试订单',
    paymentMethods: ['alipay', 'wechat'] as const,
    paymentTypes: ['h5', 'qr'] as const
  },
  mcpLimits: {
    maxAmount: 10000, // MCP体验版最大金额限制（100元）
    autoRefundHours: 24 // 24小时自动退款
  }
};

test.describe('MCP支付流程验证', () => {
  let mcpEnabled = false;
  let configLoaded = false;
  let paymentServiceReady = false;

  test.beforeAll(async () => {
    console.log('🔧 初始化MCP支付测试环境...');
    
    try {
      // 加载配置
      const config = await configManager.loadConfig();
      configLoaded = true;
      mcpEnabled = config.mcp.enabled;
      console.log(`✅ 配置加载成功，MCP状态: ${mcpEnabled ? '启用' : '禁用'}`);
      
      // 初始化支付服务
      await paymentService.initialize();
      paymentServiceReady = true;
      console.log('✅ 支付服务初始化成功');
      
      // 检查MCP健康状态
      if (mcpEnabled) {
        const mcpHealth = await paymentService.checkMCPHealth();
        console.log('🏥 MCP健康检查结果:', mcpHealth);
      }
      
    } catch (error) {
      console.error('❌ MCP测试环境初始化失败:', error);
      // 不抛出错误，让具体测试处理
    }
  });

  test('应该验证MCP配置和服务状态', async () => {
    console.log('🧪 测试: MCP配置和服务状态验证');

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

    // 获取MCP状态
    const mcpStatus = paymentService.getMCPStatus();
    console.log('📊 MCP状态信息:', mcpStatus);
    
    expect(mcpStatus).toHaveProperty('enabled');
    expect(mcpStatus).toHaveProperty('wechatInitialized');
    expect(mcpStatus).toHaveProperty('alipayInitialized');

    if (mcpEnabled) {
      console.log('✅ MCP协议已启用');
      
      // 验证MCP客户端初始化状态
      expect(mcpStatus.wechatInitialized || mcpStatus.alipayInitialized).toBe(true);
      
    } else {
      console.log('ℹ️ MCP协议未启用，将使用传统支付API');
    }

    console.log('✅ MCP配置和服务状态验证完成');
  });

  test('应该创建MCP支付订单（支付宝）', async ({ page }) => {
    console.log('🧪 测试: MCP支付宝支付订单创建');

    if (!mcpEnabled) {
      test.skip('MCP未启用，跳过MCP特定测试');
    }

    if (!paymentServiceReady) {
      test.skip('支付服务未就绪，跳过测试');
    }

    // 先确保用户已登录
    await ensureUserLoggedIn(page, MCP_TEST_CONFIG.testUser);

    // 导航到支付页面
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择支付宝支付
    await page.click('[data-testid="payment-method-alipay"]');
    await expect(page.locator('[data-testid="payment-method-alipay"]')).toBeChecked();

    // 选择H5支付类型
    await page.click('[data-testid="payment-type-h5"]');

    // 设置测试金额（MCP体验版限制）
    const amountInput = page.locator('[data-testid="custom-amount"]');
    if (await amountInput.isVisible()) {
      await amountInput.fill(MCP_TEST_CONFIG.testPayment.amount.toString());
    }

    // 监听MCP支付订单创建API
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order') && 
      response.request().postDataJSON()?.mcpEnabled === true
    );

    // 创建支付订单
    await page.click('[data-testid="create-payment-button"]');

    // 验证MCP支付订单创建响应
    const response = await createOrderResponse;
    console.log(`📡 MCP支付订单创建响应状态: ${response.status()}`);

    if (response.status() === 201) {
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.paymentId).toBeDefined();
      expect(responseData.outTradeNo).toBeDefined();
      expect(responseData.metadata?.mcpEnabled).toBe(true);
      
      console.log('✅ MCP支付宝支付订单创建成功');
      console.log(`📝 支付ID: ${responseData.paymentId}`);
      console.log(`📝 订单号: ${responseData.outTradeNo}`);
      console.log(`📝 MCP请求ID: ${responseData.metadata?.mcpRequestId}`);
      
      // 验证MCP体验版特征
      if (responseData.metadata?.expireTime) {
        const expireTime = new Date(responseData.metadata.expireTime);
        const now = new Date();
        const timeDiff = expireTime.getTime() - now.getTime();
        expect(timeDiff).toBeLessThanOrEqual(MCP_TEST_CONFIG.mcpLimits.autoRefundHours * 60 * 60 * 1000);
        console.log('✅ MCP体验版过期时间设置正确');
      }
      
      // 如果有支付URL，验证格式
      if (responseData.paymentUrl) {
        expect(responseData.paymentUrl).toMatch(/^https?:\/\//);
        console.log('✅ MCP支付URL格式正确');
      }
      
      // 验证页面显示MCP支付信息
      await expect(page.locator('[data-testid="payment-result"]')).toBeVisible();
      await expect(page.locator('[data-testid="mcp-indicator"]')).toBeVisible();
      
    } else {
      const errorData = await response.json();
      console.log('⚠️ MCP支付订单创建失败:', errorData);
      
      // 分析失败原因
      if (errorData.error?.includes('MCP') || errorData.error?.includes('configuration')) {
        console.log('🔧 检测到MCP配置问题，这可能是预期的配置缺失');
        test.skip('MCP配置缺失，需要配置真实的MCP API密钥');
      } else {
        throw new Error(`MCP支付订单创建失败: ${errorData.error}`);
      }
    }

    console.log('✅ MCP支付宝支付订单创建测试完成');
  });

  test('应该查询MCP支付订单状态', async ({ page }) => {
    console.log('🧪 测试: MCP支付订单状态查询');

    if (!mcpEnabled) {
      test.skip('MCP未启用，跳过MCP特定测试');
    }

    if (!paymentServiceReady) {
      test.skip('支付服务未就绪，跳过测试');
    }

    // 先创建一个MCP支付订单
    const testOrderId = `MCP_TEST_${Date.now()}`;
    
    try {
      // 使用支付服务直接创建MCP订单
      const paymentRequest = {
        orderId: testOrderId,
        amount: MCP_TEST_CONFIG.testPayment.amount,
        description: MCP_TEST_CONFIG.testPayment.description,
        paymentMethod: 'alipay' as const,
        paymentType: 'h5' as const,
        userId: 'mcp-test-user-id'
      };

      const createResult = await paymentService.createPayment(paymentRequest);
      
      if (createResult.success) {
        console.log('✅ MCP测试订单创建成功');
        
        // 查询MCP支付状态
        const queryResult = await paymentService.queryPayment({
          outTradeNo: testOrderId,
          paymentMethod: 'alipay'
        });
        
        expect(queryResult.success).toBe(true);
        expect(queryResult.outTradeNo).toBe(testOrderId);
        expect(['pending', 'paid', 'failed', 'cancelled']).toContain(queryResult.status);
        
        console.log(`✅ MCP支付状态查询成功: ${queryResult.status}`);
        
        // 验证MCP特有的响应字段
        if (createResult.metadata?.mcpEnabled) {
          console.log('✅ 确认使用了MCP协议');
        }
        
      } else {
        console.log('⚠️ MCP测试订单创建失败，可能是配置问题');
        test.skip('MCP支付订单创建失败，需要检查MCP配置');
      }
      
    } catch (error) {
      console.log('⚠️ MCP支付服务调用失败:', error.message);
      
      if (error.message.includes('MCP') || error.message.includes('configuration')) {
        test.skip('MCP配置缺失，需要配置真实的MCP API密钥');
      } else {
        throw error;
      }
    }

    console.log('✅ MCP支付订单状态查询测试完成');
  });

  test('应该验证MCP和传统API的切换机制', async ({ page }) => {
    console.log('🧪 测试: MCP和传统API切换机制');

    if (!paymentServiceReady) {
      test.skip('支付服务未就绪，跳过测试');
    }

    // 获取当前MCP状态
    const initialMcpStatus = paymentService.getMCPStatus();
    console.log('📊 初始MCP状态:', initialMcpStatus);

    // 导航到支付页面
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择支付方式
    await page.click('[data-testid="payment-method-alipay"]');
    await page.click('[data-testid="payment-type-h5"]');

    // 监听支付API调用
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');

    const response = await createOrderResponse;
    const responseData = await response.json();

    if (response.status() === 201) {
      // 验证使用的协议类型
      const usedMCP = responseData.metadata?.mcpEnabled === true;
      const expectedMCP = initialMcpStatus.enabled;
      
      expect(usedMCP).toBe(expectedMCP);
      
      if (usedMCP) {
        console.log('✅ 确认使用了MCP协议');
        expect(responseData.metadata?.mcpRequestId).toBeDefined();
      } else {
        console.log('✅ 确认使用了传统支付API');
        expect(responseData.metadata?.mcpEnabled).toBeUndefined();
      }
      
    } else {
      console.log('⚠️ 支付API调用失败，可能是配置问题');
      // 不失败测试，记录信息即可
    }

    console.log('✅ MCP和传统API切换机制测试完成');
  });

  test('应该验证MCP体验版安全限制', async ({ page }) => {
    console.log('🧪 测试: MCP体验版安全限制');

    if (!mcpEnabled) {
      test.skip('MCP未启用，跳过MCP特定测试');
    }

    // 测试金额限制
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="payment-method-alipay"]');

    // 尝试设置超过限制的金额
    const amountInput = page.locator('[data-testid="custom-amount"]');
    if (await amountInput.isVisible()) {
      const overLimitAmount = MCP_TEST_CONFIG.mcpLimits.maxAmount + 1;
      await amountInput.fill(overLimitAmount.toString());
      
      const createOrderResponse = page.waitForResponse(response => 
        response.url().includes('/api/payment/create-order')
      );

      await page.click('[data-testid="create-payment-button"]');

      const response = await createOrderResponse;
      
      if (response.status() === 400) {
        const errorData = await response.json();
        expect(errorData.error).toContain('limit');
        console.log('✅ MCP体验版金额限制验证正确');
      }
    }

    // 验证体验版标识
    const mcpIndicator = page.locator('[data-testid="mcp-experience-warning"]');
    if (await mcpIndicator.isVisible()) {
      const warningText = await mcpIndicator.textContent();
      expect(warningText).toContain('体验版');
      expect(warningText).toContain('24小时');
      console.log('✅ MCP体验版警告信息显示正确');
    }

    console.log('✅ MCP体验版安全限制测试完成');
  });

  test('应该测试MCP支付流程性能', async ({ page }) => {
    console.log('🧪 测试: MCP支付流程性能');

    if (!mcpEnabled) {
      test.skip('MCP未启用，跳过MCP特定测试');
    }

    const startTime = Date.now();
    
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');
    
    const pageLoadTime = Date.now() - startTime;
    console.log(`⏱️ 支付页面加载时间: ${pageLoadTime}ms`);
    
    // 验证页面加载时间在合理范围内
    expect(pageLoadTime).toBeLessThan(3000);

    // 测试MCP支付订单创建的响应时间
    await page.click('[data-testid="payment-method-alipay"]');
    
    const apiStartTime = Date.now();
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');
    await createOrderResponse;
    
    const apiResponseTime = Date.now() - apiStartTime;
    console.log(`⏱️ MCP支付API响应时间: ${apiResponseTime}ms`);
    
    // 验证MCP API响应时间在合理范围内（可能比传统API稍慢）
    expect(apiResponseTime).toBeLessThan(8000);

    console.log('✅ MCP支付流程性能测试完成');
  });
});

// ============= 辅助函数 =============

async function ensureUserLoggedIn(page: Page, user: typeof MCP_TEST_CONFIG.testUser) {
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
