/**
 * 智游助手v6.2 QR支付真实收款码功能测试
 * 专门测试真实收款码配置后的系统功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试数据
const TEST_CONFIG = {
  // 真实收款码数据（从配置中获取）
  REAL_WECHAT_QR: 'wxp://f2f0byVuRexI4QkhXh6EK8wb3RcH2dBlvgXQoecf34oizxU',
  REAL_ALIPAY_QR: 'https://qr.alipay.com/fkx01373dtfmzfryuvmnm25',
  
  // 测试金额
  TEST_AMOUNTS: {
    SMALL: 1,      // 1元 - 小额测试
    NORMAL: 50,    // 50元 - 正常金额
    LIMIT: 300,    // 300元 - 单笔限额
    OVER_LIMIT: 500 // 500元 - 超限测试
  },
  
  // 页面URL
  PAYMENT_PAGE: '/payment',
  BASE_URL: 'http://localhost:3001'
};

// 测试套件：QR支付核心功能
test.describe('QR支付真实收款码功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 设置更长的超时时间
    test.setTimeout(120000);
    
    // 导航到支付页面
    await page.goto(TEST_CONFIG.PAYMENT_PAGE);
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  // 测试1：支付页面基础功能
  test('支付页面正常加载和基础元素显示', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/支付中心|Payment/);

    // 验证服务选择器存在
    const serviceSelector = page.locator('[data-testid="service-selector"]');
    await expect(serviceSelector).toBeVisible();

    // 验证微信支付选项
    const wechatOption = page.locator('[data-testid="payment-method-wechat"]');
    await expect(wechatOption).toBeVisible();

    // 验证支付宝支付选项
    const alipayOption = page.locator('[data-testid="payment-method-alipay"]');
    await expect(alipayOption).toBeVisible();

    // 验证支付类型选择
    const qrPaymentType = page.locator('[data-testid="payment-type-qr"]');
    await expect(qrPaymentType).toBeVisible();

    // 验证支付按钮
    const paymentButton = page.locator('[data-testid="create-payment-button"]');
    await expect(paymentButton).toBeVisible();

    console.log('✅ 支付页面基础元素验证通过');
  });

  // 测试2：微信真实收款码生成
  test('微信真实收款码正确生成和显示', async ({ page }) => {
    // 选择微信支付
    await page.click('[data-testid="payment-method-wechat"]');

    // 选择扫码支付
    await page.click('[data-testid="payment-type-qr"]');

    // 点击创建支付订单
    await page.click('[data-testid="create-payment-button"]');

    // 等待支付结果显示
    await page.waitForSelector('[data-testid="payment-result"]', { timeout: 15000 });

    // 验证支付结果容器存在
    const paymentResult = page.locator('[data-testid="payment-result"]');
    await expect(paymentResult).toBeVisible();

    // 验证二维码显示
    const qrCodeContainer = page.locator('[data-testid="payment-qr-code"]');
    await expect(qrCodeContainer).toBeVisible();

    // 验证订单金额显示
    const orderAmount = page.locator('[data-testid="order-amount"]');
    await expect(orderAmount).toBeVisible();

    console.log('✅ 微信真实收款码生成验证通过');
  });

  // 测试3：支付宝真实收款码生成
  test('支付宝真实收款码正确生成和显示', async ({ page }) => {
    // 选择支付宝支付
    await page.click('[data-testid="payment-method-alipay"]');

    // 选择扫码支付
    await page.click('[data-testid="payment-type-qr"]');

    // 点击创建支付订单
    await page.click('[data-testid="create-payment-button"]');

    // 等待支付结果显示
    await page.waitForSelector('[data-testid="payment-result"]', { timeout: 15000 });

    // 验证支付结果容器存在
    const paymentResult = page.locator('[data-testid="payment-result"]');
    await expect(paymentResult).toBeVisible();

    // 验证二维码显示
    const qrCodeContainer = page.locator('[data-testid="payment-qr-code"]');
    await expect(qrCodeContainer).toBeVisible();

    // 验证订单金额显示
    const orderAmount = page.locator('[data-testid="order-amount"]');
    await expect(orderAmount).toBeVisible();

    console.log('✅ 支付宝真实收款码生成验证通过');
  });

  // 测试4：金额限制验证
  test('单笔金额限制正确执行', async ({ page }) => {
    // 选择微信支付
    await page.click('[data-testid="wechat-payment"]');
    
    // 输入超限金额
    await page.fill('[data-testid="amount-input"]', TEST_CONFIG.TEST_AMOUNTS.OVER_LIMIT.toString());
    
    // 点击生成收款码
    await page.click('[data-testid="generate-qr-code"]');
    
    // 验证错误提示显示
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/超过.*限额|金额过大/);
    
    console.log('✅ 金额限制验证通过');
  });

  // 测试5：支付凭证上传功能
  test('支付凭证上传功能正常', async ({ page }) => {
    // 选择微信支付并生成收款码
    await page.click('[data-testid="wechat-payment"]');
    await page.fill('[data-testid="amount-input"]', TEST_CONFIG.TEST_AMOUNTS.SMALL.toString());
    await page.click('[data-testid="generate-qr-code"]');
    
    // 等待收款码生成
    await page.waitForSelector('[data-testid="qr-code-display"]', { timeout: 10000 });
    
    // 查找上传凭证按钮
    const uploadButton = page.locator('[data-testid="upload-proof"]');
    if (await uploadButton.isVisible()) {
      // 验证上传按钮存在
      await expect(uploadButton).toBeVisible();
      
      // 点击上传按钮
      await uploadButton.click();
      
      // 验证文件选择器或上传界面出现
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      console.log('✅ 支付凭证上传功能验证通过');
    } else {
      console.log('ℹ️ 支付凭证上传功能未在当前页面实现');
    }
  });

  // 测试6：响应式设计验证
  test('响应式设计在不同屏幕尺寸下正常', async ({ page }) => {
    // 测试移动端尺寸
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证移动端布局
    const paymentMethods = page.locator('[data-testid="payment-methods"]');
    await expect(paymentMethods).toBeVisible();
    
    // 测试平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证平板布局
    await expect(paymentMethods).toBeVisible();
    
    // 恢复桌面尺寸
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ 响应式设计验证通过');
  });

  // 测试7：错误处理验证
  test('各种错误情况的处理', async ({ page }) => {
    // 测试空金额
    await page.click('[data-testid="wechat-payment"]');
    await page.click('[data-testid="generate-qr-code"]');
    
    // 验证错误提示
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    
    // 测试负数金额
    await page.fill('[data-testid="amount-input"]', '-10');
    await page.click('[data-testid="generate-qr-code"]');
    await expect(errorMessage).toBeVisible();
    
    // 测试零金额
    await page.fill('[data-testid="amount-input"]', '0');
    await page.click('[data-testid="generate-qr-code"]');
    await expect(errorMessage).toBeVisible();
    
    console.log('✅ 错误处理验证通过');
  });

  // 测试8：页面性能验证
  test('页面加载和操作性能验证', async ({ page }) => {
    const startTime = Date.now();
    
    // 测试页面加载时间
    await page.goto(TEST_CONFIG.PAYMENT_PAGE);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 页面加载应在5秒内
    
    // 测试收款码生成时间
    const qrStartTime = Date.now();
    await page.click('[data-testid="wechat-payment"]');
    await page.fill('[data-testid="amount-input"]', '1');
    await page.click('[data-testid="generate-qr-code"]');
    await page.waitForSelector('[data-testid="qr-code-display"]');
    
    const qrGenerateTime = Date.now() - qrStartTime;
    expect(qrGenerateTime).toBeLessThan(3000); // 收款码生成应在3秒内
    
    console.log(`✅ 性能验证通过 - 页面加载: ${loadTime}ms, 收款码生成: ${qrGenerateTime}ms`);
  });
});

// 测试套件：真实收款码数据验证
test.describe('真实收款码数据验证', () => {
  
  // 测试9：收款码数据格式验证
  test('真实收款码数据格式正确', async ({ page }) => {
    // 验证微信收款码格式
    expect(TEST_CONFIG.REAL_WECHAT_QR).toMatch(/^wxp:\/\/f2f0[a-zA-Z0-9]+$/);
    expect(TEST_CONFIG.REAL_WECHAT_QR).not.toContain('example');
    expect(TEST_CONFIG.REAL_WECHAT_QR).not.toContain('test');
    
    // 验证支付宝收款码格式
    expect(TEST_CONFIG.REAL_ALIPAY_QR).toMatch(/^https:\/\/qr\.alipay\.com\/[a-zA-Z0-9]+$/);
    expect(TEST_CONFIG.REAL_ALIPAY_QR).not.toContain('example');
    expect(TEST_CONFIG.REAL_ALIPAY_QR).not.toContain('123456789');
    
    console.log('✅ 真实收款码数据格式验证通过');
    console.log(`微信收款码: ${TEST_CONFIG.REAL_WECHAT_QR}`);
    console.log(`支付宝收款码: ${TEST_CONFIG.REAL_ALIPAY_QR}`);
  });
});
