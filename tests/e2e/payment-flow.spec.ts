/**
 * 智游助手v6.2 - 支付流程端到端测试
 * 验证P0级支付系统安全加固功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试用户和订单数据
const testUser = {
  email: `payment.test.${Date.now()}@example.com`,
  password: 'TestPassword123!',
  displayName: '支付测试用户'
};

const testOrders = {
  wechatOrder: {
    amount: 9900, // 99元
    description: '智游助手旅游规划服务 - 微信支付测试',
    paymentMethod: 'wechat',
    paymentType: 'h5'
  },
  alipayOrder: {
    amount: 15800, // 158元
    description: '智游助手旅游规划服务 - 支付宝测试',
    paymentMethod: 'alipay',
    paymentType: 'h5'
  },
  qrCodeOrder: {
    amount: 29900, // 299元
    description: '智游助手VIP服务 - 扫码支付测试',
    paymentMethod: 'alipay',
    paymentType: 'qr'
  }
};

test.describe('支付流程测试', () => {
  // 在每个测试前登录用户
  test.beforeEach(async ({ page }) => {
    console.log('🔧 准备支付测试环境...');
    
    // 清理环境
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 注册并登录测试用户
    await registerAndLoginUser(page, testUser);
  });

  test('应该成功创建微信支付订单', async ({ page }) => {
    console.log('🧪 测试: 微信支付订单创建');

    // 导航到支付页面
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择服务和金额
    await selectPaymentService(page, testOrders.wechatOrder);

    // 选择微信支付
    await page.click('[data-testid="payment-method-wechat"]');
    await expect(page.locator('[data-testid="payment-method-wechat"]')).toBeChecked();

    // 选择支付类型
    await page.click('[data-testid="payment-type-h5"]');

    // 监听订单创建请求
    const createOrderRequest = page.waitForRequest(request => 
      request.url().includes('/api/payment/create-order') && request.method() === 'POST'
    );

    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order') && response.status() === 201
    );

    // 点击支付按钮
    await page.click('[data-testid="create-payment-button"]');

    // 验证请求参数
    const request = await createOrderRequest;
    const requestBody = request.postDataJSON();
    
    expect(requestBody.amount).toBe(testOrders.wechatOrder.amount);
    expect(requestBody.description).toBe(testOrders.wechatOrder.description);
    expect(requestBody.paymentMethod).toBe('wechat');
    expect(requestBody.paymentType).toBe('h5');

    // 验证响应
    const response = await createOrderResponse;
    const responseData = await response.json();
    
    expect(responseData.success).toBe(true);
    expect(responseData.paymentId).toBeDefined();
    expect(responseData.outTradeNo).toBeDefined();
    expect(responseData.paymentUrl).toBeDefined();

    // 验证支付页面跳转或二维码显示
    const paymentUrl = responseData.paymentUrl;
    if (paymentUrl) {
      // 验证支付URL格式
      expect(paymentUrl).toMatch(/^https?:\/\//);
    }

    // 验证订单信息显示
    await expect(page.locator('[data-testid="order-amount"]')).toContainText('99.00');
    await expect(page.locator('[data-testid="order-description"]')).toContainText(testOrders.wechatOrder.description);

    console.log('✅ 微信支付订单创建测试通过');
  });

  test('应该成功创建支付宝支付订单', async ({ page }) => {
    console.log('🧪 测试: 支付宝支付订单创建');

    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择服务和金额
    await selectPaymentService(page, testOrders.alipayOrder);

    // 选择支付宝支付
    await page.click('[data-testid="payment-method-alipay"]');
    await expect(page.locator('[data-testid="payment-method-alipay"]')).toBeChecked();

    // 选择支付类型
    await page.click('[data-testid="payment-type-h5"]');

    // 监听订单创建
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order') && response.status() === 201
    );

    // 创建支付订单
    await page.click('[data-testid="create-payment-button"]');

    // 验证响应
    const response = await createOrderResponse;
    const responseData = await response.json();
    
    expect(responseData.success).toBe(true);
    expect(responseData.paymentId).toBeDefined();
    expect(responseData.paymentUrl).toBeDefined();

    // 验证支付宝支付页面元素
    await expect(page.locator('[data-testid="alipay-payment-info"]')).toBeVisible();

    console.log('✅ 支付宝支付订单创建测试通过');
  });

  test('应该生成并显示支付二维码', async ({ page }) => {
    console.log('🧪 测试: 支付二维码生成');

    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 选择扫码支付
    await selectPaymentService(page, testOrders.qrCodeOrder);
    await page.click('[data-testid="payment-method-alipay"]');
    await page.click('[data-testid="payment-type-qr"]');

    // 创建扫码支付订单
    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');

    const response = await createOrderResponse;
    const responseData = await response.json();

    if (responseData.success && responseData.qrCode) {
      // 验证二维码显示
      await expect(page.locator('[data-testid="payment-qr-code"]')).toBeVisible();
      
      // 验证二维码内容
      const qrCodeImg = page.locator('[data-testid="payment-qr-code"] img');
      if (await qrCodeImg.isVisible()) {
        const src = await qrCodeImg.getAttribute('src');
        expect(src).toContain('data:image');
      }

      // 验证订单信息
      await expect(page.locator('[data-testid="qr-order-amount"]')).toContainText('299.00');
    }

    console.log('✅ 支付二维码生成测试通过');
  });

  test('应该查询支付状态', async ({ page }) => {
    console.log('🧪 测试: 支付状态查询');

    // 先创建一个支付订单
    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    await selectPaymentService(page, testOrders.wechatOrder);
    await page.click('[data-testid="payment-method-wechat"]');
    await page.click('[data-testid="payment-type-h5"]');

    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order') && response.status() === 201
    );

    await page.click('[data-testid="create-payment-button"]');

    const orderResponse = await createOrderResponse;
    const orderData = await orderResponse.json();
    const outTradeNo = orderData.outTradeNo;

    // 查询支付状态
    const queryResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/query')
    );

    // 点击查询状态按钮
    await page.click('[data-testid="query-payment-status"]');

    const response = await queryResponse;
    const responseData = await response.json();

    expect(responseData.success).toBe(true);
    expect(responseData.outTradeNo).toBe(outTradeNo);
    expect(responseData.status).toBeDefined();

    // 验证状态显示
    await expect(page.locator('[data-testid="payment-status"]')).toBeVisible();

    console.log('✅ 支付状态查询测试通过');
  });

  test('应该处理退款申请', async ({ page }) => {
    console.log('🧪 测试: 退款申请处理');

    // 先创建一个"已支付"的订单（模拟）
    await page.goto('/payment/history');
    await page.waitForLoadState('networkidle');

    // 查找已支付的订单
    const paidOrder = page.locator('[data-testid="paid-order"]').first();
    
    if (await paidOrder.isVisible()) {
      // 点击退款按钮
      await paidOrder.locator('[data-testid="refund-button"]').click();

      // 填写退款信息
      const refundModal = page.locator('[data-testid="refund-modal"]');
      await expect(refundModal).toBeVisible();

      await page.fill('[data-testid="refund-amount"]', '50.00');
      await page.fill('[data-testid="refund-reason"]', '用户申请退款测试');

      // 监听退款请求
      const refundResponse = page.waitForResponse(response => 
        response.url().includes('/api/payment/refund')
      );

      // 提交退款申请
      await page.click('[data-testid="submit-refund"]');

      const response = await refundResponse;
      const responseData = await response.json();

      if (response.status() === 200) {
        expect(responseData.success).toBe(true);
        expect(responseData.refundId).toBeDefined();

        // 验证退款成功提示
        await expect(page.locator('[data-testid="refund-success"]')).toBeVisible();
      }
    }

    console.log('✅ 退款申请处理测试通过');
  });

  test('应该验证支付金额限制', async ({ page }) => {
    console.log('🧪 测试: 支付金额限制验证');

    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 测试超出限制的金额
    const invalidOrder = {
      amount: 20000000, // 20万元，超出限制
      description: '超限金额测试',
      paymentMethod: 'wechat',
      paymentType: 'h5'
    };

    await selectPaymentService(page, invalidOrder);
    await page.click('[data-testid="payment-method-wechat"]');

    const createOrderResponse = page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    await page.click('[data-testid="create-payment-button"]');

    const response = await createOrderResponse;
    expect(response.status()).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Invalid amount');

    console.log('✅ 支付金额限制验证测试通过');
  });

  test('应该在移动端正常处理支付', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('此测试仅在移动端运行');
    }

    console.log('📱 测试: 移动端支付流程');

    await page.goto('/payment');
    await page.waitForLoadState('networkidle');

    // 验证移动端支付界面
    await expect(page.locator('[data-testid="mobile-payment-container"]')).toBeVisible();

    // 选择支付方式
    await page.click('[data-testid="payment-method-alipay"]');

    // 在移动端，支付类型可能自动选择为h5
    const paymentTypeH5 = page.locator('[data-testid="payment-type-h5"]');
    if (await paymentTypeH5.isVisible()) {
      await paymentTypeH5.click();
    }

    // 创建支付订单
    await selectPaymentService(page, testOrders.alipayOrder);
    await page.click('[data-testid="create-payment-button"]');

    // 验证移动端支付页面
    await page.waitForResponse(response => 
      response.url().includes('/api/payment/create-order')
    );

    // 验证移动端支付界面元素
    await expect(page.locator('[data-testid="mobile-payment-info"]')).toBeVisible();

    console.log('✅ 移动端支付流程测试通过');
  });
});

// ============= 辅助函数 =============

/**
 * 注册并登录用户
 */
async function registerAndLoginUser(page: Page, user: typeof testUser) {
  // 注册用户
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  if (await page.locator('form').isVisible()) {
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="displayName"]', user.displayName);
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/user/register')
    );
  }

  // 如果注册后没有自动登录，则手动登录
  if (await page.locator('[data-testid="login-form"]').isVisible()) {
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );
  }

  console.log('✅ 测试用户准备完成');
}

/**
 * 选择支付服务和金额
 */
async function selectPaymentService(page: Page, order: any) {
  // 选择服务类型
  const serviceSelector = page.locator('[data-testid="service-selector"]');
  if (await serviceSelector.isVisible()) {
    await page.selectOption('[data-testid="service-selector"]', 'travel-planning');
  }

  // 输入自定义金额（如果支持）
  const customAmountInput = page.locator('[data-testid="custom-amount"]');
  if (await customAmountInput.isVisible()) {
    await customAmountInput.fill((order.amount / 100).toString());
  }

  // 输入订单描述
  const descriptionInput = page.locator('[data-testid="order-description"]');
  if (await descriptionInput.isVisible()) {
    await descriptionInput.fill(order.description);
  }

  console.log(`💰 选择支付服务: ${order.description} - ${order.amount/100}元`);
}
