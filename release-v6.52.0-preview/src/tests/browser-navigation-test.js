/**
 * 浏览器端导航功能测试脚本
 * 在浏览器控制台中运行此脚本来验证导航功能修复效果
 * 
 * 使用方法：
 * 1. 打开旅行计划结果页面
 * 2. 按F12打开开发者工具
 * 3. 在控制台中粘贴并运行此脚本
 */

(function() {
  'use strict';
  
  console.log('🚀 开始导航功能测试...');
  
  // 测试配置
  const testConfig = {
    targets: [
      { id: 'overview', name: '行程概览' },
      { id: 'daily-plan', name: '每日安排' },
      { id: 'accommodation', name: '住宿推荐' },
      { id: 'food', name: '美食体验' },
      { id: 'transport', name: '交通指南' },
      { id: 'tips', name: '实用贴士' }
    ],
    testDelay: 1000, // 每个测试之间的延迟
    visualFeedbackDuration: 2000 // 视觉反馈持续时间
  };
  
  // 测试结果
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  /**
   * 检查DOM元素是否存在
   */
  function checkElementExists(targetId) {
    const element = document.getElementById(targetId);
    const exists = !!element;
    
    console.log(`${exists ? '✅' : '❌'} 元素检查: ${targetId} - ${exists ? '存在' : '不存在'}`);
    
    if (exists) {
      console.log(`   📍 位置: top=${element.offsetTop}, height=${element.offsetHeight}`);
      console.log(`   👁️ 可见: ${element.offsetHeight > 0 ? '是' : '否'}`);
    }
    
    return { exists, element };
  }
  
  /**
   * 测试滚动功能
   */
  function testScrollToElement(targetId, targetName) {
    return new Promise((resolve) => {
      console.log(`🔍 测试滚动到: ${targetName} (${targetId})`);
      
      const { exists, element } = checkElementExists(targetId);
      
      if (!exists) {
        resolve({
          success: false,
          error: `元素 ${targetId} 不存在`,
          targetId,
          targetName
        });
        return;
      }
      
      // 记录滚动前位置
      const beforeScroll = window.pageYOffset;
      
      // 执行滚动
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
      
      // 添加视觉反馈
      element.style.outline = '3px solid #ec4899';
      element.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
      element.style.transition = 'all 0.3s ease-in-out';
      
      // 等待滚动完成
      setTimeout(() => {
        const afterScroll = window.pageYOffset;
        const scrolled = Math.abs(afterScroll - beforeScroll) > 10;
        
        console.log(`   📊 滚动距离: ${Math.abs(afterScroll - beforeScroll)}px`);
        console.log(`   🎯 滚动成功: ${scrolled ? '是' : '否'}`);
        
        // 移除视觉反馈
        setTimeout(() => {
          element.style.outline = '';
          element.style.backgroundColor = '';
        }, testConfig.visualFeedbackDuration);
        
        resolve({
          success: scrolled,
          scrollDistance: Math.abs(afterScroll - beforeScroll),
          targetId,
          targetName
        });
      }, 1000);
    });
  }
  
  /**
   * 测试导航按钮点击
   */
  function testNavigationButton(targetId, targetName) {
    return new Promise((resolve) => {
      console.log(`🖱️ 测试导航按钮: ${targetName}`);
      
      // 查找对应的导航按钮
      const buttons = document.querySelectorAll('button');
      let targetButton = null;
      
      for (const button of buttons) {
        if (button.textContent.includes(targetName) || 
            button.onclick?.toString().includes(targetId)) {
          targetButton = button;
          break;
        }
      }
      
      if (!targetButton) {
        resolve({
          success: false,
          error: `未找到 ${targetName} 的导航按钮`,
          targetId,
          targetName
        });
        return;
      }
      
      console.log(`   🔘 找到按钮: ${targetButton.textContent.trim()}`);
      
      // 模拟点击
      try {
        targetButton.click();
        
        setTimeout(() => {
          resolve({
            success: true,
            targetId,
            targetName
          });
        }, 500);
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          targetId,
          targetName
        });
      }
    });
  }
  
  /**
   * 运行完整测试套件
   */
  async function runFullTestSuite() {
    console.log('📋 开始完整测试套件...');
    
    for (const target of testConfig.targets) {
      testResults.total++;
      
      console.log(`\n🧪 测试 ${testResults.total}/${testConfig.targets.length}: ${target.name}`);
      
      // 测试1: 元素存在性
      const elementCheck = checkElementExists(target.id);
      
      // 测试2: 滚动功能
      const scrollTest = await testScrollToElement(target.id, target.name);
      
      // 测试3: 导航按钮
      const buttonTest = await testNavigationButton(target.id, target.name);
      
      const testPassed = elementCheck.exists && scrollTest.success;
      
      if (testPassed) {
        testResults.passed++;
        console.log(`✅ ${target.name} 测试通过`);
      } else {
        testResults.failed++;
        console.log(`❌ ${target.name} 测试失败`);
      }
      
      testResults.details.push({
        target,
        elementExists: elementCheck.exists,
        scrollSuccess: scrollTest.success,
        buttonSuccess: buttonTest.success,
        passed: testPassed
      });
      
      // 等待下一个测试
      if (testResults.total < testConfig.targets.length) {
        await new Promise(resolve => setTimeout(resolve, testConfig.testDelay));
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
    console.log('🎯 导航功能测试结果');
    console.log('='.repeat(60));
    
    const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
    
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过测试: ${testResults.passed}`);
    console.log(`失败测试: ${testResults.failed}`);
    console.log(`成功率: ${successRate}%`);
    
    console.log('\n📊 详细结果:');
    testResults.details.forEach((detail, index) => {
      const status = detail.passed ? '✅' : '❌';
      console.log(`${status} ${detail.target.name}:`);
      console.log(`   元素存在: ${detail.elementExists ? '✅' : '❌'}`);
      console.log(`   滚动功能: ${detail.scrollSuccess ? '✅' : '❌'}`);
      console.log(`   按钮功能: ${detail.buttonSuccess ? '✅' : '❌'}`);
    });
    
    if (successRate >= 80) {
      console.log('\n🎉 导航功能测试通过！');
      console.log('所有核心功能都能正常工作。');
    } else {
      console.log('\n⚠️ 导航功能测试未完全通过');
      console.log('部分功能可能需要进一步修复。');
    }
    
    console.log('\n💡 使用建议:');
    console.log('- 如果测试失败，请检查页面是否完全加载');
    console.log('- 可以手动点击导航按钮验证功能');
    console.log('- 如有问题，请刷新页面后重新测试');
  }
  
  /**
   * 快速元素检查
   */
  function quickElementCheck() {
    console.log('🔍 快速元素存在性检查:');
    
    testConfig.targets.forEach(target => {
      const element = document.getElementById(target.id);
      const status = element ? '✅' : '❌';
      console.log(`${status} ${target.name} (${target.id}): ${element ? '存在' : '不存在'}`);
    });
    
    const allElements = document.querySelectorAll('[id]');
    const availableIds = Array.from(allElements).map(el => el.id).filter(id => id);
    console.log('\n📋 页面中所有ID:', availableIds);
  }
  
  // 导出测试函数到全局作用域
  window.navigationTest = {
    runFullTest: runFullTestSuite,
    quickCheck: quickElementCheck,
    testScroll: testScrollToElement,
    testButton: testNavigationButton
  };
  
  // 自动运行快速检查
  quickElementCheck();
  
  console.log('\n🎮 可用的测试命令:');
  console.log('- navigationTest.runFullTest() - 运行完整测试');
  console.log('- navigationTest.quickCheck() - 快速元素检查');
  console.log('- navigationTest.testScroll("overview", "行程概览") - 测试单个滚动');
  console.log('- navigationTest.testButton("overview", "行程概览") - 测试单个按钮');
  
})();
