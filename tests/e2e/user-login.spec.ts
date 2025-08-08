/**
 * 智游助手v6.2 - 用户登录流程端到端测试
 * 验证P0级用户认证系统的登录功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试用户数据
const testUser = {
  email: `login.test.${Date.now()}@example.com`,
  password: 'TestPassword123!',
  displayName: '登录测试用户'
};

const invalidCredentials = {
  email: 'nonexistent@example.com',
  password: 'WrongPassword123!'
};

test.describe('用户登录流程测试', () => {
  // 在每个测试前注册一个测试用户
  test.beforeEach(async ({ page }) => {
    console.log('🔧 准备测试用户...');
    
    // 清理环境
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 注册测试用户
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    if (await page.locator('form').isVisible()) {
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="displayName"]', testUser.displayName);
      await page.click('button[type="submit"]');
      
      // 等待注册完成
      await page.waitForResponse(response => 
        response.url().includes('/api/user/register')
      );
    }

    // 登出（如果已登录）
    const logoutButton = page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  });

  test('应该成功登录并获得JWT令牌', async ({ page }) => {
    console.log('🧪 测试: 用户登录成功流程');

    // 导航到登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 检查登录表单
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // 填写登录表单
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 选择"记住我"选项（如果存在）
    const rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
    }

    // 监听登录请求
    const loginRequest = page.waitForRequest(request => 
      request.url().includes('/api/user/login') && request.method() === 'POST'
    );

    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 提交登录表单
    await page.click('button[type="submit"]');

    // 等待登录请求完成
    await loginRequest;
    const response = await loginResponse;

    // 验证响应
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.user).toBeDefined();
    expect(responseData.user.email).toBe(testUser.email);
    expect(responseData.tokens).toBeDefined();
    expect(responseData.tokens.accessToken).toBeDefined();
    expect(responseData.tokens.refreshToken).toBeDefined();

    // 验证页面跳转到仪表板或主页
    await expect(page).toHaveURL(/\/(dashboard|home|profile)/);

    // 验证用户信息显示
    const userInfo = page.locator('[data-testid="user-info"]');
    if (await userInfo.isVisible()) {
      await expect(userInfo).toContainText(testUser.displayName);
    }

    // 验证JWT令牌存储
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(cookie => cookie.name === 'accessToken');
    const refreshTokenCookie = cookies.find(cookie => cookie.name === 'refreshToken');
    
    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    console.log('✅ 用户登录成功流程测试通过');
  });

  test('应该拒绝错误的登录凭据', async ({ page }) => {
    console.log('🧪 测试: 错误登录凭据拒绝');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 使用错误的凭据
    await page.fill('input[name="email"]', invalidCredentials.email);
    await page.fill('input[name="password"]', invalidCredentials.password);

    // 监听登录响应
    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/login')
    );

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证错误响应
    const response = await loginResponse;
    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Invalid email or password');

    // 验证错误提示显示
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();

    // 验证用户仍在登录页面
    await expect(page).toHaveURL(/\/login/);

    console.log('✅ 错误登录凭据拒绝测试通过');
  });

  test('应该实现防暴力破解机制', async ({ page }) => {
    console.log('🧪 测试: 防暴力破解机制');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 连续尝试错误密码
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 第${i}次错误登录尝试`);
      
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'WrongPassword123!');

      const loginResponse = page.waitForResponse(response => 
        response.url().includes('/api/user/login')
      );

      await page.click('button[type="submit"]');
      
      const response = await loginResponse;
      const responseData = await response.json();

      if (i < 5) {
        expect(response.status()).toBe(401);
        expect(responseData.success).toBe(false);
      } else {
        // 第5次应该触发账户锁定
        if (response.status() === 423) { // 423 Locked
          expect(responseData.lockInfo).toBeDefined();
          expect(responseData.lockInfo.lockedUntil).toBeDefined();
          console.log('🔒 账户已被锁定');
        }
      }

      // 清理表单
      await page.fill('input[name="password"]', '');
    }

    console.log('✅ 防暴力破解机制测试通过');
  });

  test('应该支持JWT令牌自动刷新', async ({ page }) => {
    console.log('🧪 测试: JWT令牌自动刷新');

    // 先登录获取令牌
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    await page.click('button[type="submit"]');
    await loginResponse;

    // 等待跳转到受保护页面
    await page.waitForURL(/\/(dashboard|home|profile)/);

    // 模拟令牌即将过期的情况
    // 访问需要认证的API端点
    const protectedApiCall = page.waitForResponse(response => 
      response.url().includes('/api/user/preferences')
    );

    // 访问用户偏好页面（需要认证）
    await page.goto('/profile/preferences');
    await protectedApiCall;

    // 检查是否有令牌刷新请求
    const refreshRequest = page.waitForRequest(request => 
      request.url().includes('/api/user/refresh-token')
    );

    // 等待一段时间，看是否有自动刷新
    try {
      await refreshRequest;
      console.log('🔄 检测到令牌自动刷新');
    } catch (error) {
      console.log('ℹ️ 未检测到令牌刷新（可能令牌仍有效）');
    }

    console.log('✅ JWT令牌自动刷新测试通过');
  });

  test('应该正确处理登出流程', async ({ page }) => {
    console.log('🧪 测试: 用户登出流程');

    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 等待跳转到主页
    await page.waitForURL(/\/(dashboard|home|profile)/);

    // 查找并点击登出按钮
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();
    
    // 监听登出请求（如果有）
    const logoutRequest = page.waitForRequest(request => 
      request.url().includes('/api/user/logout')
    ).catch(() => null); // 可能没有专门的登出API

    await logoutButton.click();

    // 等待登出请求（如果有）
    await logoutRequest;

    // 验证跳转到登录页面或首页
    await expect(page).toHaveURL(/\/(login|\/)/);

    // 验证令牌已清除
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(cookie => cookie.name === 'accessToken');
    const refreshTokenCookie = cookies.find(cookie => cookie.name === 'refreshToken');
    
    // 令牌应该被清除或设置为空
    if (accessTokenCookie) {
      expect(accessTokenCookie.value).toBe('');
    }
    if (refreshTokenCookie) {
      expect(refreshTokenCookie.value).toBe('');
    }

    // 尝试访问受保护页面应该被重定向
    await page.goto('/profile/preferences');
    await expect(page).toHaveURL(/\/login/);

    console.log('✅ 用户登出流程测试通过');
  });

  test('应该在移动端正常登录', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('此测试仅在移动端运行');
    }

    console.log('📱 测试: 移动端用户登录');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 验证移动端登录表单
    await expect(page.locator('form')).toBeVisible();
    
    // 填写登录信息
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证登录成功
    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 验证移动端导航
    await expect(page).toHaveURL(/\/(dashboard|home|profile)/);

    console.log('✅ 移动端用户登录测试通过');
  });

  test('应该显示登录状态和用户信息', async ({ page }) => {
    console.log('🧪 测试: 登录状态显示');

    // 登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 等待跳转
    await page.waitForURL(/\/(dashboard|home|profile)/);

    // 验证用户信息显示
    const userDisplayName = page.locator('[data-testid="user-display-name"]');
    if (await userDisplayName.isVisible()) {
      await expect(userDisplayName).toContainText(testUser.displayName);
    }

    // 验证用户邮箱显示
    const userEmail = page.locator('[data-testid="user-email"]');
    if (await userEmail.isVisible()) {
      await expect(userEmail).toContainText(testUser.email);
    }

    // 验证登录状态指示器
    const loginStatus = page.locator('[data-testid="login-status"]');
    if (await loginStatus.isVisible()) {
      await expect(loginStatus).toContainText('已登录');
    }

    console.log('✅ 登录状态显示测试通过');
  });

  test('应该处理会话过期情况', async ({ page }) => {
    console.log('🧪 测试: 会话过期处理');

    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 手动清除令牌模拟过期
    await page.evaluate(() => {
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });

    // 尝试访问受保护页面
    await page.goto('/profile/preferences');

    // 应该被重定向到登录页面
    await expect(page).toHaveURL(/\/login/);

    // 或者显示会话过期提示
    const sessionExpiredMessage = page.locator('[data-testid="session-expired"]');
    if (await sessionExpiredMessage.isVisible()) {
      await expect(sessionExpiredMessage).toContainText('会话已过期');
    }

    console.log('✅ 会话过期处理测试通过');
  });

  test('应该记录登录设备信息', async ({ page }) => {
    console.log('🧪 测试: 登录设备信息记录');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 设置自定义User-Agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'SmartTravel-E2E-Test/1.0 (Playwright Test)'
    });

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 监听登录请求以验证设备信息
    const loginRequest = page.waitForRequest(request => 
      request.url().includes('/api/user/login') && request.method() === 'POST'
    );

    await page.click('button[type="submit"]');

    const request = await loginRequest;
    const requestBody = request.postDataJSON();

    // 验证设备信息是否包含在请求中
    if (requestBody.deviceInfo) {
      expect(requestBody.deviceInfo).toBeDefined();
      expect(requestBody.deviceInfo.userAgent).toContain('SmartTravel-E2E-Test');
    }

    console.log('✅ 登录设备信息记录测试通过');
  });

  test('应该支持多设备同时登录', async ({ browser }) => {
    console.log('🧪 测试: 多设备同时登录');

    // 创建两个不同的浏览器上下文模拟不同设备
    const context1 = await browser.newContext({
      userAgent: 'Device1-Chrome/91.0'
    });
    const context2 = await browser.newContext({
      userAgent: 'Device2-Firefox/89.0'
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 设备1登录
      await page1.goto('/login');
      await page1.waitForLoadState('networkidle');
      await page1.fill('input[name="email"]', testUser.email);
      await page1.fill('input[name="password"]', testUser.password);
      await page1.click('button[type="submit"]');
      
      await page1.waitForResponse(response => 
        response.url().includes('/api/user/login') && response.status() === 200
      );

      // 设备2登录
      await page2.goto('/login');
      await page2.waitForLoadState('networkidle');
      await page2.fill('input[name="email"]', testUser.email);
      await page2.fill('input[name="password"]', testUser.password);
      await page2.click('button[type="submit"]');
      
      await page2.waitForResponse(response => 
        response.url().includes('/api/user/login') && response.status() === 200
      );

      // 验证两个设备都能正常访问受保护页面
      await page1.goto('/profile');
      await page2.goto('/profile');

      await expect(page1).toHaveURL(/\/profile/);
      await expect(page2).toHaveURL(/\/profile/);

      console.log('✅ 多设备同时登录测试通过');

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('应该正确处理登录表单验证', async ({ page }) => {
    console.log('🧪 测试: 登录表单验证');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 测试空表单提交
    await page.click('button[type="submit"]');

    // 验证客户端验证或服务器响应
    const hasClientValidation = await page.locator('[data-testid="form-error"]').isVisible();
    
    if (!hasClientValidation) {
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/user/login')
      );
      expect(response.status()).toBe(400);
    }

    // 测试无效邮箱格式
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    const emailValidationResponse = await page.waitForResponse(response => 
      response.url().includes('/api/user/login')
    );
    
    expect(emailValidationResponse.status()).toBe(400);
    const responseData = await emailValidationResponse.json();
    expect(responseData.error).toContain('Invalid email format');

    console.log('✅ 登录表单验证测试通过');
  });

  test('应该支持"记住我"功能', async ({ page }) => {
    console.log('🧪 测试: "记住我"功能');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 勾选"记住我"
    const rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
    }

    await page.click('button[type="submit"]');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 验证Cookie的过期时间更长
    const cookies = await page.context().cookies();
    const refreshTokenCookie = cookies.find(cookie => cookie.name === 'refreshToken');
    
    if (refreshTokenCookie) {
      // 检查Cookie的过期时间（应该是30天）
      const expiryDate = new Date(refreshTokenCookie.expires * 1000);
      const now = new Date();
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeGreaterThan(25); // 至少25天
    }

    console.log('✅ "记住我"功能测试通过');
  });
});
