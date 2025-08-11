/**
 * API健康检查测试
 * 验证 /api/health/failover 端点功能
 */

import { test, expect } from '@playwright/test';

test.describe('API健康检查测试', () => {
  test.beforeEach(async ({ page }) => {
    // 确保服务器运行
    await page.goto('/');
  });

  test('健康检查端点应该返回系统状态', async ({ page }) => {
    // 直接调用健康检查API
    const response = await page.request.get('/api/health/failover');
    
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    
    // 验证响应结构
    expect(healthData).toHaveProperty('timestamp');
    expect(healthData).toHaveProperty('llm');
    expect(healthData).toHaveProperty('map');
    expect(healthData).toHaveProperty('overall');
    
    // 验证LLM健康状态
    expect(healthData.llm).toHaveProperty('primary');
    expect(healthData.llm).toHaveProperty('fallback');
    expect(healthData.llm).toHaveProperty('activeProvider');
    
    // 验证地图服务健康状态
    expect(healthData.map).toHaveProperty('primary');
    expect(healthData.map).toHaveProperty('fallback');
    expect(healthData.map).toHaveProperty('activeProvider');
    
    // 验证整体健康状态
    expect(['healthy', 'degraded', 'unhealthy']).toContain(healthData.overall.status);
    expect(typeof healthData.overall.score).toBe('number');
    expect(healthData.overall.score).toBeGreaterThanOrEqual(0);
    expect(healthData.overall.score).toBeLessThanOrEqual(100);
    
    console.log('🏥 系统健康状态:', JSON.stringify(healthData, null, 2));
  });

  test('应该能够检测LLM服务状态', async ({ page }) => {
    const response = await page.request.get('/api/health/failover');
    const healthData = await response.json();
    
    // 验证LLM服务状态
    const llmHealth = healthData.llm;
    
    // 主服务状态
    expect(llmHealth.primary).toHaveProperty('provider');
    expect(llmHealth.primary).toHaveProperty('healthy');
    expect(llmHealth.primary).toHaveProperty('responseTime');
    expect(typeof llmHealth.primary.healthy).toBe('boolean');
    expect(typeof llmHealth.primary.responseTime).toBe('number');
    
    // 备用服务状态
    expect(llmHealth.fallback).toHaveProperty('provider');
    expect(llmHealth.fallback).toHaveProperty('healthy');
    expect(llmHealth.fallback).toHaveProperty('responseTime');
    expect(typeof llmHealth.fallback.healthy).toBe('boolean');
    expect(typeof llmHealth.fallback.responseTime).toBe('number');
    
    // 活跃提供商
    expect(['deepseek', 'siliconflow']).toContain(llmHealth.activeProvider);
    
    console.log('🤖 LLM服务状态:', {
      primary: `${llmHealth.primary.provider} (${llmHealth.primary.healthy ? '健康' : '不健康'})`,
      fallback: `${llmHealth.fallback.provider} (${llmHealth.fallback.healthy ? '健康' : '不健康'})`,
      active: llmHealth.activeProvider
    });
  });

  test('应该能够检测地图服务状态', async ({ page }) => {
    const response = await page.request.get('/api/health/failover');
    const healthData = await response.json();
    
    // 验证地图服务状态
    const mapHealth = healthData.map;
    
    // 主服务状态
    expect(mapHealth.primary).toHaveProperty('provider');
    expect(mapHealth.primary).toHaveProperty('healthy');
    expect(mapHealth.primary).toHaveProperty('responseTime');
    expect(typeof mapHealth.primary.healthy).toBe('boolean');
    expect(typeof mapHealth.primary.responseTime).toBe('number');
    
    // 备用服务状态
    expect(mapHealth.fallback).toHaveProperty('provider');
    expect(mapHealth.fallback).toHaveProperty('healthy');
    expect(mapHealth.fallback).toHaveProperty('responseTime');
    expect(typeof mapHealth.fallback.healthy).toBe('boolean');
    expect(typeof mapHealth.fallback.responseTime).toBe('number');
    
    // 活跃提供商
    expect(['amap', 'tencent']).toContain(mapHealth.activeProvider);
    
    console.log('🗺️ 地图服务状态:', {
      primary: `${mapHealth.primary.provider} (${mapHealth.primary.healthy ? '健康' : '不健康'})`,
      fallback: `${mapHealth.fallback.provider} (${mapHealth.fallback.healthy ? '健康' : '不健康'})`,
      active: mapHealth.activeProvider
    });
  });

  test('应该提供详细的错误信息', async ({ page }) => {
    const response = await page.request.get('/api/health/failover');
    const healthData = await response.json();
    
    // 检查是否有错误信息
    if (healthData.overall.status !== 'healthy') {
      expect(healthData).toHaveProperty('errors');
      expect(Array.isArray(healthData.errors)).toBe(true);
      
      if (healthData.errors.length > 0) {
        healthData.errors.forEach((error: any) => {
          expect(error).toHaveProperty('service');
          expect(error).toHaveProperty('message');
          expect(typeof error.service).toBe('string');
          expect(typeof error.message).toBe('string');
        });
        
        console.log('⚠️ 系统错误:', healthData.errors);
      }
    }
  });

  test('应该在合理时间内响应', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.request.get('/api/health/failover');
    
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(10000); // 10秒内响应
    
    console.log(`⏱️ 健康检查响应时间: ${responseTime}ms`);
  });

  test('应该支持CORS请求', async ({ page }) => {
    const response = await page.request.get('/api/health/failover', {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    
    expect(response.status()).toBe(200);
    
    // 检查CORS头
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('应该处理并发请求', async ({ page }) => {
    // 并发发送多个健康检查请求
    const requests = Array.from({ length: 5 }, () => 
      page.request.get('/api/health/failover')
    );
    
    const responses = await Promise.all(requests);
    
    // 所有请求都应该成功
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // 验证响应数据一致性
    const healthDataList = await Promise.all(
      responses.map(response => response.json())
    );
    
    // 所有响应的结构应该一致
    healthDataList.forEach(healthData => {
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('llm');
      expect(healthData).toHaveProperty('map');
      expect(healthData).toHaveProperty('overall');
    });
    
    console.log('🔄 并发请求测试通过，所有响应结构一致');
  });

  test('应该提供系统配置信息', async ({ page }) => {
    const response = await page.request.get('/api/health/failover');
    const healthData = await response.json();
    
    // 验证配置信息
    if (healthData.config) {
      expect(healthData.config).toHaveProperty('failoverEnabled');
      expect(healthData.config).toHaveProperty('loadBalancerStrategy');
      expect(healthData.config).toHaveProperty('healthCheckEnabled');
      
      expect(typeof healthData.config.failoverEnabled).toBe('boolean');
      expect(typeof healthData.config.loadBalancerStrategy).toBe('string');
      expect(typeof healthData.config.healthCheckEnabled).toBe('boolean');
      
      console.log('⚙️ 系统配置:', {
        failover: healthData.config.failoverEnabled ? '启用' : '禁用',
        loadBalancer: healthData.config.loadBalancerStrategy,
        healthCheck: healthData.config.healthCheckEnabled ? '启用' : '禁用'
      });
    }
  });

  test('应该记录服务性能指标', async ({ page }) => {
    const response = await page.request.get('/api/health/failover');
    const healthData = await response.json();
    
    // 验证性能指标
    if (healthData.metrics) {
      expect(healthData.metrics).toHaveProperty('totalRequests');
      expect(healthData.metrics).toHaveProperty('successfulRequests');
      expect(healthData.metrics).toHaveProperty('failedRequests');
      expect(healthData.metrics).toHaveProperty('averageResponseTime');
      
      expect(typeof healthData.metrics.totalRequests).toBe('number');
      expect(typeof healthData.metrics.successfulRequests).toBe('number');
      expect(typeof healthData.metrics.failedRequests).toBe('number');
      expect(typeof healthData.metrics.averageResponseTime).toBe('number');
      
      // 计算成功率
      const successRate = healthData.metrics.totalRequests > 0 
        ? (healthData.metrics.successfulRequests / healthData.metrics.totalRequests) * 100 
        : 0;
      
      console.log('📊 性能指标:', {
        总请求数: healthData.metrics.totalRequests,
        成功请求数: healthData.metrics.successfulRequests,
        失败请求数: healthData.metrics.failedRequests,
        成功率: `${successRate.toFixed(2)}%`,
        平均响应时间: `${healthData.metrics.averageResponseTime}ms`
      });
    }
  });
});
