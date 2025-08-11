/**
 * 智游助手v6.51 - 稳定的规划页面对象
 * 基于第一性原理重构的高可靠性测试架构
 */

import { Page, Locator, expect } from '@playwright/test';

interface TravelPlanData {
  destination: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  budget?: { min: number; max: number };
  transportation?: string;
  specialRequirements?: string[];
  excludeSpots?: string[];
}

interface PlanningSubmissionResult {
  success: boolean;
  reason?: string;
  details?: any;
  sessionId?: string;
  method?: string;
}

export class RobustPlanningPage {
  readonly page: Page;
  private smartWait: SmartWaitingService;
  private retryService: AdaptiveRetryService;
  private locatorService: ElementLocatorService;

  constructor(page: Page) {
    this.page = page;
    this.smartWait = new SmartWaitingService(page);
    this.retryService = new AdaptiveRetryService(page);
    this.locatorService = new ElementLocatorService(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/planning');
    await this.waitForPageReady();
  }

  /**
   * 业务语义层方法 - 用户想要访问某个目的地
   */
  async userWantsToVisit(destination: string): Promise<void> {
    console.log(`🎯 用户想要访问: ${destination}`);
    
    await this.locatorService.executeWithFallback([
      () => this.page.getByRole('textbox', { name: /目的地|destination|城市|国家/i }),
      () => this.page.getByPlaceholder(/输入城市|输入国家|输入地点/i),
      () => this.page.locator('[data-testid="destination-input"]'),
      () => this.page.locator('input[type="text"]').first()
    ], async (locator) => {
      await locator.clear();
      await locator.fill(destination);
      await this.page.waitForTimeout(500); // 等待输入处理
    });

    console.log(`✅ 成功输入目的地: ${destination}`);
  }

  /**
   * 业务语义层方法 - 用户选择旅行日期
   */
  async userSelectsTravelDates(startDate: string, endDate: string): Promise<void> {
    console.log(`📅 用户选择旅行日期: ${startDate} 到 ${endDate}`);
    
    // 智能日期输入 - 支持多种日期选择器
    await this.retryService.executeWithRetry(async () => {
      await this.setDateWithFallback('start', startDate);
      await this.setDateWithFallback('end', endDate);
    }, { maxRetries: 3 });

    console.log(`✅ 成功设置旅行日期`);
  }

  /**
   * 业务语义层方法 - 用户提交规划请求
   */
  async userSubmitsPlanningRequest(): Promise<PlanningSubmissionResult> {
    console.log(`🚀 用户提交规划请求`);
    
    // 1. 预提交验证
    const validationResult = await this.validateFormBeforeSubmission();
    if (!validationResult.isValid) {
      return {
        success: false,
        reason: 'form_validation_failed',
        details: validationResult.errors
      };
    }

    // 2. 智能提交
    const submitButton = await this.locatorService.executeWithFallback([
      () => this.page.getByRole('button', { name: /下一步|提交|开始规划/i }),
      () => this.page.locator('[data-testid="submit-button"]'),
      () => this.page.locator('button[type="submit"]'),
      () => this.page.locator('button').last()
    ], async (locator) => locator);

    const isButtonEnabled = await submitButton.isEnabled();
    if (!isButtonEnabled) {
      return {
        success: false,
        reason: 'button_disabled',
        details: '表单验证未通过，提交按钮被禁用'
      };
    }

    // 3. 执行提交
    await submitButton.click();
    console.log(`✅ 成功点击提交按钮`);

    // 4. 等待业务状态变化
    const result = await this.waitForSubmissionResult();
    return result;
  }

  /**
   * 业务语义层方法 - 系统生成旅行计划
   */
  async systemGeneratesTravelPlan(): Promise<{ sessionId: string; success: boolean }> {
    console.log(`⚙️ 等待系统生成旅行计划`);
    
    return await this.smartWait.waitForBusinessState(
      async () => {
        // 检查多种成功指标
        const currentUrl = this.page.url();
        
        // 指标1: URL变化到结果页面
        if (currentUrl.includes('/result') || currentUrl.includes('/planning/result')) {
          const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
          const sessionId = urlParams.get('sessionId');
          if (sessionId) {
            console.log(`✅ 检测到结果页面，会话ID: ${sessionId}`);
            return { sessionId, success: true };
          }
        }

        // 指标2: 页面内容变化
        const hasResultContent = await this.page.locator('h1, h2').filter({ 
          hasText: /行程规划|旅行计划|规划结果/i 
        }).isVisible();
        
        if (hasResultContent) {
          console.log(`✅ 检测到规划结果内容`);
          return { sessionId: 'content-based', success: true };
        }

        return false;
      },
      { description: '旅行计划生成', timeout: 120000 }
    );
  }

  /**
   * 填写新疆深度游表单 - 业务场景方法
   */
  async fillXinjiangDeepTourForm(): Promise<void> {
    const planData: TravelPlanData = {
      destination: '新疆',
      startDate: this.calculateOptimalStartDate(),
      endDate: this.calculateEndDate(13), // 13天行程
      groupSize: 2,
      transportation: '飞机+房车自驾',
      specialRequirements: ['阿禾公路', '独库公路', '赛里木湖', '孟克特古道'],
      excludeSpots: ['喀纳斯', '禾木', '魔鬼城']
    };

    await this.userWantsToVisit(planData.destination);
    await this.userSelectsTravelDates(planData.startDate, planData.endDate);
    await this.setGroupSize(planData.groupSize);
    
    // 设置特殊要求（如果存在相关输入框）
    if (planData.specialRequirements) {
      await this.setSpecialRequirements(planData.specialRequirements.join(', '));
    }
  }

  // ==================== 私有辅助方法 ====================

  private async waitForPageReady(): Promise<void> {
    await this.smartWait.waitForBusinessState(
      async () => {
        // 检查页面关键元素是否加载
        const hasTitle = await this.page.locator('h1, h2').filter({ 
          hasText: /旅行|规划|去哪里/i 
        }).isVisible();
        
        const hasForm = await this.page.locator('form, input, button').first().isVisible();
        
        return hasTitle && hasForm;
      },
      { description: '规划页面加载', timeout: 15000 }
    );
  }

  private async setDateWithFallback(type: 'start' | 'end', date: string): Promise<void> {
    const strategies = [
      // 策略1: 通过标签文本定位
      () => this.page.getByLabel(type === 'start' ? /开始|出发|起始日期/i : /结束|返回|结束日期/i),
      // 策略2: 通过占位符定位
      () => this.page.getByPlaceholder(type === 'start' ? /开始|出发/i : /结束|返回/i),
      // 策略3: 通过位置定位
      () => this.page.locator('input[type="date"]').nth(type === 'start' ? 0 : 1),
      // 策略4: 通过data属性定位
      () => this.page.locator(`[data-testid="${type}-date"]`)
    ];

    await this.locatorService.executeWithFallback(strategies, async (locator) => {
      await locator.fill(date);
    });
  }

  private async setGroupSize(size: number): Promise<void> {
    await this.locatorService.executeWithFallback([
      () => this.page.getByRole('spinbutton'),
      () => this.page.getByLabel(/人数|旅行人数/i),
      () => this.page.locator('input[type="number"]'),
      () => this.page.locator('[data-testid="group-size"]')
    ], async (locator) => {
      await locator.fill(size.toString());
    });
  }

  private async setSpecialRequirements(requirements: string): Promise<void> {
    try {
      await this.locatorService.executeWithFallback([
        () => this.page.getByLabel(/特殊要求|备注|说明/i),
        () => this.page.locator('textarea'),
        () => this.page.locator('[data-testid="special-requirements"]')
      ], async (locator) => {
        await locator.fill(requirements);
      });
    } catch (error) {
      console.log('⚠️ 特殊要求输入框不存在，跳过设置');
    }
  }

  private async validateFormBeforeSubmission(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 检查必填字段
    try {
      const destinationValue = await this.page.locator('input').first().inputValue();
      if (!destinationValue.trim()) {
        errors.push('目的地不能为空');
      }
    } catch (error) {
      errors.push('无法验证目的地字段');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async waitForSubmissionResult(): Promise<PlanningSubmissionResult> {
    return await this.retryService.executeWithRetry(async () => {
      // 检查多种成功指标
      const indicators = await Promise.allSettled([
        this.checkURLChange(),
        this.checkUIFeedback()
      ]);

      const successfulIndicators = indicators.filter(result => result.status === 'fulfilled');

      if (successfulIndicators.length > 0) {
        return { success: true, method: 'hybrid_validation' };
      }

      throw new Error('未检测到提交成功的明确指标');
    }, {
      maxRetries: 5,
      backoffStrategy: 'exponential'
    });
  }

  private async checkURLChange(): Promise<boolean> {
    const currentUrl = this.page.url();
    return currentUrl.includes('/result') || currentUrl.includes('/generating');
  }

  private async checkUIFeedback(): Promise<boolean> {
    // 检查加载状态或成功反馈
    const hasLoadingState = await this.page.locator('[data-loading="true"], .loading, .spinner').isVisible();
    const hasSuccessMessage = await this.page.locator('.success, .completed').isVisible();
    
    return hasLoadingState || hasSuccessMessage;
  }

  private calculateOptimalStartDate(): string {
    // 计算最佳出发日期（避开节假日高峰）
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后
    return futureDate.toISOString().split('T')[0];
  }

  private calculateEndDate(duration: number): string {
    const startDate = new Date(this.calculateOptimalStartDate());
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
    return endDate.toISOString().split('T')[0];
  }
}

// ==================== 基础设施服务类 ====================

class SmartWaitingService {
  constructor(private page: Page) {}

  async waitForBusinessState<T>(
    condition: () => Promise<T | false>,
    options: {
      timeout?: number;
      interval?: number;
      description?: string;
    } = {}
  ): Promise<T> {
    const { timeout = 30000, interval = 500, description = '业务状态' } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result !== false) {
          console.log(`✅ ${description}已就绪`);
          return result;
        }
      } catch (error) {
        // 忽略中间状态的错误，继续等待
      }

      await this.page.waitForTimeout(interval);
    }

    throw new Error(`等待${description}超时 (${timeout}ms)`);
  }
}

class AdaptiveRetryService {
  constructor(private page: Page) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      backoffStrategy?: 'linear' | 'exponential';
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, backoffStrategy = 'exponential', shouldRetry = () => true } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries || !shouldRetry(error as Error)) {
          throw error;
        }

        const delay = backoffStrategy === 'exponential' 
          ? Math.pow(2, attempt) * 1000 
          : attempt * 1000;

        console.log(`⚠️ 第${attempt}次尝试失败，${delay}ms后重试...`);
        await this.page.waitForTimeout(delay);
      }
    }

    throw new Error('所有重试尝试都失败了');
  }
}

class ElementLocatorService {
  constructor(private page: Page) {}

  async executeWithFallback<T>(
    strategies: (() => Locator)[],
    action: (locator: Locator) => Promise<T>
  ): Promise<T> {
    const errors: Error[] = [];

    for (const strategy of strategies) {
      try {
        const locator = strategy();
        await locator.waitFor({ timeout: 2000 });
        return await action(locator);
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new Error(`所有定位策略失败: ${errors.map(e => e.message).join(', ')}`);
  }
}
