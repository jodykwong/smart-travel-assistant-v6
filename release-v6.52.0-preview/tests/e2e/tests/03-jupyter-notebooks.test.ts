import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Jupyter Notebook自动化执行测试套件
 * 按顺序自动运行4个核心Notebook文件
 */
test.describe('Jupyter Notebook自动化执行', () => {
  let testResults: any = {};

  test.beforeAll(async () => {
    console.log('📓 开始Jupyter Notebook自动化执行测试');
    testResults = {
      timestamp: new Date().toISOString(),
      notebooks: {}
    };
  });

  test.afterAll(async () => {
    // 保存测试结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'notebook-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 Notebook测试结果已保存到: ${resultsPath}`);
  });

  test('检查Jupyter环境可用性', async () => {
    let jupyterAvailable = false;
    let jupyterVersion = '';
    let nbconvertAvailable = false;

    try {
      // 检查Jupyter是否安装
      jupyterVersion = execSync('jupyter --version', { encoding: 'utf8', timeout: 10000 }).trim();
      jupyterAvailable = true;
      console.log(`✅ Jupyter可用: ${jupyterVersion.split('\n')[0]}`);

      // 检查nbconvert是否可用
      execSync('jupyter nbconvert --version', { encoding: 'utf8', timeout: 10000 });
      nbconvertAvailable = true;
      console.log('✅ jupyter nbconvert可用');

    } catch (error) {
      console.log('❌ Jupyter环境不可用:', error instanceof Error ? error.message : String(error));
    }

    expect(jupyterAvailable, 'Jupyter应该可用').toBeTruthy();
    expect(nbconvertAvailable, 'jupyter nbconvert应该可用').toBeTruthy();

    testResults.environment = {
      jupyterAvailable,
      jupyterVersion,
      nbconvertAvailable
    };
  });

  test('执行01_langgraph_architecture.ipynb', async () => {
    const notebookName = '01_langgraph_architecture.ipynb';
    const notebookPath = path.join(process.cwd(), notebookName);
    
    expect(fs.existsSync(notebookPath), `${notebookName}应该存在`).toBeTruthy();

    const executionResult = await executeNotebook(notebookName, notebookPath);
    
    // 验证执行结果
    expect(executionResult.success, `${notebookName}应该执行成功`).toBeTruthy();
    
    if (executionResult.success) {
      expect(executionResult.executionTime, '执行时间应该合理').toBeLessThan(300000); // 5分钟
      console.log(`✅ ${notebookName} 执行成功 (${Math.round(executionResult.executionTime / 1000)}秒)`);
    } else {
      console.log(`❌ ${notebookName} 执行失败: ${executionResult.error}`);
    }

    testResults.notebooks[notebookName] = executionResult;
  });

  test('执行02_amap_integration.ipynb', async () => {
    const notebookName = '02_amap_integration.ipynb';
    const notebookPath = path.join(process.cwd(), notebookName);
    
    expect(fs.existsSync(notebookPath), `${notebookName}应该存在`).toBeTruthy();

    const executionResult = await executeNotebook(notebookName, notebookPath);
    
    expect(executionResult.success, `${notebookName}应该执行成功`).toBeTruthy();
    
    if (executionResult.success) {
      expect(executionResult.executionTime, '执行时间应该合理').toBeLessThan(180000); // 3分钟
      console.log(`✅ ${notebookName} 执行成功 (${Math.round(executionResult.executionTime / 1000)}秒)`);
    } else {
      console.log(`❌ ${notebookName} 执行失败: ${executionResult.error}`);
    }

    testResults.notebooks[notebookName] = executionResult;
  });

  test('执行03_intelligent_planning.ipynb', async () => {
    const notebookName = '03_intelligent_planning.ipynb';
    const notebookPath = path.join(process.cwd(), notebookName);
    
    expect(fs.existsSync(notebookPath), `${notebookName}应该存在`).toBeTruthy();

    const executionResult = await executeNotebook(notebookName, notebookPath);
    
    expect(executionResult.success, `${notebookName}应该执行成功`).toBeTruthy();
    
    if (executionResult.success) {
      expect(executionResult.executionTime, '执行时间应该合理').toBeLessThan(240000); // 4分钟
      console.log(`✅ ${notebookName} 执行成功 (${Math.round(executionResult.executionTime / 1000)}秒)`);
    } else {
      console.log(`❌ ${notebookName} 执行失败: ${executionResult.error}`);
    }

    testResults.notebooks[notebookName] = executionResult;
  });

  test('执行04_complete_integration_test.ipynb', async () => {
    const notebookName = '04_complete_integration_test.ipynb';
    const notebookPath = path.join(process.cwd(), notebookName);
    
    expect(fs.existsSync(notebookPath), `${notebookName}应该存在`).toBeTruthy();

    const executionResult = await executeNotebook(notebookName, notebookPath);
    
    expect(executionResult.success, `${notebookName}应该执行成功`).toBeTruthy();
    
    if (executionResult.success) {
      expect(executionResult.executionTime, '执行时间应该合理').toBeLessThan(600000); // 10分钟
      console.log(`✅ ${notebookName} 执行成功 (${Math.round(executionResult.executionTime / 1000)}秒)`);
    } else {
      console.log(`❌ ${notebookName} 执行失败: ${executionResult.error}`);
    }

    testResults.notebooks[notebookName] = executionResult;
  });

  test('生成Notebook执行报告', async () => {
    const reportData = {
      summary: {
        timestamp: new Date().toISOString(),
        totalNotebooks: 4,
        successfulExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0
      },
      details: testResults.notebooks,
      performance: {
        fastest: { name: '', time: Infinity },
        slowest: { name: '', time: 0 },
        totalTime: 0
      },
      recommendations: [] as string[]
    };

    // 计算统计信息
    const notebookResults = Object.entries(testResults.notebooks);
    reportData.summary.successfulExecutions = notebookResults.filter(
      ([_, result]: [string, any]) => result.success
    ).length;

    let totalTime = 0;
    for (const [name, result] of notebookResults) {
      const executionTime = (result as any).executionTime || 0;
      totalTime += executionTime;

      if (executionTime < reportData.performance.fastest.time && executionTime > 0) {
        reportData.performance.fastest = { name, time: executionTime };
      }
      if (executionTime > reportData.performance.slowest.time) {
        reportData.performance.slowest = { name, time: executionTime };
      }
    }

    reportData.summary.totalExecutionTime = totalTime;
    reportData.summary.averageExecutionTime = totalTime / notebookResults.length;
    reportData.performance.totalTime = totalTime;

    // 生成建议
    if (reportData.summary.successfulExecutions < reportData.summary.totalNotebooks) {
      reportData.recommendations.push('部分Notebook执行失败，请检查依赖和环境配置');
    }
    if (reportData.summary.averageExecutionTime > 180000) {
      reportData.recommendations.push('Notebook执行时间较长，建议优化代码或增加计算资源');
    }
    if (reportData.performance.slowest.time > 300000) {
      reportData.recommendations.push(`${reportData.performance.slowest.name} 执行时间过长，需要优化`);
    }

    // 保存报告
    const reportPath = path.join(process.cwd(), 'test-results', 'notebook-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📋 Notebook执行报告已生成: ${reportPath}`);
    console.log(`📊 执行统计: ${reportData.summary.successfulExecutions}/${reportData.summary.totalNotebooks} 成功, 总时间 ${Math.round(totalTime / 1000)}秒`);

    // 验证整体执行成功率
    const successRate = reportData.summary.successfulExecutions / reportData.summary.totalNotebooks;
    expect(successRate, 'Notebook执行成功率应该达到75%以上').toBeGreaterThanOrEqual(0.75);

    testResults.report = reportData;
  });
});

/**
 * 执行单个Notebook文件
 */
async function executeNotebook(notebookName: string, notebookPath: string) {
  const result = {
    success: false,
    executionTime: 0,
    error: null as string | null,
    outputPath: '',
    cellsExecuted: 0,
    warnings: [] as string[]
  };

  const startTime = Date.now();
  const outputPath = path.join(process.cwd(), 'test-results', `executed_${notebookName}`);

  try {
    console.log(`🔄 开始执行 ${notebookName}...`);

    // 使用jupyter nbconvert执行notebook
    const command = `jupyter nbconvert --to notebook --execute --output "${outputPath}" "${notebookPath}"`;
    
    const output = execSync(command, {
      encoding: 'utf8',
      timeout: 600000, // 10分钟超时
      maxBuffer: 1024 * 1024 * 10 // 10MB缓冲区
    });

    result.executionTime = Date.now() - startTime;
    result.success = true;
    result.outputPath = outputPath;

    // 分析执行输出
    if (output.includes('warning') || output.includes('Warning')) {
      const warnings = output.split('\n').filter(line => 
        line.toLowerCase().includes('warning')
      );
      result.warnings = warnings;
    }

    // 尝试读取执行后的notebook来统计cell数量
    try {
      if (fs.existsSync(outputPath)) {
        const executedNotebook = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        result.cellsExecuted = executedNotebook.cells?.length || 0;
      }
    } catch (parseError) {
      result.warnings.push('无法解析执行后的notebook文件');
    }

  } catch (error) {
    result.executionTime = Date.now() - startTime;
    result.error = error instanceof Error ? error.message : String(error);
    
    // 尝试从错误信息中提取有用信息
    if (result.error.includes('ModuleNotFoundError')) {
      result.error = '缺少必需的Python模块: ' + result.error.split('ModuleNotFoundError: ')[1]?.split('\n')[0];
    } else if (result.error.includes('timeout')) {
      result.error = 'Notebook执行超时';
    }
  }

  return result;
}
