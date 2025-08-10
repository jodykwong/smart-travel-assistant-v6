/**
 * 智游助手v6.5 结果页面对象
 * 封装旅行规划结果展示页面的所有交互操作
 */

import { Page, Locator, expect } from '@playwright/test';

export class ResultPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly planTitle: Locator;
  readonly planSubtitle: Locator;
  readonly backButton: Locator;
  readonly shareButton: Locator;
  readonly favoriteButton: Locator;
  readonly exportButton: Locator;
  readonly overviewDashboard: Locator;
  readonly overviewCards: Locator;
  readonly dayCards: Locator;
  readonly activityCards: Locator;
  readonly travelTipsSection: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;

  constructor(page: Page) {
    this.page = page;

    // 页面基本元素
    this.pageTitle = page.locator('title');
    this.planTitle = page.locator('h1, h2, h3').first();
    this.planSubtitle = page.locator('p').filter({ hasText: /天.*预算.*人|Session not found|加载失败/ });

    // 导航和操作按钮
    this.backButton = page.locator('button').filter({ hasText: /返回|重新加载|返回规划页面/ });
    this.shareButton = page.locator('button[title="分享行程"], i.fa-share-alt').first();
    this.favoriteButton = page.locator('button[title="收藏行程"], i.fa-heart').first();
    this.exportButton = page.locator('button').filter({ hasText: '导出行程' });

    // 概览仪表板
    this.overviewDashboard = page.locator('.backdrop-blur-xl, .bg-white').first();
    this.overviewCards = page.locator('.grid.grid-cols-2.md\\:grid-cols-4 > div, .grid > div').filter({ hasText: /总天数|预算费用|出行人数|精选活动/ });

    // 行程内容
    this.dayCards = page.locator('[class*="animate-slide-up"], .day-card, [data-testid="day-card"]');
    this.activityCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3 > div, .activity-card, [data-testid="activity-card"]');

    // 旅行贴士
    this.travelTipsSection = page.locator('h3').filter({ hasText: '旅行贴士' }).locator('..');

    // 状态元素 - 更精确的选择器
    this.loadingState = page.locator('.animate-spin, .loading, [data-testid="loading"]');
    this.errorState = page.locator('h3').filter({ hasText: '加载失败' }).locator('..').or(page.locator('.text-red-500, .error'));
  }

  /**
   * 导航到结果页面
   */
  async goto(sessionId: string): Promise<void> {
    await this.page.goto(`/planning/result?sessionId=${sessionId}`);
    await this.waitForPageLoad();
  }

  /**
   * 等待页面完全加载 - 增强的等待策略
   */
  async waitForPageLoad(): Promise<void> {
    try {
      // 首先等待页面基本加载
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      // 检查是否有错误状态
      const hasError = await this.errorState.isVisible({ timeout: 3000 });

      if (hasError) {
        console.log('⚠️ 检测到错误状态，页面加载完成');
        return;
      }

      // 等待加载状态消失（如果存在）
      const hasLoadingState = await this.loadingState.isVisible({ timeout: 3000 });
      if (hasLoadingState) {
        await this.loadingState.waitFor({ state: 'hidden', timeout: 60000 });
      }

      // 等待主要内容加载
      await Promise.race([
        this.planTitle.waitFor({ state: 'visible', timeout: 15000 }),
        this.overviewDashboard.waitFor({ state: 'visible', timeout: 15000 })
      ]);

      // 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });

    } catch (error) {
      console.log('⚠️ 页面加载超时，检查是否为错误状态');
      // 如果超时，检查是否有错误状态
      const hasError = await this.errorState.isVisible({ timeout: 1000 });
      if (!hasError) {
        throw error; // 如果不是错误状态，重新抛出异常
      }
    }
  }

  /**
   * 验证页面基本元素
   */
  async verifyPageElements(): Promise<void> {
    // 验证页面标题
    await expect(this.pageTitle).toContainText('智游助手v6.5');
    
    // 验证计划标题和副标题
    await expect(this.planTitle).toBeVisible();
    await expect(this.planTitle).toContainText(/深度游|旅行|行程/);
    
    await expect(this.planSubtitle).toBeVisible();
    await expect(this.planSubtitle).toContainText(/天.*预算.*人/);
    
    // 验证操作按钮
    await expect(this.backButton).toBeVisible();
    await expect(this.backButton).toBeEnabled();
    await expect(this.exportButton).toBeVisible();
    await expect(this.exportButton).toBeEnabled();
  }

  /**
   * 验证概览仪表板
   */
  async verifyOverviewDashboard(): Promise<void> {
    await expect(this.overviewDashboard).toBeVisible();
    
    // 验证概览卡片数量
    await expect(this.overviewCards).toHaveCount(4);
    
    // 验证每个概览卡片的内容
    const expectedLabels = ['总天数', '预算费用', '出行人数', '精选活动'];
    
    for (let i = 0; i < expectedLabels.length; i++) {
      const card = this.overviewCards.nth(i);
      await expect(card).toBeVisible();
      await expect(card).toContainText(expectedLabels[i]);
      
      // 验证数值显示
      const valueElement = card.locator('.text-3xl.font-bold');
      await expect(valueElement).toBeVisible();
      await expect(valueElement).not.toBeEmpty();
    }
  }

  /**
   * 验证现代网格布局
   */
  async verifyModernGridLayout(): Promise<void> {
    // 验证日程卡片存在
    const dayCardCount = await this.dayCards.count();
    expect(dayCardCount).toBeGreaterThan(0);
    
    // 验证每日行程结构
    for (let i = 0; i < Math.min(dayCardCount, 3); i++) {
      const dayCard = this.dayCards.nth(i);
      await expect(dayCard).toBeVisible();
      
      // 验证日期标题
      const dayTitle = dayCard.locator('h3').filter({ hasText: /第.*天/ });
      await expect(dayTitle).toBeVisible();
      
      // 验证位置和天气信息
      const locationInfo = dayCard.locator('i.fa-map-marker-alt').locator('..');
      const weatherInfo = dayCard.locator('i.fa-thermometer-half').locator('..');
      
      await expect(locationInfo).toBeVisible();
      await expect(weatherInfo).toBeVisible();
    }
  }

  /**
   * 验证活动网格布局
   */
  async verifyActivityGrid(): Promise<void> {
    // 验证活动卡片存在
    const activityCardCount = await this.activityCards.count();
    expect(activityCardCount).toBeGreaterThan(0);
    
    // 验证前几个活动卡片的结构
    for (let i = 0; i < Math.min(activityCardCount, 6); i++) {
      const activityCard = this.activityCards.nth(i);
      await expect(activityCard).toBeVisible();
      
      // 验证活动图标
      const icon = activityCard.locator('.text-4xl').first();
      await expect(icon).toBeVisible();
      
      // 验证活动时间
      const timeTag = activityCard.locator('.bg-gradient-to-r.from-pink-100');
      await expect(timeTag).toBeVisible();
      
      // 验证活动标题
      const title = activityCard.locator('h4');
      await expect(title).toBeVisible();
      await expect(title).not.toBeEmpty();
      
      // 验证活动描述
      const description = activityCard.locator('p.text-gray-600');
      await expect(description).toBeVisible();
      await expect(description).not.toBeEmpty();
    }
  }

  /**
   * 验证旅行贴士区域
   */
  async verifyTravelTips(): Promise<void> {
    await expect(this.travelTipsSection).toBeVisible();
    
    // 验证贴士标题
    const tipsTitle = this.travelTipsSection.locator('h3');
    await expect(tipsTitle).toContainText('旅行贴士');
    
    // 验证贴士内容
    const tipItems = this.travelTipsSection.locator('.flex.items-start.gap-3');
    await expect(tipItems).toHaveCount(4);
    
    const expectedTips = ['最佳出行时间', '天气准备', '支付方式', '交通出行'];
    
    for (let i = 0; i < expectedTips.length; i++) {
      const tipItem = tipItems.nth(i);
      await expect(tipItem).toBeVisible();
      await expect(tipItem).toContainText(expectedTips[i]);
    }
  }

  /**
   * 验证玻璃态效果和动画
   */
  async verifyGlassEffectAndAnimations(): Promise<void> {
    // 验证玻璃态效果类名
    const glassElements = this.page.locator('.backdrop-blur-xl');
    const glassCount = await glassElements.count();
    expect(glassCount).toBeGreaterThan(0);
    
    // 验证动画类名
    const animatedElements = this.page.locator('[class*="animate-"]');
    const animatedCount = await animatedElements.count();
    expect(animatedCount).toBeGreaterThan(0);
    
    // 测试悬停效果
    const firstActivityCard = this.activityCards.first();
    if (await firstActivityCard.isVisible()) {
      await firstActivityCard.hover();
      // 悬停后应该有变化，这里主要验证不会出错
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 验证响应式设计
   */
  async verifyResponsiveDesign(): Promise<void> {
    // 移动端测试
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(1000);
    
    await expect(this.planTitle).toBeVisible();
    await expect(this.overviewDashboard).toBeVisible();
    
    // 验证移动端网格布局
    const mobileActivityCards = this.page.locator('.grid > div');
    const mobileCardCount = await mobileActivityCards.count();
    if (mobileCardCount > 0) {
      await expect(mobileActivityCards.first()).toBeVisible();
    }
    
    // 平板测试
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);
    
    await expect(this.planTitle).toBeVisible();
    await expect(this.overviewDashboard).toBeVisible();
    
    // 恢复桌面视口
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * 验证交互功能
   */
  async verifyInteractions(): Promise<void> {
    // 测试返回按钮
    await this.backButton.click();
    await this.page.waitForURL('/planning');
    
    // 返回结果页面
    await this.page.goBack();
    await this.waitForPageLoad();
    
    // 测试导出按钮（不实际下载）
    await this.exportButton.hover();
    
    // 测试分享和收藏按钮悬停
    if (await this.shareButton.isVisible()) {
      await this.shareButton.hover();
    }
    
    if (await this.favoriteButton.isVisible()) {
      await this.favoriteButton.hover();
    }
  }

  /**
   * 验证数据完整性
   */
  async verifyDataIntegrity(): Promise<void> {
    // 验证概览数据的一致性
    const totalDaysText = await this.overviewCards.nth(0).locator('.text-3xl').textContent();
    const totalDays = parseInt(totalDaysText || '0');
    expect(totalDays).toBeGreaterThan(0);
    
    // 验证预算数据
    const budgetText = await this.overviewCards.nth(1).locator('.text-3xl').textContent();
    expect(budgetText).toMatch(/¥\d+/);
    
    // 验证人数数据
    const groupSizeText = await this.overviewCards.nth(2).locator('.text-3xl').textContent();
    expect(groupSizeText).toMatch(/\d+人/);
    
    // 验证活动数量
    const activitiesText = await this.overviewCards.nth(3).locator('.text-3xl').textContent();
    const activitiesCount = parseInt(activitiesText || '0');
    expect(activitiesCount).toBeGreaterThan(0);
  }

  /**
   * 验证色彩一致性
   */
  async verifyColorConsistency(): Promise<void> {
    // 验证粉色主题的使用
    const pinkElements = this.page.locator('[class*="pink-"], [class*="from-pink-"]');
    const pinkCount = await pinkElements.count();
    expect(pinkCount).toBeGreaterThan(0);
    
    // 验证渐变背景
    const gradientBg = this.page.locator('.bg-gradient-to-br.from-pink-50');
    await expect(gradientBg).toBeVisible();
    
    // 验证标题渐变色
    const gradientTitle = this.page.locator('.bg-gradient-to-r.from-pink-600.to-purple-600');
    await expect(gradientTitle).toBeVisible();
  }
}
