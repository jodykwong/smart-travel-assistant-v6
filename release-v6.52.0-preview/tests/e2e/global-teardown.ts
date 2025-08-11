import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 智游助手v6.0 全局测试清理
 * 在所有测试完成后执行的清理工作
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试清理');
  console.log('============================================================');

  const teardownResults = {
    timestamp: new Date().toISOString(),
    cleanup: {} as Record<string, any>
  };

  try {
    // 1. 生成综合测试报告
    console.log('📊 步骤1: 生成综合测试报告...');
    const comprehensiveReport = await generateComprehensiveReport();
    teardownResults.cleanup.comprehensiveReport = comprehensiveReport;

    // 2. 清理临时文件
    console.log('🗑️ 步骤2: 清理临时文件...');
    const fileCleanup = await cleanupTemporaryFiles();
    teardownResults.cleanup.fileCleanup = fileCleanup;

    // 3. 生成性能基准报告
    console.log('⚡ 步骤3: 生成性能基准报告...');
    const performanceReport = await generatePerformanceReport();
    teardownResults.cleanup.performanceReport = performanceReport;

    // 4. 生成HTML测试报告
    console.log('🌐 步骤4: 生成HTML测试报告...');
    const htmlReport = await generateHTMLReport();
    teardownResults.cleanup.htmlReport = htmlReport;

    // 5. 保存测试元数据
    console.log('💾 步骤5: 保存测试元数据...');
    const metadata = await saveTestMetadata();
    teardownResults.cleanup.metadata = metadata;

    // 保存清理结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'teardown-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(teardownResults, null, 2));

    console.log('✅ 全局清理完成');
    console.log(`📊 清理结果已保存到: ${resultsPath}`);

  } catch (error) {
    console.error('❌ 全局清理失败:', error);
    
    teardownResults.cleanup.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    const resultsPath = path.join(process.cwd(), 'test-results', 'teardown-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(teardownResults, null, 2));
  }
}

/**
 * 生成综合测试报告
 */
async function generateComprehensiveReport() {
  const reportData = {
    testSuite: '智游助手v6.0全自动测试套件',
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      successRate: 0,
      totalDuration: 0
    },
    modules: {} as Record<string, any>,
    overallHealth: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown',
    recommendations: [] as string[],
    nextActions: [] as string[]
  };

  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    // 收集各模块测试结果
    const resultFiles = [
      'environment-test-results.json',
      'api-test-results.json',
      'notebook-test-results.json',
      'nextjs-test-results.json',
      'e2e-travel-planning-results.json'
    ];

    for (const file of resultFiles) {
      const filePath = path.join(testResultsDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const moduleResults = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const moduleName = file.replace('-test-results.json', '').replace('-results.json', '');
          reportData.modules[moduleName] = moduleResults;
        } catch (error) {
          console.warn(`无法解析测试结果文件: ${file}`);
        }
      }
    }

    // 计算总体统计
    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;

    Object.values(reportData.modules).forEach((module: any) => {
      if (module.tests) {
        const moduleTests = Object.values(module.tests);
        totalTests += moduleTests.length;
        passedTests += moduleTests.filter((test: any) => test.success || test.valid || test.loaded).length;
      }
      if (module.summary?.totalDuration) {
        totalDuration += module.summary.totalDuration;
      }
    });

    reportData.summary.totalTests = totalTests;
    reportData.summary.passedTests = passedTests;
    reportData.summary.failedTests = totalTests - passedTests;
    reportData.summary.successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    reportData.summary.totalDuration = totalDuration;

    // 确定整体健康状态
    if (reportData.summary.successRate >= 95) reportData.overallHealth = 'excellent';
    else if (reportData.summary.successRate >= 85) reportData.overallHealth = 'good';
    else if (reportData.summary.successRate >= 70) reportData.overallHealth = 'fair';
    else reportData.overallHealth = 'poor';

    // 生成建议
    if (reportData.summary.successRate < 90) {
      reportData.recommendations.push('测试成功率需要提升，请检查失败的测试用例');
    }
    if (reportData.summary.totalDuration > 600000) {
      reportData.recommendations.push('测试执行时间过长，建议优化测试性能');
    }

    // 生成下一步行动
    if (reportData.overallHealth === 'excellent' || reportData.overallHealth === 'good') {
      reportData.nextActions.push('系统已准备好进入生产环境');
      reportData.nextActions.push('建立持续集成和监控');
    } else {
      reportData.nextActions.push('修复失败的测试用例');
      reportData.nextActions.push('重新运行测试套件');
    }

    // 保存综合报告
    const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    return {
      success: true,
      reportPath,
      overallHealth: reportData.overallHealth,
      successRate: reportData.summary.successRate
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 清理临时文件
 */
async function cleanupTemporaryFiles() {
  const cleanup = {
    filesRemoved: 0,
    directoriesCreated: 0,
    errors: [] as string[]
  };

  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    // 确保目录结构存在
    const directories = [
      'screenshots',
      'videos',
      'traces',
      'artifacts',
      'reports'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(testResultsDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        cleanup.directoriesCreated++;
      }
    });

    // 清理旧的临时文件（保留最近的测试结果）
    const tempFiles = [
      'test_temp.txt',
      'temp_notebook_output.ipynb',
      'debug.log'
    ];

    tempFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          cleanup.filesRemoved++;
        } catch (error) {
          cleanup.errors.push(`无法删除文件 ${file}: ${error}`);
        }
      }
    });

  } catch (error) {
    cleanup.errors.push(error instanceof Error ? error.message : String(error));
  }

  return cleanup;
}

/**
 * 生成性能基准报告
 */
async function generatePerformanceReport() {
  const performanceData = {
    timestamp: new Date().toISOString(),
    benchmarks: {
      apiResponseTimes: {} as Record<string, number>,
      pageLoadTimes: {} as Record<string, number>,
      notebookExecutionTimes: {} as Record<string, number>,
      overallPerformanceScore: 0
    },
    recommendations: [] as string[]
  };

  try {
    // 从各个测试结果中提取性能数据
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    // API性能数据
    const apiResultsPath = path.join(testResultsDir, 'api-test-results.json');
    if (fs.existsSync(apiResultsPath)) {
      const apiResults = JSON.parse(fs.readFileSync(apiResultsPath, 'utf8'));
      if (apiResults.tests) {
        Object.entries(apiResults.tests).forEach(([api, data]: [string, any]) => {
          if (data.connectionTest?.responseTime) {
            performanceData.benchmarks.apiResponseTimes[api] = data.connectionTest.responseTime;
          }
        });
      }
    }

    // 页面性能数据
    const nextjsResultsPath = path.join(testResultsDir, 'nextjs-test-results.json');
    if (fs.existsSync(nextjsResultsPath)) {
      const nextjsResults = JSON.parse(fs.readFileSync(nextjsResultsPath, 'utf8'));
      if (nextjsResults.pages) {
        Object.entries(nextjsResults.pages).forEach(([page, data]: [string, any]) => {
          if (data.loadTime) {
            performanceData.benchmarks.pageLoadTimes[page] = data.loadTime;
          }
        });
      }
    }

    // Notebook执行时间
    const notebookResultsPath = path.join(testResultsDir, 'notebook-test-results.json');
    if (fs.existsSync(notebookResultsPath)) {
      const notebookResults = JSON.parse(fs.readFileSync(notebookResultsPath, 'utf8'));
      if (notebookResults.notebooks) {
        Object.entries(notebookResults.notebooks).forEach(([notebook, data]: [string, any]) => {
          if (data.executionTime) {
            performanceData.benchmarks.notebookExecutionTimes[notebook] = data.executionTime;
          }
        });
      }
    }

    // 计算总体性能评分
    let totalScore = 100;
    
    // API响应时间评分
    const avgApiTime = Object.values(performanceData.benchmarks.apiResponseTimes).reduce((a, b) => a + b, 0) / 
                      Object.values(performanceData.benchmarks.apiResponseTimes).length || 0;
    if (avgApiTime > 5000) totalScore -= 20;
    else if (avgApiTime > 3000) totalScore -= 10;

    // 页面加载时间评分
    const avgPageTime = Object.values(performanceData.benchmarks.pageLoadTimes).reduce((a, b) => a + b, 0) / 
                       Object.values(performanceData.benchmarks.pageLoadTimes).length || 0;
    if (avgPageTime > 8000) totalScore -= 25;
    else if (avgPageTime > 5000) totalScore -= 15;

    performanceData.benchmarks.overallPerformanceScore = Math.max(0, totalScore);

    // 生成性能建议
    if (avgApiTime > 3000) {
      performanceData.recommendations.push('API响应时间较慢，建议优化后端性能');
    }
    if (avgPageTime > 5000) {
      performanceData.recommendations.push('页面加载时间较长，建议优化前端资源');
    }

    // 保存性能报告
    const reportPath = path.join(testResultsDir, 'performance-benchmark-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(performanceData, null, 2));

    return {
      success: true,
      reportPath,
      overallScore: performanceData.benchmarks.overallPerformanceScore
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 生成HTML测试报告
 */
async function generateHTMLReport() {
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const htmlReportPath = path.join(testResultsDir, 'test-report.html');

    // 读取综合测试报告
    const comprehensiveReportPath = path.join(testResultsDir, 'comprehensive-test-report.json');
    let reportData = { summary: { successRate: 0 }, overallHealth: 'unknown' };
    
    if (fs.existsSync(comprehensiveReportPath)) {
      reportData = JSON.parse(fs.readFileSync(comprehensiveReportPath, 'utf8'));
    }

    // 生成简单的HTML报告
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智游助手v6.0测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .health-excellent { background: #d4edda; }
        .health-good { background: #d1ecf1; }
        .health-fair { background: #fff3cd; }
        .health-poor { background: #f8d7da; }
    </style>
</head>
<body>
    <div class="header">
        <h1>智游助手v6.0全自动测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="summary">
        <div class="metric health-${reportData.overallHealth}">
            <h3>整体健康状态</h3>
            <p><strong>${reportData.overallHealth.toUpperCase()}</strong></p>
        </div>
        <div class="metric">
            <h3>测试成功率</h3>
            <p class="${reportData.summary.successRate >= 90 ? 'success' : reportData.summary.successRate >= 70 ? 'warning' : 'danger'}">
                <strong>${reportData.summary.successRate.toFixed(1)}%</strong>
            </p>
        </div>
    </div>
    
    <div class="details">
        <h2>测试详情</h2>
        <p>详细的测试结果请查看JSON格式的报告文件。</p>
        <ul>
            <li><a href="comprehensive-test-report.json">综合测试报告</a></li>
            <li><a href="performance-benchmark-report.json">性能基准报告</a></li>
            <li><a href="environment-test-results.json">环境配置测试</a></li>
            <li><a href="api-test-results.json">API连接测试</a></li>
            <li><a href="notebook-test-results.json">Notebook执行测试</a></li>
            <li><a href="nextjs-test-results.json">Next.js应用测试</a></li>
            <li><a href="e2e-travel-planning-results.json">端到端测试</a></li>
        </ul>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlReportPath, htmlContent);

    return {
      success: true,
      reportPath: htmlReportPath
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 保存测试元数据
 */
async function saveTestMetadata() {
  const metadata = {
    testSuite: '智游助手v6.0全自动测试套件',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    configuration: {
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      testTimeout: 300000,
      retries: 1
    }
  };

  try {
    const metadataPath = path.join(process.cwd(), 'test-results', 'test-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return {
      success: true,
      metadataPath
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default globalTeardown;
