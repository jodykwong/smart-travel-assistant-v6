/**
 * 智游助手v6.1 - 表单提交修复验证测试
 * 专门验证多步骤表单提交功能的修复效果
 */

import { test, expect, Page } from '@playwright/test';

test.describe('v6.1表单提交修复验证', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 监听控制台日志以验证调试信息
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('🚀')) {
        console.log('✅ 表单提交日志:', msg.text());
      }
    });

    // 监听网络请求以验证API调用
    page.on('request', request => {
      if (request.url().includes('/api/v1/planning/sessions')) {
        console.log('📡 API请求:', request.method(), request.url());
      }
    });

    await page.goto('http://localhost:3002/planning');
    await page.waitForLoadState('networkidle');
  });

  test('P0-001: 完整表单流程测试', async () => {
    console.log('🧪 开始测试：完整表单流程');

    // 步骤1: 填写目的地信息（使用2025年9月后的有效日期）
    console.log('📝 步骤1: 填写目的地信息');
    
    await page.getByTestId('destination-input').fill('成都');
    await page.getByTestId('start-date-input').fill('2025-09-15');
    await page.getByTestId('end-date-input').fill('2025-09-20');
    
    // 验证日期有效性
    const startDateValue = await page.getByTestId('start-date-input').inputValue();
    const endDateValue = await page.getByTestId('end-date-input').inputValue();
    expect(startDateValue).toBe('2025-09-15');
    expect(endDateValue).toBe('2025-09-20');
    
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    // 步骤2: 选择预算和旅行风格
    console.log('📝 步骤2: 选择预算和旅行风格');
    
    // 验证预算默认选择
    const budgetRadio = page.locator('input[name="budget"][value="mid-range"]');
    await expect(budgetRadio).toBeChecked();
    
    // 选择旅行风格
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"][value="culture"]');
      if (checkbox) checkbox.click();
    });
    
    await page.waitForTimeout(500);
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    // 步骤3: 设置住宿偏好
    console.log('📝 步骤3: 设置住宿偏好');
    
    // 验证住宿默认选择
    const accommodationRadio = page.locator('input[name="accommodation"][value="hotel"]');
    await expect(accommodationRadio).toBeChecked();
    
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    // 步骤4: 确认信息并提交
    console.log('📝 步骤4: 确认信息并提交');
    
    // 验证确认页面显示的信息
    await expect(page.locator('text=成都')).toBeVisible();
    await expect(page.locator('text=2025-09-15 至 2025-09-20')).toBeVisible();
    await expect(page.locator('text=2人')).toBeVisible();
    await expect(page.locator('text=中等')).toBeVisible();
    await expect(page.locator('text=文化历史')).toBeVisible();
    await expect(page.locator('text=酒店')).toBeVisible();

    // 验证提交按钮可用
    const submitButton = page.getByTestId('generate-plan-button');
    await expect(submitButton).toBeEnabled();
    
    console.log('🚀 执行表单提交');
    await submitButton.click();
    
    // 等待页面跳转
    await page.waitForURL(/\/planning\/generating\?sessionId=/, { timeout: 10000 });
    
    console.log('✅ 表单提交成功，页面已跳转');
  });

  test('P0-002: 数据验证测试', async () => {
    console.log('🧪 开始测试：数据验证');

    // 填写完整表单
    await page.getByTestId('destination-input').fill('北京');
    await page.getByTestId('start-date-input').fill('2025-10-01');
    await page.getByTestId('end-date-input').fill('2025-10-07');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    // 选择旅行风格
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"][value="food"]');
      if (checkbox) checkbox.click();
    });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(500);

    // 验证隐藏字段数据收集
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      
      const formData = new FormData(form);
      const data = {};
      for (let [key, value] of formData.entries()) {
        if (data[key]) {
          if (Array.isArray(data[key])) {
            data[key].push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      }
      return data;
    });

    console.log('📊 收集到的表单数据:', formData);

    // 验证必填字段
    expect(formData.destination).toBe('北京');
    expect(formData.startDate).toBe('2025-10-01');
    expect(formData.endDate).toBe('2025-10-07');
    expect(formData.groupSize).toBe('2');
    expect(formData.budget).toBe('mid-range');
    expect(formData.accommodation).toBe('hotel');
    
    // 验证数组字段
    expect(formData.travelStyles).toBe('food');

    console.log('✅ 数据验证测试通过');
  });

  test('P0-003: 页面跳转验证', async () => {
    console.log('🧪 开始测试：页面跳转验证');

    // 快速填写表单
    await page.getByTestId('destination-input').fill('上海');
    await page.getByTestId('start-date-input').fill('2025-11-01');
    await page.getByTestId('end-date-input').fill('2025-11-05');
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"][value="nature"]');
      if (checkbox) checkbox.click();
    });
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(300);

    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(300);

    // 监听页面跳转
    const navigationPromise = page.waitForURL(/\/planning\/generating\?sessionId=/, { timeout: 15000 });
    
    await page.getByTestId('generate-plan-button').click();
    
    // 等待跳转完成
    await navigationPromise;
    
    // 验证URL格式
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/planning\/generating\?sessionId=session_\d+_[a-z0-9]+/);
    
    // 验证生成页面元素
    await expect(page.locator('text=AI正在为您量身定制旅行计划')).toBeVisible();
    await expect(page.locator('text=生成进度')).toBeVisible();
    
    console.log('✅ 页面跳转验证通过，URL:', currentUrl);
  });

  test('P0-004: 错误处理测试', async () => {
    console.log('🧪 开始测试：错误处理');

    // 测试空表单提交
    await page.getByTestId('next-step-button').click();
    
    // 应该显示验证错误
    await expect(page.locator('text=请输入目的地')).toBeVisible();
    
    // 测试无效日期
    await page.getByTestId('destination-input').fill('测试城市');
    await page.getByTestId('start-date-input').fill('2024-01-01'); // 过去日期
    await page.getByTestId('end-date-input').fill('2024-01-05');
    
    // 应该显示日期验证错误
    await expect(page.locator('text=出发日期不能早于今天')).toBeVisible();
    
    console.log('✅ 错误处理测试通过');
  });
});
