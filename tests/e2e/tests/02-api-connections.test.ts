import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * API连接测试套件
 * 测试DeepSeek API、硅基流动API、高德MCP API的连接状态
 */
test.describe('API连接测试', () => {
  let testResults: any = {};

  test.beforeAll(async () => {
    console.log('🌐 开始API连接测试');
    testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
  });

  test.afterAll(async () => {
    // 保存测试结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'api-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 API测试结果已保存到: ${resultsPath}`);
  });

  test('测试DeepSeek API连接', async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1';
    
    expect(apiKey, 'DeepSeek API密钥应该存在').toBeTruthy();
    
    const testResult = {
      apiKey: apiKey ? '已配置' : '未配置',
      baseUrl,
      connectionTest: {
        success: false,
        responseTime: 0,
        error: null as string | null,
        statusCode: 0
      }
    };

    if (apiKey) {
      try {
        const startTime = Date.now();
        
        // 测试API连接
        const response = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10秒超时
        });

        testResult.connectionTest.responseTime = Date.now() - startTime;
        testResult.connectionTest.statusCode = response.status;
        
        if (response.ok) {
          testResult.connectionTest.success = true;
          console.log(`✅ DeepSeek API连接成功 (${testResult.connectionTest.responseTime}ms)`);
        } else {
          testResult.connectionTest.error = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`⚠️ DeepSeek API响应异常: ${testResult.connectionTest.error}`);
        }

      } catch (error) {
        testResult.connectionTest.error = error instanceof Error ? error.message : String(error);
        console.log(`❌ DeepSeek API连接失败: ${testResult.connectionTest.error}`);
      }
    }

    // 验证响应时间合理
    if (testResult.connectionTest.success) {
      expect(testResult.connectionTest.responseTime, 'API响应时间应该合理').toBeLessThan(10000);
    }

    testResults.tests.deepseekApi = testResult;
  });

  test('测试硅基流动API连接', async () => {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    const baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
    
    const testResult = {
      apiKey: apiKey ? '已配置' : '未配置',
      baseUrl,
      connectionTest: {
        success: false,
        responseTime: 0,
        error: null as string | null,
        statusCode: 0
      }
    };

    if (apiKey) {
      try {
        const startTime = Date.now();
        
        // 测试API连接
        const response = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        testResult.connectionTest.responseTime = Date.now() - startTime;
        testResult.connectionTest.statusCode = response.status;
        
        if (response.ok) {
          testResult.connectionTest.success = true;
          console.log(`✅ 硅基流动API连接成功 (${testResult.connectionTest.responseTime}ms)`);
        } else {
          testResult.connectionTest.error = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`⚠️ 硅基流动API响应异常: ${testResult.connectionTest.error}`);
        }

      } catch (error) {
        testResult.connectionTest.error = error instanceof Error ? error.message : String(error);
        console.log(`❌ 硅基流动API连接失败: ${testResult.connectionTest.error}`);
      }
    } else {
      console.log('ℹ️ 硅基流动API密钥未配置，跳过测试');
    }

    testResults.tests.siliconflowApi = testResult;
  });

  test('测试高德MCP API连接', async () => {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const baseUrl = process.env.AMAP_MCP_BASE_URL || 'https://mcp.amap.com/sse';
    
    expect(apiKey, '高德MCP API密钥应该存在').toBeTruthy();
    
    const testResult = {
      apiKey: apiKey ? '已配置' : '未配置',
      baseUrl,
      connectionTest: {
        success: false,
        responseTime: 0,
        error: null as string | null,
        statusCode: 0
      }
    };

    if (apiKey) {
      try {
        const startTime = Date.now();
        
        // 测试高德MCP连接 - 使用简单的健康检查
        const testUrl = `https://restapi.amap.com/v3/config/district?key=${apiKey}&keywords=中国&subdistrict=0`;
        
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });

        testResult.connectionTest.responseTime = Date.now() - startTime;
        testResult.connectionTest.statusCode = response.status;
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === '1') {
            testResult.connectionTest.success = true;
            console.log(`✅ 高德MCP API连接成功 (${testResult.connectionTest.responseTime}ms)`);
          } else {
            testResult.connectionTest.error = `API错误: ${data.info}`;
            console.log(`⚠️ 高德MCP API响应异常: ${testResult.connectionTest.error}`);
          }
        } else {
          testResult.connectionTest.error = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`❌ 高德MCP API连接失败: ${testResult.connectionTest.error}`);
        }

      } catch (error) {
        testResult.connectionTest.error = error instanceof Error ? error.message : String(error);
        console.log(`❌ 高德MCP API连接失败: ${testResult.connectionTest.error}`);
      }
    }

    // 验证响应时间合理
    if (testResult.connectionTest.success) {
      expect(testResult.connectionTest.responseTime, 'API响应时间应该合理').toBeLessThan(5000);
    }

    testResults.tests.amapMcpApi = testResult;
  });

  test('测试API性能基准', async () => {
    const performanceResults = {
      totalTests: 0,
      successfulTests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      apiHealthScore: 0
    };

    // 收集所有API测试结果
    const apiTests = [
      testResults.tests.deepseekApi?.connectionTest,
      testResults.tests.siliconflowApi?.connectionTest,
      testResults.tests.amapMcpApi?.connectionTest
    ].filter(test => test && test.responseTime > 0);

    performanceResults.totalTests = apiTests.length;
    performanceResults.successfulTests = apiTests.filter(test => test.success).length;

    if (apiTests.length > 0) {
      const responseTimes = apiTests.map(test => test.responseTime);
      performanceResults.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      performanceResults.maxResponseTime = Math.max(...responseTimes);
      performanceResults.minResponseTime = Math.min(...responseTimes);
      
      // 计算API健康评分 (0-100)
      const successRate = performanceResults.successfulTests / performanceResults.totalTests;
      const avgResponseScore = Math.max(0, 100 - (performanceResults.averageResponseTime / 100));
      performanceResults.apiHealthScore = Math.round((successRate * 70) + (avgResponseScore * 0.3));
    }

    // 验证性能基准
    expect(performanceResults.successfulTests, '至少应该有一个API连接成功').toBeGreaterThan(0);
    
    if (performanceResults.averageResponseTime > 0) {
      expect(performanceResults.averageResponseTime, '平均响应时间应该合理').toBeLessThan(8000);
    }

    console.log(`📊 API性能基准: 成功率 ${performanceResults.successfulTests}/${performanceResults.totalTests}, 平均响应时间 ${Math.round(performanceResults.averageResponseTime)}ms, 健康评分 ${performanceResults.apiHealthScore}/100`);

    testResults.tests.performanceBenchmark = performanceResults;
  });

  test('生成API连接报告', async () => {
    const reportData = {
      summary: {
        timestamp: new Date().toISOString(),
        totalApis: 3,
        connectedApis: 0,
        overallHealth: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
      },
      details: testResults.tests,
      recommendations: [] as string[]
    };

    // 计算连接成功的API数量
    const apiResults = [
      testResults.tests.deepseekApi?.connectionTest?.success,
      testResults.tests.siliconflowApi?.connectionTest?.success,
      testResults.tests.amapMcpApi?.connectionTest?.success
    ];

    reportData.summary.connectedApis = apiResults.filter(Boolean).length;

    // 确定整体健康状态
    const healthScore = testResults.tests.performanceBenchmark?.apiHealthScore || 0;
    if (healthScore >= 90) reportData.summary.overallHealth = 'excellent';
    else if (healthScore >= 75) reportData.summary.overallHealth = 'good';
    else if (healthScore >= 50) reportData.summary.overallHealth = 'fair';
    else reportData.summary.overallHealth = 'poor';

    // 生成建议
    if (!testResults.tests.deepseekApi?.connectionTest?.success) {
      reportData.recommendations.push('检查DeepSeek API密钥配置和网络连接');
    }
    if (!testResults.tests.amapMcpApi?.connectionTest?.success) {
      reportData.recommendations.push('验证高德MCP API密钥有效性');
    }
    if (testResults.tests.performanceBenchmark?.averageResponseTime > 5000) {
      reportData.recommendations.push('API响应时间较慢，建议检查网络环境');
    }

    // 保存详细报告
    const reportPath = path.join(process.cwd(), 'test-results', 'api-connection-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📋 API连接报告已生成: ${reportPath}`);
    console.log(`🏥 整体健康状态: ${reportData.summary.overallHealth} (${reportData.summary.connectedApis}/${reportData.summary.totalApis} APIs连接成功)`);

    testResults.report = reportData;
  });
});
