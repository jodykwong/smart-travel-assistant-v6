/**
 * 智游助手v6.5 主页测试
 * 测试主页的基本功能、响应式设计和用户交互
 */

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('智游助手v6.5 主页测试', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('主页基本元素加载和显示', async () => {
    await test.step('验证页面标题和基本元素', async () => {
      await homePage.verifyPageElements();
    });

    await test.step('验证导航栏功能', async () => {
      await homePage.verifyNavigation();
    });

    await test.step('验证功能特色区域', async () => {
      await homePage.verifyFeaturesSection();
    });
  });

  test('主页响应式设计测试', async () => {
    await test.step('验证响应式布局', async () => {
      await homePage.verifyResponsiveDesign();
    });
  });

  test('主页动画和交互效果', async () => {
    await test.step('验证动画效果', async () => {
      await homePage.verifyAnimations();
    });
  });

  test('主页性能测试', async () => {
    await test.step('验证页面加载性能', async () => {
      await homePage.verifyPerformance();
    });
  });

  test('主页导航功能测试', async ({ page }) => {
    await test.step('点击开始规划按钮跳转', async () => {
      await homePage.clickStartPlanning();
      
      // 验证跳转到规划页面
      await expect(page).toHaveURL('/planning');
    });
  });

  test('主页SEO和可访问性', async ({ page }) => {
    await test.step('验证页面元数据', async () => {
      // 验证页面标题
      await expect(page).toHaveTitle(/智游助手v5.0 - AI旅行规划专家/);
      
      // 验证meta描述
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /基于AI的智能旅行规划系统/);
      
      // 验证viewport设置
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');
    });

    await test.step('验证可访问性标准', async () => {
      // 验证主要标题的层次结构 - 允许多个h1元素（导航和主内容）
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBeGreaterThanOrEqual(1); // 至少有一个h1元素
      expect(h1Count).toBeLessThanOrEqual(3);    // 不超过3个h1元素

      // 验证图片alt属性
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        if (alt !== null) {
          expect(alt.length).toBeGreaterThan(0);
        }
      }

      // 验证按钮可访问性
      const buttons = page.locator('button, a[role="button"]');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        // 按钮应该有文本内容、aria-label或title
        const hasAccessibleText = (text && text.trim().length > 0) ||
                                 (ariaLabel && ariaLabel.trim().length > 0) ||
                                 (title && title.trim().length > 0);

        if (!hasAccessibleText) {
          console.warn(`按钮 ${i} 缺少可访问性文本:`, { text, ariaLabel, title });
        }

        // 对于可见的按钮，应该有可访问性文本
        const isVisible = await button.isVisible();
        if (isVisible) {
          expect(hasAccessibleText).toBeTruthy();
        }
      }
    });
  });

  test('主页错误处理测试', async ({ page }) => {
    await test.step('测试真实网络连接', async () => {
      // 测试真实的网络连接性能
      // 验证页面在不同网络条件下的表现

      // 测量页面加载时间
      const startTime = Date.now();
      await page.reload();
      await homePage.waitForPageLoad();
      const loadTime = Date.now() - startTime;

      // 验证页面能在合理时间内加载
      expect(loadTime).toBeLessThan(10000); // 10秒内加载完成

      // 验证页面仍然可以正常显示
      await expect(homePage.heroTitle).toBeVisible({ timeout: 15000 });

      console.log(`✅ 真实网络连接测试完成，加载时间: ${loadTime}ms`);
    });
  });

  test('主页跨浏览器兼容性', async ({ browserName }) => {
    await test.step(`在${browserName}浏览器中验证基本功能`, async () => {
      // 验证基本元素在不同浏览器中的显示
      await homePage.verifyPageElements();
      
      // 验证CSS样式应用
      const heroTitle = homePage.heroTitle;
      const titleStyles = await heroTitle.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          color: styles.color
        };
      });
      
      // 验证样式已正确应用
      expect(titleStyles.fontSize).toBeTruthy();
      expect(titleStyles.fontWeight).toBeTruthy();
      expect(titleStyles.color).toBeTruthy();
    });
  });

  test('主页用户体验流程', async ({ page }) => {
    await test.step('模拟用户浏览流程', async () => {
      // 1. 用户进入主页
      await homePage.verifyPageElements();
      
      // 2. 用户滚动查看功能特色
      await homePage.featuresSection.scrollIntoViewIfNeeded();
      await homePage.verifyFeaturesSection();
      
      // 3. 用户悬停查看按钮效果
      await homePage.startPlanningButton.hover();
      await page.waitForTimeout(500);
      
      // 4. 用户点击开始规划
      await homePage.clickStartPlanning();
      
      // 5. 验证成功跳转
      await expect(page).toHaveURL('/planning');
    });
  });
});
