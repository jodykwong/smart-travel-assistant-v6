import { test, expect } from '@playwright/test';

/**
 * 智游助手v6.2 用户认证功能全面测试
 * 测试范围：注册、登录、JWT认证、支付集成、安全性
 */

const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  TEST_USER: {
    email: 'test@smarttravel.com',
    password: 'TestPassword123!',
    displayName: '测试用户',
    phone: '13800138000'
  },
  WEAK_PASSWORD: '123456',
  INVALID_EMAIL: 'invalid-email',
  TIMEOUT: 30000
};

test.describe('智游助手v6.2 用户认证功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置超时时间
    test.setTimeout(TEST_CONFIG.TIMEOUT);
    
    // 清除本地存储和cookies
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // ============= 注册功能测试 =============

  test('用户注册页面正常加载和基础元素显示', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    
    // 验证页面标题
    await expect(page).toHaveTitle(/用户注册.*智游助手/);
    
    // 验证表单元素
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 验证链接到登录页面
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    
    console.log('✅ 注册页面基础元素验证通过');
  });

  test('用户注册表单验证功能', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    
    // 测试空表单提交
    await page.click('button[type="submit"]');
    
    // 验证HTML5表单验证
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const displayNameInput = page.locator('input[name="displayName"]');
    
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
    await expect(displayNameInput).toHaveAttribute('required');
    
    // 测试无效邮箱格式
    await emailInput.fill(TEST_CONFIG.INVALID_EMAIL);
    await passwordInput.fill(TEST_CONFIG.TEST_USER.password);
    await displayNameInput.fill(TEST_CONFIG.TEST_USER.displayName);
    
    await page.click('button[type="submit"]');
    
    // 验证邮箱格式验证
    const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValidity).toBe(false);
    
    console.log('✅ 注册表单验证功能测试通过');
  });

  test('用户注册成功流程', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    
    // 填写注册表单
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    
    // 监听网络请求
    const responsePromise = page.waitForResponse('/api/user/register');
    
    // 提交表单
    await page.click('button[type="submit"]');
    
    // 等待响应
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.user).toBeDefined();
    expect(responseData.tokens).toBeDefined();
    
    // 验证跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
    
    console.log('✅ 用户注册成功流程测试通过');
  });

  // ============= 登录功能测试 =============

  test('用户登录页面正常加载和基础元素显示', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    
    // 验证页面标题
    await expect(page).toHaveTitle(/用户登录.*智游助手/);
    
    // 验证表单元素
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 验证链接到注册页面
    await expect(page.locator('a[href="/register"]')).toBeVisible();
    
    console.log('✅ 登录页面基础元素验证通过');
  });

  test('用户登录验证功能', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    
    // 测试错误的登录信息
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    const responsePromise = page.waitForResponse('/api/user/login');
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    
    // 验证错误提示显示
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    
    console.log('✅ 登录验证功能测试通过');
  });

  test('用户登录成功流程', async ({ page }) => {
    // 首先注册一个用户
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    await page.click('button[type="submit"]');
    
    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 退出登录（清除状态）
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 现在测试登录
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    
    const responsePromise = page.waitForResponse('/api/user/login');
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.user).toBeDefined();
    expect(responseData.tokens).toBeDefined();
    
    // 验证跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
    
    console.log('✅ 用户登录成功流程测试通过');
  });

  // ============= JWT认证测试 =============

  test('JWT token生成和验证', async ({ page }) => {
    // 注册用户
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    
    const registerResponse = page.waitForResponse('/api/user/register');
    await page.click('button[type="submit"]');
    
    const response = await registerResponse;
    const responseData = await response.json();
    
    // 验证JWT token结构
    expect(responseData.tokens.accessToken).toBeDefined();
    expect(responseData.tokens.refreshToken).toBeDefined();
    expect(responseData.tokens.expiresIn).toBeGreaterThan(0);
    expect(responseData.tokens.tokenType).toBe('Bearer');
    
    // 验证token格式（JWT应该有三个部分，用.分隔）
    const tokenParts = responseData.tokens.accessToken.split('.');
    expect(tokenParts).toHaveLength(3);
    
    console.log('✅ JWT token生成和验证测试通过');
  });

  // ============= 支付功能集成测试 =============

  test('登录用户访问支付页面', async ({ page }) => {
    // 先登录
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    await page.click('button[type="submit"]');
    
    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 访问支付页面
    await page.goto(`${TEST_CONFIG.BASE_URL}/payment`);
    
    // 验证支付页面正常加载
    await expect(page).toHaveTitle(/支付中心/);
    await expect(page.locator('[data-testid="service-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-payment-button"]')).toBeVisible();
    
    console.log('✅ 登录用户访问支付页面测试通过');
  });

  test('未登录用户访问支付页面处理', async ({ page }) => {
    // 直接访问支付页面（未登录状态）
    await page.goto(`${TEST_CONFIG.BASE_URL}/payment`);
    
    // 支付页面应该正常加载（当前实现允许未登录用户访问）
    await expect(page).toHaveTitle(/支付中心/);
    
    // 但是创建支付订单时应该需要认证
    await page.click('[data-testid="create-payment-button"]');
    
    // 等待响应
    await page.waitForTimeout(2000);
    
    // 检查是否有错误提示或跳转到登录页面
    const currentUrl = page.url();
    const hasError = await page.locator('[data-testid="payment-error"]').isVisible();
    
    // 应该有错误提示或跳转到登录页面
    expect(hasError || currentUrl.includes('/login')).toBe(true);
    
    console.log('✅ 未登录用户访问支付页面处理测试通过');
  });

  // ============= 安全性测试 =============

  test('密码强度验证', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    
    // 测试弱密码
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.WEAK_PASSWORD);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    
    const responsePromise = page.waitForResponse('/api/user/register');
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('密码强度');
    
    console.log('✅ 密码强度验证测试通过');
  });

  test('登录失败次数限制', async ({ page }) => {
    // 先注册一个用户
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 清除登录状态
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 多次尝试错误密码登录
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
      await page.fill('input[name="password"]', 'wrongpassword');
      
      const responsePromise = page.waitForResponse('/api/user/login');
      await page.click('button[type="submit"]');
      
      const response = await responsePromise;
      
      if (i < 5) {
        expect(response.status()).toBe(401);
      } else {
        // 第6次应该被锁定
        expect(response.status()).toBe(423); // 423 Locked
        
        const responseData = await response.json();
        expect(responseData.lockInfo).toBeDefined();
        
        // 验证锁定提示显示
        await expect(page.locator('[data-testid="account-locked"]')).toBeVisible();
        break;
      }
      
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ 登录失败次数限制测试通过');
  });

  // ============= 会话管理测试 =============

  test('用户会话持久化', async ({ page }) => {
    // 注册并登录
    await page.goto(`${TEST_CONFIG.BASE_URL}/register`);
    await page.fill('input[name="email"]', TEST_CONFIG.TEST_USER.email);
    await page.fill('input[name="password"]', TEST_CONFIG.TEST_USER.password);
    await page.fill('input[name="displayName"]', TEST_CONFIG.TEST_USER.displayName);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 刷新页面，验证会话是否保持
    await page.reload();
    
    // 应该仍然在仪表板页面，而不是被重定向到登录页面
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 验证cookies中有认证信息
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name === 'accessToken' || cookie.name === 'refreshToken'
    );
    expect(hasAuthCookie).toBe(true);
    
    console.log('✅ 用户会话持久化测试通过');
  });
});
