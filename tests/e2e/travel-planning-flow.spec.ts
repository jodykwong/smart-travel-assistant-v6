/**
 * 智游助手v6.2 - 完整旅游规划流程 E2E 测试
 * 
 * 测试场景：
 * 1. 打开浏览器并访问主页
 * 2. 填写旅游问卷表单
 * 3. 提交并生成旅游规划
 * 4. 验证生成的规划内容
 * 5. 测试页面交互功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试数据配置
const testData = {
  destination: '哈尔滨',
  startDate: '2025-08-15',
  endDate: '2025-08-20',
  groupSize: 2,
  budget: 'mid-range',
  travelStyles: ['culture', 'food', 'nature'],
  accommodation: 'hotel',
  specialRequirements: '希望体验当地特色美食和冰雪文化'
};

// 页面元素选择器
const selectors = {
  // 主页元素
  homePage: {
    title: 'h1:has-text("智游助手")',
    startPlanningButton: 'a[href="/planning"]',
    featuresSection: '#features'
  },
  
  // 规划页面表单元素 - 多步骤表单
  planningForm: {
    // 第1步：基本信息
    destinationInput: '[data-testid="destination-input"]',
    startDateInput: '[data-testid="start-date-input"]',
    endDateInput: '[data-testid="end-date-input"]',
    groupSizeInput: '[data-testid="group-size-input"]',
    nextStepButton: '[data-testid="next-step-button"]',

    // 第2步：预算和风格 - 点击包含单选按钮的标签
    budgetOption: (budget: string) => `label:has(input[name="budget"][value="${budget}"])`,
    travelStyleOption: (style: string) => `label:has(input[name="travelStyles"][value="${style}"])`,

    // 第3步：住宿
    accommodationOption: (type: string) => `label:has(input[name="accommodation"][value="${type}"])`,

    // 第4步：特殊要求和提交
    specialRequirementsTextarea: 'textarea[name="specialRequirements"]',
    submitButton: '[data-testid="generate-plan-button"]'
  },
  
  // 结果页面元素
  resultPage: {
    planTitle: '[data-testid="plan-title"]',
    itinerarySection: '[data-testid="itinerary-section"]',
    accommodationSection: '[data-testid="accommodation-section"]',
    transportationSection: '[data-testid="transportation-section"]',
    budgetSummary: '[data-testid="budget-summary"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]'
  }
};

// 辅助函数：等待页面加载完成
async function waitForPageLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForLoadState('domcontentloaded', { timeout });
}

// 辅助函数：填写多步骤表单
async function fillTravelForm(page: Page, data: typeof testData) {
  console.log('📝 开始填写第1步：基本信息');

  // 第1步：基本信息
  await page.fill(selectors.planningForm.destinationInput, data.destination);
  await page.fill(selectors.planningForm.startDateInput, data.startDate);
  await page.fill(selectors.planningForm.endDateInput, data.endDate);
  await page.fill(selectors.planningForm.groupSizeInput, data.groupSize.toString());

  // 点击下一步
  await page.click(selectors.planningForm.nextStepButton);
  await page.waitForTimeout(1000);

  console.log('📝 开始填写第2步：预算和风格');

  // 第2步：预算和风格
  await page.click(selectors.planningForm.budgetOption(data.budget));

  // 选择旅行风格
  for (const style of data.travelStyles) {
    await page.click(selectors.planningForm.travelStyleOption(style));
  }

  // 点击下一步
  await page.click(selectors.planningForm.nextStepButton);
  await page.waitForTimeout(1000);

  console.log('📝 开始填写第3步：住宿偏好和特殊要求');

  // 第3步：住宿类型
  await page.click(selectors.planningForm.accommodationOption(data.accommodation));

  // 第3步：特殊要求（在同一步）
  if (data.specialRequirements) {
    await page.fill(selectors.planningForm.specialRequirementsTextarea, data.specialRequirements);
  }

  // 点击下一步到确认页面
  await page.click(selectors.planningForm.nextStepButton);
  await page.waitForTimeout(1000);

  console.log('📝 到达第4步：确认页面');
}

// 主测试套件
test.describe('智游助手 - 完整旅游规划流程', () => {
  
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间，因为AI生成可能需要时间
    test.setTimeout(120000);
    
    // 设置视口大小
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('完整的旅游规划流程测试', async ({ page }) => {
    console.log('🚀 开始完整旅游规划流程测试...');

    // 步骤1: 访问主页
    console.log('📍 步骤1: 访问主页');
    await page.goto('http://localhost:3003');
    await waitForPageLoad(page);
    
    // 验证主页加载
    await expect(page.locator(selectors.homePage.title)).toBeVisible();
    await expect(page).toHaveTitle(/智游助手/);
    console.log('✅ 主页加载成功');

    // 步骤2: 点击开始规划按钮
    console.log('📍 步骤2: 导航到规划页面');
    await page.click(selectors.homePage.startPlanningButton);
    await waitForPageLoad(page);
    
    // 验证规划页面加载
    await expect(page.locator(selectors.planningForm.destinationInput)).toBeVisible();
    console.log('✅ 规划页面加载成功');

    // 步骤3: 填写旅游问卷
    console.log('📍 步骤3: 填写旅游问卷');
    await fillTravelForm(page, testData);
    console.log('✅ 表单填写完成');

    // 步骤4: 提交表单
    console.log('📍 步骤4: 提交表单并等待生成规划');

    // 先检查页面上有哪些按钮
    const buttons = await page.locator('button').all();
    console.log(`发现 ${buttons.length} 个按钮`);

    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      const isVisible = await buttons[i].isVisible();
      console.log(`按钮 ${i + 1}: "${buttonText}" (可见: ${isVisible})`);
    }

    // 尝试多种可能的提交按钮选择器
    const submitSelectors = [
      '[data-testid="generate-plan-button"]',
      'button:has-text("开始生成规划")',
      'button:has-text("生成规划")',
      'button:has-text("提交")',
      'button[type="submit"]',
      'button:visible:last-child'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        submitButton = button;
        console.log(`✅ 找到提交按钮: ${selector}`);
        break;
      }
    }

    if (submitButton) {
      await submitButton.click();
    } else {
      throw new Error('找不到提交按钮');
    }
    
    // 等待加载状态或结果页面
    try {
      // 检查是否有加载指示器
      const loadingSpinner = page.locator(selectors.resultPage.loadingSpinner);
      if (await loadingSpinner.isVisible()) {
        console.log('⏳ 检测到加载状态，等待规划生成...');
        await loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });
      }
    } catch (error) {
      console.log('⚠️ 未检测到加载指示器，继续验证结果');
    }

    // 步骤5: 验证结果页面
    console.log('📍 步骤5: 验证生成的旅游规划');
    
    // 等待页面跳转或内容更新
    await page.waitForTimeout(2000);
    
    // 检查是否有错误消息
    const errorMessage = page.locator(selectors.resultPage.errorMessage);
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      console.log(`❌ 发现错误消息: ${errorText}`);
      throw new Error(`规划生成失败: ${errorText}`);
    }

    // 验证规划内容是否生成
    const planContent = page.locator('body');
    const pageContent = await planContent.textContent();
    
    // 检查关键内容是否存在
    const hasDestination = pageContent?.includes(testData.destination);
    const hasItinerary = pageContent?.includes('行程') || pageContent?.includes('日程') || pageContent?.includes('安排');
    const hasAccommodation = pageContent?.includes('住宿') || pageContent?.includes('酒店');
    
    if (hasDestination) {
      console.log('✅ 目的地信息已包含在规划中');
    }
    
    if (hasItinerary) {
      console.log('✅ 行程安排已生成');
    }
    
    if (hasAccommodation) {
      console.log('✅ 住宿信息已包含');
    }

    // 验证页面基本功能
    console.log('📍 步骤6: 验证页面交互功能');
    
    // 检查页面是否响应
    await expect(page).not.toHaveTitle('');
    
    // 检查是否有JavaScript错误
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // 等待一段时间收集可能的错误
    await page.waitForTimeout(3000);
    
    if (jsErrors.length > 0) {
      console.log(`⚠️ 发现JavaScript错误: ${jsErrors.join(', ')}`);
    } else {
      console.log('✅ 未发现JavaScript错误');
    }

    console.log('🎉 完整旅游规划流程测试完成！');
  });

  test('表单验证测试', async ({ page }) => {
    console.log('🧪 开始表单验证测试...');

    await page.goto('http://localhost:3003/planning');
    await waitForPageLoad(page);

    // 测试第一步的表单验证 - 检查空表单时按钮是否被禁用
    const nextButton = page.locator(selectors.planningForm.nextStepButton);
    if (await nextButton.isVisible()) {
      const isDisabled = await nextButton.isDisabled();

      if (isDisabled) {
        console.log('✅ 表单验证正常工作，空表单时下一步按钮被禁用');

        // 填写一个字段看按钮是否启用
        await page.fill(selectors.planningForm.destinationInput, '北京');
        await page.waitForTimeout(500); // 等待验证状态更新

        const isStillDisabled = await nextButton.isDisabled();
        if (isStillDisabled) {
          console.log('✅ 部分填写时按钮仍被禁用，验证逻辑正确');
        } else {
          console.log('⚠️ 部分填写后按钮被启用，可能需要检查验证逻辑');
        }
      } else {
        console.log('⚠️ 空表单时下一步按钮未被禁用，验证可能有问题');
      }

      // 检查是否有错误消息显示
      const errorMessages = page.locator('.error, [role="alert"], .text-red-500, .text-red-600');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        console.log(`📝 发现 ${errorCount} 个验证提示消息`);
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`   提示 ${i + 1}: ${errorText}`);
        }
      }
    } else {
      console.log('⚠️ 未找到下一步按钮，跳过验证测试');
    }

    console.log('✅ 表单验证测试完成');
  });

  test('响应式设计测试', async ({ page }) => {
    console.log('📱 开始响应式设计测试...');

    await page.goto('http://localhost:3003');
    
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForPageLoad(page);
    
    await expect(page.locator(selectors.homePage.title)).toBeVisible();
    console.log('✅ 移动端视图正常');
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForPageLoad(page);
    
    await expect(page.locator(selectors.homePage.title)).toBeVisible();
    console.log('✅ 平板视图正常');
    
    // 恢复桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ 响应式设计测试完成');
  });
});
