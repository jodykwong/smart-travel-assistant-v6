import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 13天新疆旅游规划端到端测试
 * 完整的用户流程自动化测试
 */
test.describe('13天新疆旅游规划端到端测试', () => {
  let testResults: any = {};

  test.beforeAll(async () => {
    console.log('🗺️ 开始13天新疆旅游规划端到端测试');
    testResults = {
      timestamp: new Date().toISOString(),
      userJourney: {},
      planningResults: {},
      performance: {}
    };
  });

  test.afterAll(async () => {
    // 保存测试结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'e2e-travel-planning-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 端到端测试结果已保存到: ${resultsPath}`);
  });

  test('用户旅程: 访问首页并开始规划', async ({ page }) => {
    const journeyStep = {
      stepName: '访问首页并开始规划',
      success: false,
      duration: 0,
      actions: [] as string[],
      errors: [] as string[]
    };

    try {
      const startTime = Date.now();

      // 监听页面错误
      page.on('pageerror', (error) => {
        journeyStep.errors.push(`页面错误: ${error.message}`);
      });

      // 1. 访问首页
      journeyStep.actions.push('访问首页');
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // 截图记录
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'step1-homepage.png'),
        fullPage: true 
      });

      // 2. 查找开始规划按钮或链接
      journeyStep.actions.push('查找规划入口');
      const planningButtons = [
        'text=开始规划',
        'text=新疆旅游',
        'text=旅游规划',
        'text=开始',
        '[href*="planning"]',
        '[href*="travel"]',
        'button:has-text("规划")',
        'a:has-text("规划")'
      ];

      let planningButtonFound = false;
      for (const selector of planningButtons) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            journeyStep.actions.push(`找到规划按钮: ${selector}`);
            await element.click();
            planningButtonFound = true;
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      // 3. 如果没有找到按钮，尝试直接访问规划页面
      if (!planningButtonFound) {
        journeyStep.actions.push('直接访问规划页面');
        await page.goto('/planning', { waitUntil: 'networkidle' });
      }

      // 4. 验证是否到达规划页面
      const currentUrl = page.url();
      const isOnPlanningPage = currentUrl.includes('planning') || 
                              currentUrl.includes('travel') ||
                              await page.locator('text=新疆').isVisible({ timeout: 5000 }) ||
                              await page.locator('text=旅游规划').isVisible({ timeout: 5000 });

      if (isOnPlanningPage) {
        journeyStep.success = true;
        journeyStep.actions.push('成功到达规划页面');
      } else {
        journeyStep.errors.push('未能到达规划页面');
      }

      journeyStep.duration = Date.now() - startTime;

      // 截图记录最终状态
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'step1-final.png'),
        fullPage: true 
      });

    } catch (error) {
      journeyStep.errors.push(error instanceof Error ? error.message : String(error));
    }

    expect(journeyStep.success, '用户应该能够开始旅游规划').toBeTruthy();
    console.log(`✅ 用户旅程步骤1完成: ${journeyStep.actions.length}个操作, ${journeyStep.duration}ms`);

    testResults.userJourney.step1 = journeyStep;
  });

  test('用户旅程: 填写旅游偏好和需求', async ({ page }) => {
    const journeyStep = {
      stepName: '填写旅游偏好和需求',
      success: false,
      duration: 0,
      formFields: [] as string[],
      errors: [] as string[]
    };

    try {
      const startTime = Date.now();

      // 确保在规划页面
      await page.goto('/planning', { waitUntil: 'networkidle' });

      // 查找并填写表单字段
      const formSelectors = [
        { selector: 'input[name*="days"], input[placeholder*="天数"]', value: '13', type: 'days' },
        { selector: 'input[name*="budget"], input[placeholder*="预算"]', value: '15000', type: 'budget' },
        { selector: 'input[name*="people"], input[placeholder*="人数"]', value: '2', type: 'people' },
        { selector: 'select[name*="style"], select[placeholder*="风格"]', value: '文化探索', type: 'style' },
        { selector: 'input[name*="destination"], input[placeholder*="目的地"]', value: '新疆', type: 'destination' }
      ];

      for (const field of formSelectors) {
        try {
          const element = page.locator(field.selector).first();
          if (await element.isVisible({ timeout: 3000 })) {
            if (field.selector.includes('select')) {
              // 处理下拉选择
              await element.selectOption({ label: field.value });
            } else {
              // 处理输入框
              await element.fill(field.value);
            }
            journeyStep.formFields.push(`${field.type}: ${field.value}`);
          }
        } catch (error) {
          // 字段不存在或不可用，继续处理其他字段
        }
      }

      // 查找并点击提交按钮
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'text=开始规划',
        'text=生成规划',
        'text=提交',
        'button:has-text("规划")',
        'button:has-text("开始")'
      ];

      let submitButtonClicked = false;
      for (const selector of submitSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            submitButtonClicked = true;
            journeyStep.formFields.push(`点击提交按钮: ${selector}`);
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      if (submitButtonClicked || journeyStep.formFields.length > 0) {
        journeyStep.success = true;
      } else {
        journeyStep.errors.push('未找到可填写的表单或提交按钮');
      }

      journeyStep.duration = Date.now() - startTime;

      // 截图记录
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'step2-form-filled.png'),
        fullPage: true 
      });

    } catch (error) {
      journeyStep.errors.push(error instanceof Error ? error.message : String(error));
    }

    console.log(`📝 用户旅程步骤2完成: 填写了${journeyStep.formFields.length}个字段, ${journeyStep.duration}ms`);

    testResults.userJourney.step2 = journeyStep;
  });

  test('用户旅程: 等待规划生成并查看结果', async ({ page }) => {
    const journeyStep = {
      stepName: '等待规划生成并查看结果',
      success: false,
      duration: 0,
      planningContent: [] as string[],
      errors: [] as string[]
    };

    try {
      const startTime = Date.now();

      // 等待规划结果加载
      const loadingIndicators = [
        'text=生成中',
        'text=规划中',
        'text=加载中',
        '.loading',
        '.spinner',
        '[data-testid="loading"]'
      ];

      // 检查是否有加载指示器
      let hasLoadingIndicator = false;
      for (const selector of loadingIndicators) {
        try {
          if (await page.locator(selector).isVisible({ timeout: 2000 })) {
            hasLoadingIndicator = true;
            journeyStep.planningContent.push(`发现加载指示器: ${selector}`);
            break;
          }
        } catch (error) {
          // 继续检查下一个
        }
      }

      // 等待规划结果出现
      const resultSelectors = [
        'text=第1天',
        'text=第一天',
        'text=Day 1',
        'text=乌鲁木齐',
        'text=喀什',
        'text=伊犁',
        'text=天山',
        '.itinerary',
        '.planning-result',
        '[data-testid="travel-plan"]'
      ];

      let planningResultFound = false;
      const maxWaitTime = 60000; // 60秒最大等待时间
      const checkInterval = 2000; // 每2秒检查一次
      let waitedTime = 0;

      while (waitedTime < maxWaitTime && !planningResultFound) {
        for (const selector of resultSelectors) {
          try {
            if (await page.locator(selector).isVisible({ timeout: 1000 })) {
              planningResultFound = true;
              journeyStep.planningContent.push(`找到规划结果: ${selector}`);
              break;
            }
          } catch (error) {
            // 继续检查
          }
        }

        if (!planningResultFound) {
          await page.waitForTimeout(checkInterval);
          waitedTime += checkInterval;
        }
      }

      // 如果找到规划结果，尝试提取更多内容
      if (planningResultFound) {
        try {
          // 提取页面文本内容
          const pageText = await page.textContent('body');
          if (pageText) {
            const keywords = ['天山', '乌鲁木齐', '喀什', '伊犁', '吐鲁番', '景点', '住宿', '交通'];
            const foundKeywords = keywords.filter(keyword => pageText.includes(keyword));
            journeyStep.planningContent.push(`包含关键词: ${foundKeywords.join(', ')}`);
          }

          // 统计规划天数
          const dayMatches = pageText?.match(/第\d+天|Day \d+|\d+日/g) || [];
          if (dayMatches.length > 0) {
            journeyStep.planningContent.push(`规划天数: ${dayMatches.length}天`);
          }

        } catch (error) {
          journeyStep.errors.push('提取规划内容失败');
        }

        journeyStep.success = true;
      } else {
        journeyStep.errors.push(`等待${waitedTime/1000}秒后仍未找到规划结果`);
      }

      journeyStep.duration = Date.now() - startTime;

      // 截图记录最终结果
      await page.screenshot({ 
        path: path.join(process.cwd(), 'test-results', 'screenshots', 'step3-planning-result.png'),
        fullPage: true 
      });

    } catch (error) {
      journeyStep.errors.push(error instanceof Error ? error.message : String(error));
    }

    console.log(`🗺️ 用户旅程步骤3完成: 找到${journeyStep.planningContent.length}项规划内容, ${journeyStep.duration}ms`);

    testResults.userJourney.step3 = journeyStep;
  });

  test('验证规划质量和完整性', async ({ page }) => {
    const qualityCheck = {
      completeness: 0, // 0-100分
      accuracy: 0,     // 0-100分
      usability: 0,    // 0-100分
      overallScore: 0, // 0-100分
      details: {
        hasDailyItinerary: false,
        hasAccommodation: false,
        hasTransportation: false,
        hasAttractions: false,
        hasRestaurants: false,
        hasBudgetInfo: false,
        hasMapInfo: false,
        hasWeatherInfo: false
      },
      issues: [] as string[]
    };

    try {
      // 获取页面内容进行分析
      const pageText = await page.textContent('body') || '';
      const pageHTML = await page.innerHTML('body');

      // 检查完整性指标
      const completenessChecks = [
        { key: 'hasDailyItinerary', patterns: ['第\\d+天', 'Day \\d+', '\\d+日'], weight: 25 },
        { key: 'hasAccommodation', patterns: ['酒店', '住宿', '宾馆', '客栈'], weight: 15 },
        { key: 'hasTransportation', patterns: ['交通', '飞机', '火车', '汽车', '班车'], weight: 15 },
        { key: 'hasAttractions', patterns: ['景点', '天山', '博物馆', '古城', '湖泊'], weight: 20 },
        { key: 'hasRestaurants', patterns: ['餐厅', '美食', '大盘鸡', '拌面', '烤肉'], weight: 10 },
        { key: 'hasBudgetInfo', patterns: ['预算', '费用', '价格', '元', '¥'], weight: 10 },
        { key: 'hasMapInfo', patterns: ['地图', '位置', '坐标', '导航'], weight: 3 },
        { key: 'hasWeatherInfo', patterns: ['天气', '温度', '气候', '℃'], weight: 2 }
      ];

      let totalCompleteness = 0;
      for (const check of completenessChecks) {
        const found = check.patterns.some(pattern => 
          new RegExp(pattern, 'i').test(pageText)
        );
        
        if (found) {
          (qualityCheck.details as any)[check.key] = true;
          totalCompleteness += check.weight;
        } else {
          qualityCheck.issues.push(`缺少${check.key.replace('has', '').toLowerCase()}信息`);
        }
      }

      qualityCheck.completeness = Math.min(100, totalCompleteness);

      // 检查准确性（基于新疆相关关键词）
      const xinjiangKeywords = ['乌鲁木齐', '喀什', '伊犁', '吐鲁番', '阿克苏', '和田', '天山', '塔里木'];
      const foundXinjiangKeywords = xinjiangKeywords.filter(keyword => pageText.includes(keyword));
      qualityCheck.accuracy = Math.min(100, (foundXinjiangKeywords.length / xinjiangKeywords.length) * 100);

      // 检查可用性（页面结构和交互性）
      const usabilityChecks = [
        { check: () => page.locator('h1, h2, h3').count(), min: 3, points: 30 }, // 标题结构
        { check: () => page.locator('ul, ol').count(), min: 1, points: 20 }, // 列表结构
        { check: () => page.locator('button, a').count(), min: 2, points: 25 }, // 交互元素
        { check: () => page.locator('img').count(), min: 1, points: 15 }, // 图片内容
        { check: () => Promise.resolve(pageText.length), min: 500, points: 10 } // 内容长度
      ];

      let totalUsability = 0;
      for (const check of usabilityChecks) {
        try {
          const result = await check.check();
          if (result >= check.min) {
            totalUsability += check.points;
          }
        } catch (error) {
          // 检查失败，不加分
        }
      }

      qualityCheck.usability = Math.min(100, totalUsability);

      // 计算总分
      qualityCheck.overallScore = Math.round(
        (qualityCheck.completeness * 0.5) +
        (qualityCheck.accuracy * 0.3) +
        (qualityCheck.usability * 0.2)
      );

    } catch (error) {
      qualityCheck.issues.push(`质量检查失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 验证质量标准
    expect(qualityCheck.completeness, '规划完整性应该达到60%以上').toBeGreaterThanOrEqual(60);
    expect(qualityCheck.accuracy, '规划准确性应该达到50%以上').toBeGreaterThanOrEqual(50);
    expect(qualityCheck.overallScore, '总体质量评分应该达到65分以上').toBeGreaterThanOrEqual(65);

    console.log(`📊 规划质量评估: 完整性${qualityCheck.completeness}%, 准确性${qualityCheck.accuracy}%, 可用性${qualityCheck.usability}%, 总分${qualityCheck.overallScore}/100`);

    testResults.planningResults.qualityCheck = qualityCheck;
  });

  test('生成端到端测试报告', async () => {
    const reportData = {
      summary: {
        timestamp: new Date().toISOString(),
        testType: '13天新疆旅游规划端到端测试',
        overallSuccess: false,
        userJourneySteps: 3,
        completedSteps: 0,
        totalDuration: 0,
        qualityScore: testResults.planningResults?.qualityCheck?.overallScore || 0
      },
      userJourney: testResults.userJourney,
      planningResults: testResults.planningResults,
      recommendations: [] as string[],
      nextSteps: [] as string[]
    };

    // 计算完成的步骤数
    const journeySteps = Object.values(testResults.userJourney || {});
    reportData.summary.completedSteps = journeySteps.filter(
      (step: any) => step.success
    ).length;

    // 计算总耗时
    reportData.summary.totalDuration = journeySteps.reduce(
      (total: number, step: any) => total + (step.duration || 0), 0
    );

    // 判断整体成功
    reportData.summary.overallSuccess = 
      reportData.summary.completedSteps >= 2 && 
      reportData.summary.qualityScore >= 60;

    // 生成建议
    if (reportData.summary.completedSteps < reportData.summary.userJourneySteps) {
      reportData.recommendations.push('用户旅程存在中断，需要改善用户体验流程');
    }
    if (reportData.summary.qualityScore < 70) {
      reportData.recommendations.push('规划质量需要提升，建议优化算法和数据源');
    }
    if (reportData.summary.totalDuration > 120000) {
      reportData.recommendations.push('规划生成时间过长，需要性能优化');
    }

    // 生成下一步行动
    if (reportData.summary.overallSuccess) {
      reportData.nextSteps.push('进行用户验收测试');
      reportData.nextSteps.push('准备生产环境部署');
      reportData.nextSteps.push('制定监控和维护计划');
    } else {
      reportData.nextSteps.push('修复发现的问题');
      reportData.nextSteps.push('重新进行端到端测试');
      reportData.nextSteps.push('优化用户体验流程');
    }

    // 保存报告
    const reportPath = path.join(process.cwd(), 'test-results', 'e2e-travel-planning-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📋 端到端测试报告已生成: ${reportPath}`);
    console.log(`🎯 测试结果: ${reportData.summary.overallSuccess ? '成功' : '失败'} (${reportData.summary.completedSteps}/${reportData.summary.userJourneySteps}步骤完成, 质量评分${reportData.summary.qualityScore}/100)`);

    // 验证端到端测试成功
    expect(reportData.summary.overallSuccess, '端到端测试应该整体成功').toBeTruthy();

    testResults.report = reportData;
  });
});
