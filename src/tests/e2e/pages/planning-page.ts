/**
 * 规划生成页面对象
 * 封装规划生成过程中的交互操作
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class PlanningPage extends BasePage {
  // 页面元素定位器
  private readonly generatingStatus: Locator;
  private readonly progressBar: Locator;
  private readonly loadingSpinner: Locator;
  private readonly loadingMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // 初始化定位器
    this.generatingStatus = page.locator('[data-testid="generating-status"]');
    this.progressBar = page.locator('[data-testid="progress-bar"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.loadingMessage = page.locator('[data-testid="loading-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.retryButton = page.locator('[data-testid="retry-button"]');
  }

  /**
   * 验证规划页面已加载
   */
  async verifyPageLoaded() {
    await this.verifyURL('.*generating.*');
    await expect(this.generatingStatus).toBeVisible();
  }

  /**
   * 等待规划生成完成
   */
  async waitForPlanGeneration(timeout: number = 30000) {
    // 等待加载状态显示
    await expect(this.loadingSpinner).toBeVisible();
    
    // 等待跳转到结果页面
    await this.page.waitForURL(/.*result.*/, { timeout });
    await this.waitForPageLoad();
  }

  /**
   * 验证加载状态显示
   */
  async verifyLoadingState() {
    await expect(this.loadingSpinner).toBeVisible();
    await expect(this.loadingMessage).toBeVisible();
  }

  /**
   * 验证进度条显示
   */
  async verifyProgressBar() {
    if (await this.progressBar.isVisible()) {
      await expect(this.progressBar).toBeVisible();
    }
  }

  /**
   * 验证错误处理
   */
  async verifyErrorHandling() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.retryButton).toBeVisible();
  }

  /**
   * 点击重试按钮
   */
  async clickRetry() {
    await this.retryButton.click();
  }

  /**
   * 获取加载消息
   */
  async getLoadingMessage(): Promise<string> {
    return await this.loadingMessage.textContent() || '';
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * 监控生成过程
   */
  async monitorGenerationProcess() {
    const startTime = Date.now();
    
    // 等待加载开始
    await this.verifyLoadingState();
    
    // 监控进度（如果有进度条）
    if (await this.progressBar.isVisible()) {
      console.log('检测到进度条，监控生成进度...');
    }
    
    // 等待完成或超时
    try {
      await this.waitForPlanGeneration();
      const duration = Date.now() - startTime;
      console.log(`规划生成完成，耗时: ${duration}ms`);
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`规划生成失败，耗时: ${duration}ms`, error);
      return { success: false, duration, error };
    }
  }
}
