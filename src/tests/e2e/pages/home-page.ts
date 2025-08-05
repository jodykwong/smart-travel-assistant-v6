/**
 * 首页页面对象
 * 封装首页的所有交互操作
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class HomePage extends BasePage {
  // 页面元素定位器
  private readonly titleLocator: Locator;
  private readonly destinationInput: Locator;
  private readonly daysInput: Locator;
  private readonly groupSizeInput: Locator;
  private readonly travelStyleSelect: Locator;
  private readonly generateButton: Locator;
  private readonly validationError: Locator;

  constructor(page: Page) {
    super(page);

    // 初始化定位器 - 使用data-testid提高稳定性
    this.titleLocator = page.locator('[data-testid="progress-indicator"]'); // 进度指示器作为页面加载验证
    this.destinationInput = page.locator('[data-testid="destination-input"]');
    this.daysInput = page.locator('[data-testid="start-date-input"]'); // 出发日期
    this.groupSizeInput = page.locator('[data-testid="group-size-input"]');
    this.travelStyleSelect = page.locator('input[name="budget"][value="mid-range"]'); // 预算选项
    this.generateButton = page.locator('[data-testid="next-step-button"]');
    this.validationError = page.locator('.text-red-500, .text-red-600, [role="alert"]');
  }

  /**
   * 访问规划页面（实际的表单页面）
   */
  async visit() {
    await this.goto('/planning');
    await this.verifyPageLoaded();
  }

  /**
   * 验证规划页面已加载
   */
  async verifyPageLoaded() {
    // 等待页面加载并验证关键元素
    await this.page.waitForLoadState('networkidle');

    // 验证页面标题包含"智游助手"
    await expect(this.page).toHaveTitle(/智游助手/);

    // 验证表单元素存在
    await expect(this.destinationInput).toBeVisible();

    // 验证进度指示器存在
    await expect(this.titleLocator).toBeVisible();

    console.log('✅ 规划页面加载完成');
  }

  /**
   * 填写旅行表单（多步骤）
   */
  async fillTravelForm(options: {
    destination: string;
    days: number;
    groupSize?: number;
    travelStyle?: string;
  }) {
    const { destination, days, groupSize = 2 } = options;

    // 第一步：基本信息
    await this.destinationInput.fill(destination);

    // 计算日期
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1); // 明天
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days - 1);

    // 填写出发日期
    await this.daysInput.fill(startDate.toISOString().split('T')[0]);

    // 填写返回日期
    const endDateInput = this.page.locator('[data-testid="end-date-input"]');
    await endDateInput.fill(endDate.toISOString().split('T')[0]);

    // 填写人数
    await this.groupSizeInput.fill(groupSize.toString());

    // 点击下一步
    await this.generateButton.click();
    await this.page.waitForTimeout(1000); // 等待步骤切换

    // 第二步：预算和风格
    // 选择预算（默认选择中等预算）- 使用force点击解决遮挡问题
    const budgetOption = this.page.locator('input[name="budget"][value="mid-range"]');
    if (await budgetOption.isVisible()) {
      await budgetOption.click({ force: true });
    }

    // 选择旅行风格（默认选择文化）
    const cultureStyleCheckbox = this.page.locator('input[name="travelStyles"][value="culture"]');
    if (await cultureStyleCheckbox.isVisible()) {
      await cultureStyleCheckbox.click();
    }

    // 点击下一步
    const nextButton = this.page.locator('button:has-text("下一步")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await this.page.waitForTimeout(1000);
    }

    // 第三步：住宿偏好
    const hotelOption = this.page.locator('input[name="accommodation"][value="hotel"]');
    if (await hotelOption.isVisible()) {
      await hotelOption.click();
    }
  }

  /**
   * 提交表单生成计划
   */
  async generatePlan() {
    // 查找最终的生成按钮
    const finalButton = this.page.locator('button:has-text("生成旅行计划"), button:has-text("开始生成"), button:has-text("确认并生成"), button[type="submit"]').last();
    await finalButton.click();
  }

  /**
   * 验证表单验证错误
   */
  async verifyValidationError() {
    await expect(this.validationError).toBeVisible();
  }

  /**
   * 获取验证错误消息
   */
  async getValidationErrorMessage(): Promise<string> {
    return await this.validationError.textContent() || '';
  }

  /**
   * 验证表单字段是否可见（第一步的字段）
   */
  async verifyFormFields() {
    await expect(this.destinationInput).toBeVisible();
    await expect(this.daysInput).toBeVisible();
    await expect(this.groupSizeInput).toBeVisible();
    await expect(this.generateButton).toBeVisible();
    // 注意：预算选项在第二步才可见，不在第一步验证
  }

  /**
   * 清空表单
   */
  async clearForm() {
    await this.destinationInput.fill('');
    await this.daysInput.fill('');
    await this.groupSizeInput.fill('');
  }

  /**
   * 验证生成按钮状态
   */
  async verifyGenerateButtonEnabled() {
    await expect(this.generateButton).toBeEnabled();
  }

  async verifyGenerateButtonDisabled() {
    await expect(this.generateButton).toBeDisabled();
  }
}
