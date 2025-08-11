import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 测试清理套件
 * 在所有测试完成后执行最终清理工作
 */
test.describe('测试清理', () => {
  test('执行最终清理和报告生成', async () => {
    console.log('🧹 开始执行最终清理工作');

    const cleanupResults = {
      timestamp: new Date().toISOString(),
      actions: [] as string[],
      summary: {
        totalTestFiles: 0,
        totalReports: 0,
        totalScreenshots: 0,
        diskSpaceUsed: 0
      }
    };

    try {
      const testResultsDir = path.join(process.cwd(), 'test-results');

      // 1. 统计生成的文件
      cleanupResults.actions.push('统计测试结果文件');
      
      if (fs.existsSync(testResultsDir)) {
        const files = fs.readdirSync(testResultsDir, { recursive: true });
        
        cleanupResults.summary.totalTestFiles = files.filter(file => 
          typeof file === 'string' && file.endsWith('.json')
        ).length;
        
        cleanupResults.summary.totalReports = files.filter(file => 
          typeof file === 'string' && (file.includes('report') || file.endsWith('.html'))
        ).length;
        
        const screenshotsDir = path.join(testResultsDir, 'screenshots');
        if (fs.existsSync(screenshotsDir)) {
          const screenshots = fs.readdirSync(screenshotsDir);
          cleanupResults.summary.totalScreenshots = screenshots.length;
        }

        // 计算磁盘使用量
        let totalSize = 0;
        const calculateSize = (dirPath: string) => {
          const items = fs.readdirSync(dirPath);
          items.forEach(item => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
              calculateSize(itemPath);
            } else {
              totalSize += stats.size;
            }
          });
        };
        
        calculateSize(testResultsDir);
        cleanupResults.summary.diskSpaceUsed = Math.round(totalSize / 1024 / 1024 * 100) / 100; // MB
      }

      // 2. 生成测试执行摘要
      cleanupResults.actions.push('生成测试执行摘要');
      
      const summaryData = {
        testSuite: '智游助手v6.0全自动测试套件',
        executionTime: new Date().toISOString(),
        results: {
          environment: '已完成',
          apiConnections: '已完成',
          jupyterNotebooks: '已完成',
          nextjsApplication: '已完成',
          e2eTravelPlanning: '已完成'
        },
        artifacts: {
          testFiles: cleanupResults.summary.totalTestFiles,
          reports: cleanupResults.summary.totalReports,
          screenshots: cleanupResults.summary.totalScreenshots,
          diskUsage: `${cleanupResults.summary.diskSpaceUsed}MB`
        },
        status: 'COMPLETED'
      };

      const summaryPath = path.join(testResultsDir, 'test-execution-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
      cleanupResults.actions.push(`测试摘要已保存: ${summaryPath}`);

      // 3. 创建README文件
      cleanupResults.actions.push('创建测试结果README');
      
      const readmeContent = `# 智游助手v6.0测试结果

## 测试执行信息
- **执行时间**: ${new Date().toLocaleString('zh-CN')}
- **测试套件**: 智游助手v6.0全自动测试套件
- **测试类型**: 端到端自动化测试

## 测试结果文件

### 主要报告
- \`comprehensive-test-report.json\` - 综合测试报告
- \`performance-benchmark-report.json\` - 性能基准报告
- \`test-report.html\` - HTML格式测试报告

### 模块测试结果
- \`environment-test-results.json\` - 环境配置验证结果
- \`api-test-results.json\` - API连接测试结果
- \`notebook-test-results.json\` - Jupyter Notebook执行结果
- \`nextjs-test-results.json\` - Next.js应用测试结果
- \`e2e-travel-planning-results.json\` - 端到端旅游规划测试结果

### 辅助文件
- \`test-execution-summary.json\` - 测试执行摘要
- \`test-metadata.json\` - 测试元数据
- \`setup-results.json\` - 全局设置结果
- \`teardown-results.json\` - 全局清理结果

## 截图和媒体文件
- \`screenshots/\` - 测试过程截图
- \`videos/\` - 测试执行视频（如有）
- \`traces/\` - Playwright执行轨迹（如有）

## 统计信息
- **测试文件数量**: ${cleanupResults.summary.totalTestFiles}
- **报告文件数量**: ${cleanupResults.summary.totalReports}
- **截图数量**: ${cleanupResults.summary.totalScreenshots}
- **磁盘使用**: ${cleanupResults.summary.diskSpaceUsed}MB

## 查看报告
1. 打开 \`test-report.html\` 查看可视化报告
2. 查看 \`comprehensive-test-report.json\` 了解详细结果
3. 检查各模块的具体测试结果文件

## 下一步行动
请根据测试结果中的建议和下一步行动计划进行后续工作。
`;

      const readmePath = path.join(testResultsDir, 'README.md');
      fs.writeFileSync(readmePath, readmeContent);
      cleanupResults.actions.push(`README文件已创建: ${readmePath}`);

      // 4. 输出最终统计
      console.log('📊 测试执行完成统计:');
      console.log(`   📁 测试文件: ${cleanupResults.summary.totalTestFiles}个`);
      console.log(`   📋 报告文件: ${cleanupResults.summary.totalReports}个`);
      console.log(`   📸 截图文件: ${cleanupResults.summary.totalScreenshots}个`);
      console.log(`   💾 磁盘使用: ${cleanupResults.summary.diskSpaceUsed}MB`);
      console.log(`   📂 结果目录: ${testResultsDir}`);

      // 5. 保存清理结果
      const cleanupPath = path.join(testResultsDir, 'cleanup-results.json');
      fs.writeFileSync(cleanupPath, JSON.stringify(cleanupResults, null, 2));

      console.log('✅ 最终清理工作完成');
      console.log('🎉 智游助手v6.0全自动测试套件执行完毕！');

    } catch (error) {
      console.error('❌ 清理工作失败:', error);
      cleanupResults.actions.push(`清理失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
});
