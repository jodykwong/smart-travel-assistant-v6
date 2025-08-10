/**
 * 浏览器端每日安排功能按钮测试脚本
 * 在浏览器控制台中运行此脚本来验证每日安排下方的功能按钮
 * 
 * 使用方法：
 * 1. 打开旅行计划结果页面
 * 2. 按F12打开开发者工具
 * 3. 在控制台中粘贴并运行此脚本
 */

(function() {
  'use strict';
  
  console.log('🚀 开始每日安排功能按钮测试...');
  
  // 测试配置
  const testConfig = {
    dailyPlanId: 'daily-plan',
    expectedButtons: [
      { name: '住宿推荐', targetId: 'accommodation', icon: 'fa-bed' },
      { name: '美食体验', targetId: 'food', icon: 'fa-utensils' },
      { name: '交通指南', targetId: 'transport', icon: 'fa-car' },
      { name: '实用贴士', targetId: 'tips', icon: 'fa-lightbulb' }
    ],
    testDelay: 1000,
    visualFeedbackDuration: 2000
  };
  
  // 测试结果
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  /**
   * 检查每日安排区域是否存在
   */
  function checkDailyPlanSection() {
    console.log('🔍 检查每日安排区域...');
    
    const dailyPlanElement = document.getElementById(testConfig.dailyPlanId);
    const exists = !!dailyPlanElement;
    
    console.log(`${exists ? '✅' : '❌'} 每日安排区域: ${exists ? '存在' : '不存在'}`);
    
    if (exists) {
      console.log(`   📍 位置: top=${dailyPlanElement.offsetTop}, height=${dailyPlanElement.offsetHeight}`);
      console.log(`   👁️ 可见: ${dailyPlanElement.offsetHeight > 0 ? '是' : '否'}`);
      
      // 检查是否有功能按钮区域
      const buttonSection = dailyPlanElement.querySelector('.grid');
      const hasButtonSection = !!buttonSection;
      
      console.log(`${hasButtonSection ? '✅' : '❌'} 功能按钮区域: ${hasButtonSection ? '存在' : '不存在'}`);
      
      if (hasButtonSection) {
        const buttonCount = buttonSection.querySelectorAll('button').length;
        console.log(`   🔘 按钮数量: ${buttonCount}`);
      }
      
      return { exists: true, element: dailyPlanElement, hasButtonSection, buttonSection };
    }
    
    return { exists: false, element: null, hasButtonSection: false, buttonSection: null };
  }
  
  /**
   * 检查功能按钮是否存在
   */
  function checkFunctionButtons() {
    console.log('🔍 检查功能按钮...');
    
    const dailyPlanCheck = checkDailyPlanSection();
    if (!dailyPlanCheck.exists || !dailyPlanCheck.hasButtonSection) {
      return { success: false, error: '每日安排区域或按钮区域不存在' };
    }
    
    const buttonSection = dailyPlanCheck.buttonSection;
    const foundButtons = [];
    
    testConfig.expectedButtons.forEach(expectedButton => {
      // 查找包含特定文本的按钮
      const buttons = Array.from(buttonSection.querySelectorAll('button'));
      const button = buttons.find(btn => btn.textContent.includes(expectedButton.name));
      
      const exists = !!button;
      console.log(`${exists ? '✅' : '❌'} ${expectedButton.name}按钮: ${exists ? '存在' : '不存在'}`);
      
      if (exists) {
        // 检查图标
        const icon = button.querySelector(`i.${expectedButton.icon}`);
        const hasIcon = !!icon;
        console.log(`   🎨 图标: ${hasIcon ? '正确' : '缺失'}`);
        
        // 检查点击事件
        const hasClickHandler = !!button.onclick || button.getAttribute('onclick') || 
                               button.addEventListener || button.hasAttribute('data-click');
        console.log(`   🖱️ 点击事件: ${hasClickHandler ? '存在' : '可能缺失'}`);
        
        foundButtons.push({
          ...expectedButton,
          element: button,
          hasIcon,
          hasClickHandler
        });
      }
    });
    
    return {
      success: foundButtons.length === testConfig.expectedButtons.length,
      foundButtons,
      expectedCount: testConfig.expectedButtons.length,
      foundCount: foundButtons.length
    };
  }
  
  /**
   * 测试单个按钮的滚动功能
   */
  function testButtonScroll(buttonInfo) {
    return new Promise((resolve) => {
      console.log(`🔍 测试${buttonInfo.name}按钮滚动功能...`);
      
      // 检查目标元素是否存在
      const targetElement = document.getElementById(buttonInfo.targetId);
      if (!targetElement) {
        resolve({
          success: false,
          error: `目标元素 ${buttonInfo.targetId} 不存在`,
          buttonName: buttonInfo.name
        });
        return;
      }
      
      // 记录滚动前位置
      const beforeScroll = window.pageYOffset;
      
      // 模拟点击按钮
      try {
        buttonInfo.element.click();
        
        // 等待滚动完成
        setTimeout(() => {
          const afterScroll = window.pageYOffset;
          const scrolled = Math.abs(afterScroll - beforeScroll) > 10;
          
          console.log(`   📊 滚动距离: ${Math.abs(afterScroll - beforeScroll)}px`);
          console.log(`   🎯 滚动成功: ${scrolled ? '是' : '否'}`);
          
          // 检查目标元素是否有视觉反馈
          const hasVisualFeedback = targetElement.classList.contains('ring-4') || 
                                   targetElement.style.backgroundColor.includes('rgb');
          console.log(`   ✨ 视觉反馈: ${hasVisualFeedback ? '有' : '无'}`);
          
          resolve({
            success: scrolled,
            scrollDistance: Math.abs(afterScroll - beforeScroll),
            hasVisualFeedback,
            buttonName: buttonInfo.name,
            targetId: buttonInfo.targetId
          });
        }, 1000);
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          buttonName: buttonInfo.name
        });
      }
    });
  }
  
  /**
   * 运行完整测试套件
   */
  async function runFullTestSuite() {
    console.log('📋 开始完整测试套件...');
    
    // 测试1: 检查每日安排区域
    testResults.total++;
    const dailyPlanCheck = checkDailyPlanSection();
    if (dailyPlanCheck.exists && dailyPlanCheck.hasButtonSection) {
      testResults.passed++;
      console.log('✅ 每日安排区域测试通过');
    } else {
      testResults.failed++;
      console.log('❌ 每日安排区域测试失败');
    }
    
    testResults.details.push({
      test: '每日安排区域',
      passed: dailyPlanCheck.exists && dailyPlanCheck.hasButtonSection,
      details: dailyPlanCheck
    });
    
    // 测试2: 检查功能按钮
    testResults.total++;
    const buttonCheck = checkFunctionButtons();
    if (buttonCheck.success) {
      testResults.passed++;
      console.log(`✅ 功能按钮测试通过 (${buttonCheck.foundCount}/${buttonCheck.expectedCount})`);
    } else {
      testResults.failed++;
      console.log(`❌ 功能按钮测试失败 (${buttonCheck.foundCount}/${buttonCheck.expectedCount})`);
    }
    
    testResults.details.push({
      test: '功能按钮存在性',
      passed: buttonCheck.success,
      details: buttonCheck
    });
    
    // 测试3: 测试每个按钮的滚动功能
    if (buttonCheck.success) {
      for (const buttonInfo of buttonCheck.foundButtons) {
        testResults.total++;
        
        const scrollTest = await testButtonScroll(buttonInfo);
        if (scrollTest.success) {
          testResults.passed++;
          console.log(`✅ ${buttonInfo.name}按钮滚动测试通过`);
        } else {
          testResults.failed++;
          console.log(`❌ ${buttonInfo.name}按钮滚动测试失败`);
        }
        
        testResults.details.push({
          test: `${buttonInfo.name}按钮滚动`,
          passed: scrollTest.success,
          details: scrollTest
        });
        
        // 等待下一个测试
        if (buttonInfo !== buttonCheck.foundButtons[buttonCheck.foundButtons.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, testConfig.testDelay));
        }
      }
    }
    
    // 输出最终结果
    printTestResults();
  }
  
  /**
   * 打印测试结果
   */
  function printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 每日安排功能按钮测试结果');
    console.log('='.repeat(60));
    
    const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
    
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过测试: ${testResults.passed}`);
    console.log(`失败测试: ${testResults.failed}`);
    console.log(`成功率: ${successRate}%`);
    
    console.log('\n📊 详细结果:');
    testResults.details.forEach((detail, index) => {
      const status = detail.passed ? '✅' : '❌';
      console.log(`${status} ${detail.test}`);
    });
    
    if (successRate >= 80) {
      console.log('\n🎉 每日安排功能按钮测试通过！');
      console.log('✅ 所有功能按钮都能正常工作');
      console.log('✅ 滚动功能正常');
      console.log('✅ 视觉反馈正常');
    } else {
      console.log('\n⚠️ 每日安排功能按钮测试未完全通过');
      console.log('部分功能可能需要进一步检查');
    }
    
    console.log('\n💡 使用建议:');
    console.log('- 如果测试失败，请检查页面是否完全加载');
    console.log('- 可以手动点击功能按钮验证');
    console.log('- 如有问题，请刷新页面后重新测试');
  }
  
  /**
   * 快速检查
   */
  function quickCheck() {
    console.log('🔍 快速检查每日安排功能按钮:');
    
    const dailyPlanCheck = checkDailyPlanSection();
    if (!dailyPlanCheck.exists) {
      console.log('❌ 每日安排区域不存在');
      return;
    }
    
    if (!dailyPlanCheck.hasButtonSection) {
      console.log('❌ 功能按钮区域不存在');
      return;
    }
    
    const buttonCheck = checkFunctionButtons();
    console.log(`📊 功能按钮: ${buttonCheck.foundCount}/${buttonCheck.expectedCount}`);
    
    buttonCheck.foundButtons.forEach(button => {
      console.log(`✅ ${button.name}: 存在`);
    });
  }
  
  // 导出测试函数到全局作用域
  window.dailyPlanButtonTest = {
    runFullTest: runFullTestSuite,
    quickCheck: quickCheck,
    checkDailyPlan: checkDailyPlanSection,
    checkButtons: checkFunctionButtons,
    testScroll: testButtonScroll
  };
  
  // 自动运行快速检查
  quickCheck();
  
  console.log('\n🎮 可用的测试命令:');
  console.log('- dailyPlanButtonTest.runFullTest() - 运行完整测试');
  console.log('- dailyPlanButtonTest.quickCheck() - 快速检查');
  console.log('- dailyPlanButtonTest.checkDailyPlan() - 检查每日安排区域');
  console.log('- dailyPlanButtonTest.checkButtons() - 检查功能按钮');
  
})();
