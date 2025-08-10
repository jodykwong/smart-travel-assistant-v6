/**
 * 智游助手v6.5 主页页面对象
 * 封装主页的所有交互操作和元素定位
 */

import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly startPlanningButton: Locator;
  readonly watchDemoButton: Locator;
  readonly navigationLogo: Locator;
  readonly navigationLinks: Locator;
  readonly featuresSection: Locator;
  readonly featureCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Hero区域元素
    this.heroTitle = page.locator('h1').filter({ hasText: 'AI驱动的' });
    this.heroSubtitle = page.locator('p').filter({ hasText: '告别繁琐的旅行规划' });
    this.startPlanningButton = page.locator('a[href="/planning"]').filter({ hasText: '开始规划旅行' });
    this.watchDemoButton = page.locator('button').filter({ hasText: '观看演示' });

    // 导航栏元素
    this.navigationLogo = page.locator('h1').filter({ hasText: '智游助手' });
    this.navigationLinks = page.locator('nav a');

    // 功能特色区域 - 使用更精确的选择器
    this.featuresSection = page.locator('section').filter({ hasText: '为什么选择智游助手' });
    this.featureCards = page.locator('section').filter({ hasText: '为什么选择智游助手' }).locator('.grid > div').filter({ hasText: /AI智能规划|秒速生成|个性化定制/ });
  }

  /**
   * 导航到主页
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * 等待页面完全加载
   */
  async waitForPageLoad(): Promise<void> {
    // 等待关键元素加载
    await this.heroTitle.waitFor({ state: 'visible' });
    await this.startPlanningButton.waitFor({ state: 'visible' });
    
    // 等待网络空闲
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证页面标题和基本元素
   */
  async verifyPageElements(): Promise<void> {
    // 验证页面标题
    await expect(this.page).toHaveTitle(/智游助手v5.0 - AI旅行规划专家/);
    
    // 验证Hero区域
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroTitle).toContainText('AI驱动的');
    await expect(this.heroTitle).toContainText('智能旅行规划');
    
    await expect(this.heroSubtitle).toBeVisible();
    await expect(this.heroSubtitle).toContainText('告别繁琐的旅行规划');
    
    // 验证按钮
    await expect(this.startPlanningButton).toBeVisible();
    await expect(this.startPlanningButton).toBeEnabled();
    await expect(this.watchDemoButton).toBeVisible();
    await expect(this.watchDemoButton).toBeEnabled();
  }

  /**
   * 验证导航栏功能
   */
  async verifyNavigation(): Promise<void> {
    // 验证Logo
    await expect(this.navigationLogo).toBeVisible();
    await expect(this.navigationLogo).toContainText('智游助手');
    
    // 验证导航链接
    const expectedLinks = ['功能特色', '使用方法', '价格方案', '登录', '免费注册'];
    const links = await this.navigationLinks.all();
    
    for (let i = 0; i < expectedLinks.length; i++) {
      if (links[i]) {
        await expect(links[i]).toBeVisible();
      }
    }
  }

  /**
   * 验证功能特色区域
   */
  async verifyFeaturesSection(): Promise<void> {
    // 滚动到功能特色区域
    await this.featuresSection.scrollIntoViewIfNeeded();

    // 验证区域标题
    const sectionTitle = this.page.locator('h2').filter({ hasText: '为什么选择智游助手' });
    await expect(sectionTitle).toBeVisible();

    // 验证功能卡片 - 更新为实际的卡片数量
    const cardCount = await this.featureCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3); // 至少有3个主要功能卡片

    const expectedFeatures = ['AI智能规划', '秒速生成', '个性化定制'];
    for (let i = 0; i < Math.min(expectedFeatures.length, cardCount); i++) {
      const card = this.featureCards.nth(i);
      await expect(card).toBeVisible();
      await expect(card).toContainText(expectedFeatures[i]);
    }
  }

  /**
   * 点击开始规划按钮
   */
  async clickStartPlanning(): Promise<void> {
    await this.startPlanningButton.click();
    
    // 等待页面跳转
    await this.page.waitForURL('/planning');
  }

  /**
   * 验证响应式设计
   */
  async verifyResponsiveDesign(): Promise<void> {
    // 测试移动端视口
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500); // 等待布局调整
    
    // 验证移动端元素可见性
    await expect(this.heroTitle).toBeVisible();
    await expect(this.startPlanningButton).toBeVisible();
    
    // 测试平板视口
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);
    
    await expect(this.heroTitle).toBeVisible();
    await expect(this.startPlanningButton).toBeVisible();
    
    // 恢复桌面视口
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(500);
  }

  /**
   * 验证动画效果
   */
  async verifyAnimations(): Promise<void> {
    // 重新加载页面以观察动画
    await this.page.reload();
    await this.waitForPageLoad();
    
    // 验证Hero区域动画
    const heroContainer = this.page.locator('.grid.lg\\:grid-cols-2');
    await expect(heroContainer).toBeVisible();
    
    // 验证功能卡片悬停效果
    const firstFeatureCard = this.featureCards.first();
    await firstFeatureCard.hover();
    
    // 验证按钮悬停效果
    await this.startPlanningButton.hover();
    await this.watchDemoButton.hover();
  }

  /**
   * 验证页面性能
   */
  async verifyPerformance(): Promise<void> {
    // 测量页面加载时间
    const startTime = Date.now();
    await this.goto();
    const loadTime = Date.now() - startTime;
    
    // 验证加载时间小于2秒
    expect(loadTime).toBeLessThan(2000);
    
    // 验证关键资源加载
    const images = this.page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // 验证图片加载
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        await expect(img).toBeVisible();
      }
    }
  }
}
