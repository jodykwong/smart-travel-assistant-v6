/**
 * Playwright全局清理
 * 在所有测试结束后执行的清理工作
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始E2E测试全局清理...');
  
  try {
    // 清理测试数据
    const testResultsDir = './test-results';
    if (fs.existsSync(testResultsDir)) {
      console.log('📊 测试结果已保存到:', testResultsDir);
    }
    
    // 生成测试摘要
    const summaryPath = path.join(testResultsDir, 'e2e-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      testRun: 'E2E Tests Completed',
      resultsLocation: testResultsDir
    };
    
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📝 测试摘要已生成:', summaryPath);
    
  } catch (error) {
    console.error('⚠️ 全局清理过程中出现错误:', error);
  }
  
  console.log('✅ E2E测试全局清理完成');
}

export default globalTeardown;
