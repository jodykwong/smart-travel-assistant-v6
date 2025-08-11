/**
 * 智游助手v6.5 全局测试清理
 * 在所有测试完成后执行的清理操作
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始测试环境清理...');
  
  // 生成测试报告摘要
  await generateTestSummary();
  
  // 清理临时文件
  await cleanupTempFiles();
  
  console.log('✅ 测试环境清理完成');
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  console.log('📊 生成测试报告摘要...');
  
  try {
    const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        coverage: {
          pages: ['HomePage', 'PlanningPage', 'ResultPage'],
          features: [
            '页面导航',
            '表单交互',
            'API集成',
            '响应式设计',
            '现代网格布局',
            '玻璃态效果',
            '色彩一致性'
          ]
        }
      };
      
      const summaryPath = path.join(process.cwd(), 'test-results', 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('✅ 测试报告摘要已生成:', summaryPath);
      
      // 输出测试结果概览
      console.log('\n📈 测试结果概览:');
      console.log(`总测试数: ${summary.totalTests}`);
      console.log(`通过: ${summary.passed}`);
      console.log(`失败: ${summary.failed}`);
      console.log(`跳过: ${summary.skipped}`);
      console.log(`耗时: ${Math.round(summary.duration / 1000)}秒`);
      
      if (summary.failed > 0) {
        console.log('❌ 存在失败的测试用例，请查看详细报告');
      } else {
        console.log('✅ 所有测试用例通过');
      }
      
    } else {
      console.warn('⚠️ 未找到测试结果文件');
    }
    
  } catch (error) {
    console.warn('⚠️ 生成测试报告摘要失败:', error.message);
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
  console.log('🗑️ 清理临时文件...');
  
  try {
    const tempDirs = [
      path.join(process.cwd(), 'test-results', 'artifacts'),
      path.join(process.cwd(), '.playwright'),
    ];
    
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        // 清理超过7天的文件
        const files = fs.readdirSync(dir);
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < weekAgo) {
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        }
      }
    }
    
    console.log('✅ 临时文件清理完成');
    
  } catch (error) {
    console.warn('⚠️ 临时文件清理失败:', error.message);
  }
}

export default globalTeardown;
