/**
 * 结果页面对象
 * 封装旅行计划结果页面的交互操作
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export interface TimelineActivity {
  title: string;
  time: string;
  description: string;
  cost?: number;
  duration?: string;
}

export class ResultPage extends BasePage {
  // 页面元素定位器
  private readonly resultContainer: Locator;
  private readonly timeline: Locator;
  private readonly timelineActivities: Locator;
  private readonly dayHeaders: Locator;
  private readonly activityDetails: Locator;
  private readonly editModal: Locator;
  private readonly editButton: Locator;
  private readonly exportButton: Locator;
  private readonly shareButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // 初始化定位器
    this.resultContainer = page.locator('[data-testid="result-page"]');
    this.timeline = page.locator('[data-testid="timeline"]');
    this.timelineActivities = page.locator('[data-testid="timeline-activity"]');
    this.dayHeaders = page.locator('[data-testid="day-header"]');
    this.activityDetails = page.locator('[data-testid="activity-details"]');
    this.editModal = page.locator('[data-testid="edit-modal"]');
    this.editButton = page.locator('[data-testid="edit-activity"]');
    this.exportButton = page.locator('[data-testid="export-plan"]');
    this.shareButton = page.locator('[data-testid="share-plan"]');
  }

  /**
   * 验证结果页面已加载
   */
  async verifyPageLoaded() {
    await this.verifyURL('.*result.*');
    await expect(this.resultContainer).toBeVisible();
    await expect(this.timeline).toBeVisible();
  }

  /**
   * 验证时间线活动
   */
  async verifyTimelineActivities(): Promise<number> {
    const count = await this.timelineActivities.count();
    expect(count).toBeGreaterThan(0);
    
    // 验证每个活动都有必要的信息
    for (let i = 0; i < count; i++) {
      const activity = this.timelineActivities.nth(i);
      await expect(activity.locator('[data-testid="activity-title"]')).toBeVisible();
      await expect(activity.locator('[data-testid="activity-time"]')).toBeVisible();
      await expect(activity.locator('[data-testid="activity-description"]')).toBeVisible();
    }
    
    return count;
  }

  /**
   * 获取所有时间线活动信息
   */
  async getTimelineActivities(): Promise<TimelineActivity[]> {
    const activities: TimelineActivity[] = [];
    const count = await this.timelineActivities.count();
    
    for (let i = 0; i < count; i++) {
      const activity = this.timelineActivities.nth(i);
      
      const title = await activity.locator('[data-testid="activity-title"]').textContent() || '';
      const time = await activity.locator('[data-testid="activity-time"]').textContent() || '';
      const description = await activity.locator('[data-testid="activity-description"]').textContent() || '';
      
      // 可选字段
      const costElement = activity.locator('[data-testid="activity-cost"]');
      const durationElement = activity.locator('[data-testid="activity-duration"]');
      
      const cost = await costElement.isVisible() ? 
        parseInt(await costElement.textContent() || '0') : undefined;
      const duration = await durationElement.isVisible() ? 
        await durationElement.textContent() || undefined : undefined;
      
      activities.push({ title, time, description, cost, duration });
    }
    
    return activities;
  }

  /**
   * 点击第一个活动
   */
  async clickFirstActivity() {
    await this.timelineActivities.first().click();
  }

  /**
   * 点击指定索引的活动
   */
  async clickActivity(index: number) {
    await this.timelineActivities.nth(index).click();
  }

  /**
   * 验证活动详情显示
   */
  async verifyActivityDetails() {
    await expect(this.activityDetails).toBeVisible();
  }

  /**
   * 验证编辑功能
   */
  async verifyEditFunctionality() {
    await this.editButton.click();
    await expect(this.editModal).toBeVisible();
  }

  /**
   * 验证导出功能
   */
  async verifyExportFunctionality() {
    if (await this.exportButton.isVisible()) {
      await expect(this.exportButton).toBeEnabled();
    }
  }

  /**
   * 验证分享功能
   */
  async verifyShareFunctionality() {
    if (await this.shareButton.isVisible()) {
      await expect(this.shareButton).toBeEnabled();
    }
  }

  /**
   * 验证天数标题
   */
  async verifyDayHeaders(expectedDays: number) {
    const dayCount = await this.dayHeaders.count();
    expect(dayCount).toBeLessThanOrEqual(expectedDays);
    expect(dayCount).toBeGreaterThan(0);
  }

  /**
   * 验证特定目的地内容
   */
  async verifyDestinationContent(destination: string) {
    const pageContent = await this.page.textContent('body');
    expect(pageContent).toContain(destination);
  }

  /**
   * 验证增强功能（新解析器特有）
   */
  async verifyEnhancedFeatures() {
    const enhancedFeatures = this.page.locator('[data-testid="enhanced-activity-info"]');
    const count = await enhancedFeatures.count();
    
    if (count > 0) {
      await expect(enhancedFeatures.first()).toBeVisible();
      console.log(`发现 ${count} 个增强功能元素`);
      return true;
    }
    
    return false;
  }

  /**
   * 获取页面性能指标
   */
  async getPerformanceMetrics() {
    const performanceEntries = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    return performanceEntries;
  }
}
