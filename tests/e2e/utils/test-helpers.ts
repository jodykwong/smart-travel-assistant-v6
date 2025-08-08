/**
 * 智游助手v6.2 - E2E测试工具类
 * 提供测试过程中需要的通用工具函数和数据生成器
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  username?: string;
  phone?: string;
}

export interface TravelPlan {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  accommodationType: string;
  transportMode: string;
}

export interface PaymentInfo {
  amount: number;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: 'qr' | 'h5';
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  /**
   * 生成唯一的测试用户数据
   */
  static generateTestUser(): TestUser {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    return {
      email: `e2e-test-${timestamp}-${randomId}@smarttravel.com`,
      password: `E2ETest2025!@#${randomId}`,
      displayName: `E2E测试用户_${timestamp}`,
      username: `e2e_user_${randomId}`,
      phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
    };
  }

  /**
   * 生成测试旅游规划数据
   */
  static generateTravelPlan(): TravelPlan {
    const destinations = ['北京', '上海', '杭州', '成都', '西安', '厦门'];
    const accommodationTypes = ['hotel', 'bnb', 'hostel'];
    const transportModes = ['flight', 'train', 'car'];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 30); // 30天后
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5); // 5天行程
    
    return {
      destination: destinations[Math.floor(Math.random() * destinations.length)],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      budget: Math.floor(Math.random() * 5000) + 1000, // 1000-6000元
      travelers: Math.floor(Math.random() * 4) + 1, // 1-4人
      accommodationType: accommodationTypes[Math.floor(Math.random() * accommodationTypes.length)],
      transportMode: transportModes[Math.floor(Math.random() * transportModes.length)]
    };
  }

  /**
   * 生成支付测试数据
   */
  static generatePaymentInfo(): PaymentInfo {
    const methods: ('wechat' | 'alipay')[] = ['wechat', 'alipay'];
    
    return {
      amount: Math.floor(Math.random() * 1000) + 99, // 99-1099元
      paymentMethod: methods[Math.floor(Math.random() * methods.length)],
      paymentType: 'qr'
    };
  }
}

/**
 * 页面操作助手类
 */
export class PageHelper {
  constructor(private page: Page) {}

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(timeout = 30000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 安全点击元素（等待元素可见并可点击）
   */
  async safeClick(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    await this.page.click(selector);
  }

  /**
   * 安全填写表单字段
   */
  async safeFill(selector: string, value: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    await this.page.fill(selector, value);
  }

  /**
   * 等待并验证元素文本
   */
  async waitForText(selector: string, expectedText: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    await expect(this.page.locator(selector)).toContainText(expectedText);
  }

  /**
   * 截图并保存
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 等待API响应
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout = 30000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
    
    return response.json();
  }

  /**
   * 验证JWT令牌存储
   */
  async verifyJWTToken(): Promise<string> {
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    });
    
    expect(token).toBeTruthy();
    expect(token).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    
    return token!;
  }

  /**
   * 清理测试数据
   */
  async clearTestData(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 验证页面URL
   */
  async verifyUrl(expectedPath: string): Promise<void> {
    const currentUrl = this.page.url();
    expect(currentUrl).toContain(expectedPath);
  }

  /**
   * 等待元素消失
   */
  async waitForElementToDisappear(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * 验证表单验证错误
   */
  async verifyFormError(errorSelector: string, expectedError: string): Promise<void> {
    await this.page.waitForSelector(errorSelector, { state: 'visible' });
    await expect(this.page.locator(errorSelector)).toContainText(expectedError);
  }

  /**
   * 模拟网络延迟
   */
  async simulateNetworkDelay(delay = 1000): Promise<void> {
    await this.page.waitForTimeout(delay);
  }
}

/**
 * 数据库验证助手
 */
export class DatabaseHelper {
  /**
   * 验证用户是否存在于数据库中
   */
  static async verifyUserExists(email: string): Promise<boolean> {
    // 这里应该连接到测试数据库进行验证
    // 为了简化，我们通过API调用来验证
    try {
      const response = await fetch('http://localhost:3001/api/user/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return response.ok;
    } catch (error) {
      console.error('Database verification failed:', error);
      return false;
    }
  }

  /**
   * 清理测试用户数据
   */
  static async cleanupTestUser(email: string): Promise<void> {
    // 实际实现中应该连接数据库删除测试数据
    console.log(`Cleaning up test user: ${email}`);
  }
}

/**
 * 性能监控助手
 */
export class PerformanceHelper {
  private page: Page;
  private startTime: number = 0;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 开始性能监控
   */
  startTiming(): void {
    this.startTime = Date.now();
  }

  /**
   * 结束性能监控并返回耗时
   */
  endTiming(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 测量页面加载时间
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  /**
   * 测量API响应时间
   */
  async measureApiResponseTime(apiCall: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const startTime = Date.now();
    const result = await apiCall();
    const duration = Date.now() - startTime;
    return { result, duration };
  }
}
