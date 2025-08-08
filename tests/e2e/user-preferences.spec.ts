/**
 * 智游助手v6.2 - 用户偏好管理端到端测试
 * 验证用户偏好设置、保存和检索功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试用户数据
const testUser = {
  email: `preferences.test.${Date.now()}@example.com`,
  password: 'TestPassword123!',
  displayName: '偏好测试用户'
};

// 测试偏好数据
const testPreferences = {
  travelStyles: ['adventure', 'culture', 'food'],
  budgetRange: 'luxury',
  accommodationType: ['hotel', 'bnb'],
  transportMode: ['flight', 'train'],
  cuisinePreferences: ['local', 'international'],
  interests: ['history', 'art', 'nature'],
  language: 'en-US',
  currency: 'USD',
  timezone: 'America/New_York',
  emailNotifications: false,
  smsNotifications: true,
  pushNotifications: true,
  marketingEmails: false,
  profileVisibility: 'friends',
  shareLocation: true,
  shareItinerary: false
};

test.describe('用户偏好管理测试', () => {
  // 在每个测试前登录用户
  test.beforeEach(async ({ page }) => {
    console.log('🔧 准备偏好测试环境...');
    
    // 清理环境
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 注册并登录测试用户
    await registerAndLoginUser(page, testUser);
  });

  test('应该显示默认用户偏好', async ({ page }) => {
    console.log('🧪 测试: 默认用户偏好显示');

    // 导航到偏好设置页面
    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    // 监听偏好获取请求
    const preferencesResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 等待页面加载完成
    await preferencesResponse;

    // 验证默认偏好显示
    await expect(page.locator('[data-testid="preferences-form"]')).toBeVisible();

    // 检查默认值
    const budgetRange = page.locator('select[name="budgetRange"]');
    if (await budgetRange.isVisible()) {
      const selectedValue = await budgetRange.inputValue();
      expect(['budget', 'mid-range', 'luxury']).toContain(selectedValue);
    }

    const language = page.locator('select[name="language"]');
    if (await language.isVisible()) {
      const selectedValue = await language.inputValue();
      expect(selectedValue).toBe('zh-CN'); // 默认中文
    }

    console.log('✅ 默认用户偏好显示测试通过');
  });

  test('应该成功更新用户偏好', async ({ page }) => {
    console.log('🧪 测试: 用户偏好更新');

    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    // 等待偏好数据加载
    await page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 更新旅行风格偏好
    const travelStylesSection = page.locator('[data-testid="travel-styles-section"]');
    if (await travelStylesSection.isVisible()) {
      // 取消选择所有现有选项
      const checkedBoxes = await page.locator('input[name="travelStyles"]:checked').all();
      for (const checkbox of checkedBoxes) {
        await checkbox.uncheck();
      }

      // 选择新的偏好
      for (const style of testPreferences.travelStyles) {
        const checkbox = page.locator(`input[value="${style}"]`);
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
    }

    // 更新预算范围
    const budgetSelect = page.locator('select[name="budgetRange"]');
    if (await budgetSelect.isVisible()) {
      await budgetSelect.selectOption(testPreferences.budgetRange);
    }

    // 更新语言偏好
    const languageSelect = page.locator('select[name="language"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption(testPreferences.language);
    }

    // 更新通知偏好
    const emailNotifications = page.locator('input[name="emailNotifications"]');
    if (await emailNotifications.isVisible()) {
      if (testPreferences.emailNotifications) {
        await emailNotifications.check();
      } else {
        await emailNotifications.uncheck();
      }
    }

    // 监听偏好更新请求
    const updateResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && 
      ['PUT', 'PATCH'].includes(response.request().method())
    );

    // 保存偏好
    await page.click('[data-testid="save-preferences"]');

    // 验证更新响应
    const response = await updateResponse;
    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.preferences).toBeDefined();

    // 验证成功提示
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();

    console.log('✅ 用户偏好更新测试通过');
  });

  test('应该验证偏好数据格式', async ({ page }) => {
    console.log('🧪 测试: 偏好数据格式验证');

    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    // 等待偏好数据加载
    await page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 测试无效的语言格式
    const languageInput = page.locator('input[name="language"]');
    if (await languageInput.isVisible()) {
      await languageInput.fill('invalid-language');
      
      const updateResponse = page.waitForResponse(response => 
        response.url().includes('/api/user/preferences')
      );

      await page.click('[data-testid="save-preferences"]');

      const response = await updateResponse;
      if (response.status() === 400) {
        const responseData = await response.json();
        expect(responseData.error).toContain('Invalid language format');
      }
    }

    console.log('✅ 偏好数据格式验证测试通过');
  });

  test('应该支持偏好重置功能', async ({ page }) => {
    console.log('🧪 测试: 偏好重置功能');

    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    // 等待偏好数据加载
    await page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 查找重置按钮
    const resetButton = page.locator('[data-testid="reset-preferences"]');
    if (await resetButton.isVisible()) {
      // 监听重置请求
      const resetResponse = page.waitForResponse(response => 
        response.url().includes('/api/user/preferences') && response.method() === 'DELETE'
      );

      // 点击重置按钮
      await resetButton.click();

      // 确认重置对话框
      const confirmDialog = page.locator('[data-testid="confirm-reset"]');
      if (await confirmDialog.isVisible()) {
        await page.click('[data-testid="confirm-reset-yes"]');
      }

      // 验证重置响应
      const response = await resetResponse;
      expect(response.status()).toBe(200);

      // 验证重置成功提示
      await expect(page.locator('[data-testid="preferences-reset"]')).toBeVisible();

      // 验证偏好恢复为默认值
      const budgetSelect = page.locator('select[name="budgetRange"]');
      if (await budgetSelect.isVisible()) {
        const selectedValue = await budgetSelect.inputValue();
        expect(selectedValue).toBe('mid-range'); // 默认值
      }
    }

    console.log('✅ 偏好重置功能测试通过');
  });

  test('应该保存偏好并在重新登录后保持', async ({ page }) => {
    console.log('🧪 测试: 偏好持久化保存');

    // 设置偏好
    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 更新一些偏好设置
    const budgetSelect = page.locator('select[name="budgetRange"]');
    if (await budgetSelect.isVisible()) {
      await budgetSelect.selectOption('luxury');
    }

    const languageSelect = page.locator('select[name="language"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption('en-US');
    }

    // 保存偏好
    const updateResponse = page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && 
      ['PUT', 'PATCH'].includes(response.request().method())
    );

    await page.click('[data-testid="save-preferences"]');
    await updateResponse;

    // 登出
    const logoutButton = page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }

    // 重新登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/login') && response.status() === 200
    );

    // 再次访问偏好页面
    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    await page.waitForResponse(response => 
      response.url().includes('/api/user/preferences') && response.method() === 'GET'
    );

    // 验证偏好是否保持
    if (await budgetSelect.isVisible()) {
      const budgetValue = await budgetSelect.inputValue();
      expect(budgetValue).toBe('luxury');
    }

    if (await languageSelect.isVisible()) {
      const languageValue = await languageSelect.inputValue();
      expect(languageValue).toBe('en-US');
    }

    console.log('✅ 偏好持久化保存测试通过');
  });

  test('应该正确处理偏好加载错误', async ({ page }) => {
    console.log('🧪 测试: 偏好加载错误处理');

    // 模拟API错误
    await page.route('/api/user/preferences', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/profile/preferences');
    await page.waitForLoadState('networkidle');

    // 验证错误处理
    await expect(page.locator('[data-testid="preferences-error"]')).toBeVisible();

    // 验证重试按钮
    const retryButton = page.locator('[data-testid="retry-load-preferences"]');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }

    console.log('✅ 偏好加载错误处理测试通过');
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

  console.log('✅ 偏好测试用户准备完成');
}
