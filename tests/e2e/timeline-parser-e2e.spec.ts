/**
 * 时间线解析器端到端测试
 * 使用Playwright进行完整用户流程测试
 */

import { test, expect, Page, Browser } from '@playwright/test';

// 测试数据
const TEST_DATA = {
  DESTINATIONS: ['成都', '北京', '上海', '西安'],
  TRAVEL_DAYS: [3, 5, 7, 10],
  GROUP_SIZES: [1, 2, 4, 6]
};

// 测试工具函数
const fillTravelForm = async (page: Page, destination: string, days: number, groupSize: number = 2) => {
  await page.fill('[data-testid="destination"]', destination);
  await page.fill('[data-testid="days"]', days.toString());
  await page.fill('[data-testid="group-size"]', groupSize.toString());
  await page.selectOption('[data-testid="travel-style"]', 'leisure');
};

const waitForPlanGeneration = async (page: Page, timeout: number = 30000) => {
  await page.waitForSelector('[data-testid="result-page"]', { timeout });
  await page.waitForLoadState('networkidle');
};

const verifyTimelineActivities = async (page: Page) => {
  const timelineActivities = page.locator('[data-testid="timeline-activity"]');
  const count = await timelineActivities.count();
  expect(count).toBeGreaterThan(0);
  
  // 验证每个活动都有必要的信息
  for (let i = 0; i < count; i++) {
    const activity = timelineActivities.nth(i);
    await expect(activity.locator('[data-testid="activity-title"]')).toBeVisible();
    await expect(activity.locator('[data-testid="activity-time"]')).toBeVisible();
    await expect(activity.locator('[data-testid="activity-description"]')).toBeVisible();
  }
  
  return count;
};

test.describe('时间线解析器E2E测试', () => {
  test.describe('完整用户流程测试', () => {
    test('E2E-001: 用户完整旅行规划流程', async ({ page }) => {
      // 1. 访问首页
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('智游助手');

      // 2. 填写旅行信息
      await fillTravelForm(page, '成都', 3, 2);

      // 3. 提交表单，开始生成计划
      await page.click('[data-testid="generate-plan"]');
      
      // 4. 等待跳转到生成页面
      await expect(page).toHaveURL(/.*generating.*/);
      await expect(page.locator('[data-testid="generating-status"]')).toBeVisible();

      // 5. 等待生成完成，跳转到结果页面
      await waitForPlanGeneration(page);
      await expect(page).toHaveURL(/.*result.*/);

      // 6. 验证时间线解析结果
      const activityCount = await verifyTimelineActivities(page);
      expect(activityCount).toBeGreaterThanOrEqual(3); // 至少3个时间段

      // 7. 验证活动详情展示
      await page.click('[data-testid="timeline-activity"]:first-child');
      await expect(page.locator('[data-testid="activity-details"]')).toBeVisible();

      // 8. 验证交互功能
      await page.click('[data-testid="edit-activity"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
    });

    test('E2E-002: 多目的地测试', async ({ page }) => {
      for (const destination of TEST_DATA.DESTINATIONS) {
        await page.goto('/');
        await fillTravelForm(page, destination, 5);
        await page.click('[data-testid="generate-plan"]');
        
        await waitForPlanGeneration(page);
        
        // 验证目的地相关的活动
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain(destination);
        
        const activityCount = await verifyTimelineActivities(page);
        expect(activityCount).toBeGreaterThan(0);
      }
    });

    test('E2E-003: 不同天数的行程测试', async ({ page }) => {
      for (const days of TEST_DATA.TRAVEL_DAYS) {
        await page.goto('/');
        await fillTravelForm(page, '北京', days);
        await page.click('[data-testid="generate-plan"]');
        
        await waitForPlanGeneration(page);
        
        // 验证天数相关的内容
        const dayHeaders = page.locator('[data-testid="day-header"]');
        const dayCount = await dayHeaders.count();
        expect(dayCount).toBeLessThanOrEqual(days); // 可能不是每天都有详细安排
        
        await verifyTimelineActivities(page);
      }
    });
  });

  test.describe('跨浏览器兼容性测试', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`E2E-004: ${browserName} 兼容性测试`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await page.goto('/');
          await fillTravelForm(page, '上海', 3);
          await page.click('[data-testid="generate-plan"]');
          
          await waitForPlanGeneration(page);
          
          // 验证时间线解析器在不同浏览器中正常工作
          const timelineElement = page.locator('[data-testid="timeline"]');
          await expect(timelineElement).toBeVisible();
          
          await verifyTimelineActivities(page);
          
          // 验证交互功能
          await page.click('[data-testid="timeline-activity"]:first-child');
          await expect(page.locator('[data-testid="activity-details"]')).toBeVisible();
          
        } finally {
          await context.close();
        }
      });
    });
  });

  test.describe('响应式设计测试', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      test(`E2E-005: ${viewport.name} 响应式测试`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await page.goto('/');
        await fillTravelForm(page, '西安', 4);
        await page.click('[data-testid="generate-plan"]');
        
        await waitForPlanGeneration(page);
        
        // 验证在不同屏幕尺寸下的显示效果
        const timeline = page.locator('[data-testid="timeline"]');
        await expect(timeline).toBeVisible();
        
        // 验证移动端的特殊交互
        if (viewport.width < 768) {
          // 移动端可能有不同的布局
          const mobileMenu = page.locator('[data-testid="mobile-menu"]');
          if (await mobileMenu.isVisible()) {
            await mobileMenu.click();
          }
        }
        
        await verifyTimelineActivities(page);
      });
    });
  });

  test.describe('错误处理和边界情况测试', () => {
    test('E2E-006: 网络错误处理', async ({ page }) => {
      // 模拟网络错误
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/');
      await fillTravelForm(page, '成都', 3);
      await page.click('[data-testid="generate-plan"]');
      
      // 验证错误处理
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('E2E-007: 无效输入处理', async ({ page }) => {
      await page.goto('/');
      
      // 测试空目的地
      await page.fill('[data-testid="destination"]', '');
      await page.click('[data-testid="generate-plan"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // 测试无效天数
      await page.fill('[data-testid="destination"]', '北京');
      await page.fill('[data-testid="days"]', '0');
      await page.click('[data-testid="generate-plan"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    test('E2E-008: 长时间加载处理', async ({ page }) => {
      // 模拟慢速网络
      await page.route('**/api/generate-plan', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒延迟
        await route.continue();
      });
      
      await page.goto('/');
      await fillTravelForm(page, '成都', 3);
      await page.click('[data-testid="generate-plan"]');
      
      // 验证加载状态显示
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-message"]')).toBeVisible();
      
      // 验证最终结果
      await waitForPlanGeneration(page, 10000);
      await verifyTimelineActivities(page);
    });
  });

  test.describe('特性开关E2E测试', () => {
    test('E2E-009: 新解析器特性开关测试', async ({ page }) => {
      // 测试启用新解析器
      await page.addInitScript(() => {
        window.localStorage.setItem('ENABLE_NEW_PARSER', 'true');
      });
      
      await page.goto('/');
      await fillTravelForm(page, '成都', 3);
      await page.click('[data-testid="generate-plan"]');
      
      await waitForPlanGeneration(page);
      await verifyTimelineActivities(page);
      
      // 验证新解析器的特有功能
      const enhancedFeatures = page.locator('[data-testid="enhanced-activity-info"]');
      if (await enhancedFeatures.count() > 0) {
        await expect(enhancedFeatures.first()).toBeVisible();
      }
    });

    test('E2E-010: 解析器降级测试', async ({ page }) => {
      // 模拟新解析器失败，应该降级到旧解析器
      await page.route('**/api/parse-timeline-v2', route => route.abort());
      
      await page.goto('/');
      await fillTravelForm(page, '北京', 3);
      await page.click('[data-testid="generate-plan"]');
      
      await waitForPlanGeneration(page);
      
      // 即使新解析器失败，也应该有结果
      await verifyTimelineActivities(page);
    });
  });

  test.describe('性能E2E测试', () => {
    test('E2E-011: 页面加载性能测试', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 页面应在3秒内加载完成
      
      // 测试生成计划的性能
      const generateStartTime = Date.now();
      await fillTravelForm(page, '成都', 3);
      await page.click('[data-testid="generate-plan"]');
      await waitForPlanGeneration(page);
      
      const generateTime = Date.now() - generateStartTime;
      expect(generateTime).toBeLessThan(30000); // 生成应在30秒内完成
      
      console.log(`页面加载时间: ${loadTime}ms, 计划生成时间: ${generateTime}ms`);
    });
  });
});
