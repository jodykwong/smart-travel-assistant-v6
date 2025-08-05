/**
 * 基础页面对象类
 * 提供所有页面对象的通用功能
 */

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到指定路径
   */
  async goto(path: string = '') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 等待元素可见
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 截图
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * 等待并点击元素
   */
  async clickElement(selector: string) {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  /**
   * 填写表单字段
   */
  async fillField(selector: string, value: string) {
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, value);
  }

  /**
   * 验证页面标题
   */
  async verifyTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * 验证URL包含指定路径
   */
  async verifyURL(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * 等待加载状态消失
   */
  async waitForLoadingToComplete() {
    try {
      await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
        state: 'hidden', 
        timeout: 30000 
      });
    } catch {
      // 如果没有加载指示器，继续执行
    }
  }

  /**
   * 检查错误消息
   */
  async checkForErrors() {
    const errorElements = await this.page.locator('[data-testid*="error"]').count();
    if (errorElements > 0) {
      const errorText = await this.page.locator('[data-testid*="error"]').first().textContent();
      console.warn('页面发现错误:', errorText);
    }
  }
}
