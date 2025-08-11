/**
 * 智游助手v6.5 全局测试设置
 * 在所有测试开始前执行的初始化操作
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始智游助手v6.5端到端测试环境初始化...');
  
  // 验证测试环境
  await verifyTestEnvironment();
  
  // 预热应用
  await warmupApplication();
  
  console.log('✅ 测试环境初始化完成');
}

/**
 * 验证测试环境
 */
async function verifyTestEnvironment() {
  console.log('🔍 验证测试环境...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 检查应用是否可访问
    const response = await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    if (!response || response.status() !== 200) {
      throw new Error(`应用服务器不可访问，状态码: ${response?.status()}`);
    }
    
    console.log('✅ 应用服务器运行正常');
    
    // 检查API服务
    await verifyAPIServices(page);
    
  } catch (error) {
    console.error('❌ 测试环境验证失败:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * 验证API服务
 */
async function verifyAPIServices(page: any) {
  console.log('🔍 验证API服务...');
  
  try {
    // 检查API密钥状态
    const apiResponse = await page.request.get('/api/system/api-keys-status');
    const apiData = await apiResponse.json();
    
    if (!apiData.success) {
      throw new Error('API密钥状态检查失败');
    }
    
    const { deepseek, amap, siliconflow } = apiData.data.status;
    
    if (!deepseek.configured || !amap.configured || !siliconflow.configured) {
      console.warn('⚠️ 部分API密钥未配置，可能影响测试结果');
    } else {
      console.log('✅ 所有API密钥配置正常');
    }
    
    // 测试API连通性
    const testResponse = await page.request.get('/api/system/test-api-keys');
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ API服务连通性测试通过');
    } else {
      console.warn('⚠️ API服务连通性测试失败，但继续执行测试');
    }
    
  } catch (error) {
    console.warn('⚠️ API服务验证失败，但继续执行测试:', error.message);
  }
}

/**
 * 预热应用
 */
async function warmupApplication() {
  console.log('🔥 预热应用...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 访问主要页面进行预热
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    console.log('✅ 主页预热完成');
    
    await page.goto('http://localhost:3001/planning', { waitUntil: 'networkidle' });
    console.log('✅ 规划页面预热完成');
    
    // 预加载关键资源
    await page.evaluate(() => {
      // 预加载字体和样式
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = '/fonts/inter.woff2';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
    
  } catch (error) {
    console.warn('⚠️ 应用预热失败，但继续执行测试:', error.message);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
