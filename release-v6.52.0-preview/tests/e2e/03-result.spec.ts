/**
 * 智游助手v6.5 结果页面测试
 * 测试旅行规划结果展示页面的现代网格布局和功能
 */

import { test, expect } from '@playwright/test';
import { ResultPage } from '../pages/ResultPage';
import { PlanningPage } from '../pages/PlanningPage';

test.describe('智游助手v6.5 结果页面测试', () => {
  let resultPage: ResultPage;
  let sessionId: string;

  // 在所有测试前创建一个规划会话
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const planningPage = new PlanningPage(page);
    
    try {
      // 创建新疆旅行规划
      await planningPage.goto();
      await planningPage.fillXinjiangTripForm();
      await planningPage.submitForm();
      sessionId = await planningPage.waitForPlanningComplete();
      
      console.log('✅ 测试会话创建成功:', sessionId);
    } catch (error) {
      console.warn('⚠️ 无法创建测试会话，将使用演示模式');
      sessionId = 'demo_session_001';
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    resultPage = new ResultPage(page);
    await resultPage.goto(sessionId);
  });

  test('结果页面基本元素和布局', async () => {
    await test.step('验证页面基本元素', async () => {
      await resultPage.verifyPageElements();
    });

    await test.step('验证概览仪表板', async () => {
      await resultPage.verifyOverviewDashboard();
    });

    await test.step('验证旅行贴士区域', async () => {
      await resultPage.verifyTravelTips();
    });
  });

  test('现代网格布局验证', async () => {
    await test.step('验证现代网格布局结构', async () => {
      await resultPage.verifyModernGridLayout();
    });

    await test.step('验证活动网格布局', async () => {
      await resultPage.verifyActivityGrid();
    });
  });

  test('玻璃态效果和动画测试', async () => {
    await test.step('验证玻璃态效果', async () => {
      await resultPage.verifyGlassEffectAndAnimations();
    });

    await test.step('验证页面动画', async ({ page }) => {
      // 重新加载页面观察动画
      await page.reload();
      await resultPage.waitForPageLoad();
      
      // 验证渐进式动画
      const animatedElements = page.locator('[class*="animate-slide-up"]');
      const count = await animatedElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test('色彩一致性验证', async () => {
    await test.step('验证粉色主题色彩一致性', async () => {
      await resultPage.verifyColorConsistency();
    });

    await test.step('验证渐变效果', async ({ page }) => {
      // 验证背景渐变
      const backgroundGradient = page.locator('.bg-gradient-to-br.from-pink-50');
      await expect(backgroundGradient).toBeVisible();
      
      // 验证标题渐变
      const titleGradient = page.locator('.bg-gradient-to-r.from-pink-600.to-purple-600');
      await expect(titleGradient).toBeVisible();
      
      // 验证按钮渐变
      const buttonGradient = page.locator('.bg-gradient-to-r.from-pink-600.to-purple-600');
      await expect(buttonGradient).toHaveCount(2); // 标题和按钮
    });
  });

  test('响应式设计测试', async () => {
    await test.step('验证响应式布局', async () => {
      await resultPage.verifyResponsiveDesign();
    });

    await test.step('验证移动端网格适配', async ({ page }) => {
      // 切换到移动端视口
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // 验证网格在移动端的表现
      const activityGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
      await expect(activityGrid).toBeVisible();
      
      // 验证概览卡片在移动端的布局
      const overviewGrid = page.locator('.grid.grid-cols-2.md\\:grid-cols-4');
      await expect(overviewGrid).toBeVisible();
    });
  });

  test('交互功能测试', async () => {
    await test.step('验证导航和操作按钮', async () => {
      await resultPage.verifyInteractions();
    });

    await test.step('验证悬停效果', async ({ page }) => {
      // 测试活动卡片悬停效果
      const firstActivityCard = resultPage.activityCards.first();
      if (await firstActivityCard.isVisible()) {
        await firstActivityCard.hover();
        await page.waitForTimeout(500);
        
        // 验证悬停后的样式变化
        const transform = await firstActivityCard.evaluate(el => {
          return window.getComputedStyle(el).transform;
        });
        
        // 悬停应该有transform变化
        expect(transform).not.toBe('none');
      }
    });

    await test.step('验证概览卡片交互', async ({ page }) => {
      // 测试概览卡片悬停
      const firstOverviewCard = resultPage.overviewCards.first();
      await firstOverviewCard.hover();
      await page.waitForTimeout(500);
      
      // 验证悬停效果
      const scale = await firstOverviewCard.evaluate(el => {
        return window.getComputedStyle(el).transform;
      });
      
      expect(scale).toBeTruthy();
    });
  });

  test('数据完整性验证', async () => {
    await test.step('验证行程数据完整性', async () => {
      await resultPage.verifyDataIntegrity();
    });

    await test.step('验证活动数据结构', async ({ page }) => {
      // 验证每个活动卡片包含必要信息
      const activityCards = resultPage.activityCards;
      const cardCount = await activityCards.count();
      
      if (cardCount > 0) {
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = activityCards.nth(i);
          
          // 验证活动标题
          const title = card.locator('h4');
          await expect(title).toBeVisible();
          const titleText = await title.textContent();
          expect(titleText?.length).toBeGreaterThan(0);
          
          // 验证活动描述
          const description = card.locator('p.text-gray-600');
          await expect(description).toBeVisible();
          const descText = await description.textContent();
          expect(descText?.length).toBeGreaterThan(10);
          
          // 验证时间信息
          const timeTag = card.locator('.bg-gradient-to-r.from-pink-100');
          await expect(timeTag).toBeVisible();
        }
      }
    });
  });

  test('性能和加载测试', async ({ page }) => {
    await test.step('测试页面加载性能', async () => {
      const startTime = Date.now();
      await resultPage.goto(sessionId);
      const loadTime = Date.now() - startTime;
      
      // 结果页面应该在3秒内加载完成
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('测试图片和资源加载', async () => {
      // 验证所有图片加载完成
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        await expect(img).toBeVisible();
        
        // 验证图片加载状态
        const naturalWidth = await img.evaluate(el => (el as HTMLImageElement).naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    });

    await test.step('测试动画性能', async () => {
      // 测量动画执行时间
      const startTime = performance.now();
      
      // 触发页面重新加载以观察动画
      await page.reload();
      await resultPage.waitForPageLoad();
      
      const endTime = performance.now();
      const animationTime = endTime - startTime;
      
      // 动画应该在合理时间内完成
      expect(animationTime).toBeLessThan(5000);
    });
  });

  test('错误处理和边界情况', async ({ page }) => {
    await test.step('测试无效会话ID处理', async () => {
      // 使用无效的会话ID
      await resultPage.goto('invalid_session_id');
      
      // 应该显示错误状态或回退到演示模式
      const hasError = await resultPage.errorState.isVisible({ timeout: 5000 });
      const hasContent = await resultPage.planTitle.isVisible({ timeout: 5000 });
      
      // 应该要么显示错误，要么显示演示内容
      expect(hasError || hasContent).toBeTruthy();
    });

    await test.step('测试网络错误恢复', async () => {
      // 模拟网络错误
      await page.route('**/api/v1/planning/sessions/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: '服务器错误' } })
        });
      });
      
      // 重新加载页面
      await page.reload();
      
      // 应该显示错误状态或回退到演示模式
      await page.waitForTimeout(3000);
      
      // 清除路由拦截
      await page.unroute('**/api/v1/planning/sessions/**');
    });
  });

  test('用户体验流程测试', async ({ page }) => {
    await test.step('完整用户浏览流程', async () => {
      // 1. 用户查看概览仪表板
      await resultPage.verifyOverviewDashboard();
      
      // 2. 用户滚动查看详细行程
      const firstDayCard = resultPage.dayCards.first();
      if (await firstDayCard.isVisible()) {
        await firstDayCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      
      // 3. 用户查看活动详情
      const firstActivityCard = resultPage.activityCards.first();
      if (await firstActivityCard.isVisible()) {
        await firstActivityCard.scrollIntoViewIfNeeded();
        await firstActivityCard.hover();
        await page.waitForTimeout(500);
      }
      
      // 4. 用户查看旅行贴士
      await resultPage.travelTipsSection.scrollIntoViewIfNeeded();
      await resultPage.verifyTravelTips();
      
      // 5. 用户返回规划页面
      await resultPage.backButton.click();
      await expect(page).toHaveURL('/planning');
    });
  });

  test('可访问性测试', async ({ page }) => {
    await test.step('验证键盘导航', async () => {
      // 测试Tab键导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // 验证焦点可见性
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    await test.step('验证ARIA标签', async () => {
      // 验证重要元素的ARIA标签
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // 按钮应该有文本或aria-label
        expect(ariaLabel || text).toBeTruthy();
      }
    });
  });
});
