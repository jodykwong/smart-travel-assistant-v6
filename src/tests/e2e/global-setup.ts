/**
 * Playwright全局设置
 * 在所有测试开始前执行的设置
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始E2E测试全局设置...');
  
  // 检查开发服务器是否运行
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 尝试访问首页，验证服务器是否运行
    await page.goto(baseURL, { timeout: 30000 });
    console.log('✅ 开发服务器运行正常');
    
    // 预热应用，确保首次加载性能
    await page.waitForLoadState('networkidle');
    console.log('✅ 应用预热完成');
    
    await browser.close();
  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    throw new Error(`无法连接到开发服务器 ${baseURL}。请确保运行 'npm run dev'`);
  }
  
  console.log('✅ E2E测试全局设置完成');
}

export default globalSetup;
