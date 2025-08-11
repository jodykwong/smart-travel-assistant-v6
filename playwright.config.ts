/**
 * 智游助手v6.5 Playwright测试配置
 * 端到端自动化测试框架配置
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',
  
  // 全局测试超时时间
  timeout: 60000,
  
  // 期望超时时间
  expect: {
    timeout: 10000,
  },
  
  // 失败重试次数
  retries: process.env.CI ? 2 : 1,
  
  // 并行执行worker数量
  workers: process.env.CI ? 1 : undefined,
  
  // 报告生成器
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  // 全局设置
  use: {
    // 基础URL
    baseURL: 'http://localhost:3001',

    // 浏览器追踪
    trace: 'on-first-retry',

    // 截图策略
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,

    // 默认导航超时
    navigationTimeout: 30000,

    // 默认操作超时
    actionTimeout: 10000,

    // 环境变量传递 - 修复测试环境无法读取环境变量的问题
    env: {
      // AI服务配置
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
      DEEPSEEK_MODEL_NAME: process.env.DEEPSEEK_MODEL_NAME,
      SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
      SILICONFLOW_BASE_URL: process.env.SILICONFLOW_BASE_URL,
      SILICONFLOW_DEEPSEEK_MODEL: process.env.SILICONFLOW_DEEPSEEK_MODEL,

      // 地图服务配置
      AMAP_MCP_API_KEY: process.env.AMAP_MCP_API_KEY,
      AMAP_MCP_SERVER_URL: process.env.AMAP_MCP_SERVER_URL,
      TENCENT_MCP_API_KEY: process.env.TENCENT_MCP_API_KEY,
      TENCENT_MCP_BASE_URL: process.env.TENCENT_MCP_BASE_URL,
      MCP_AMAP_ENABLED: process.env.MCP_AMAP_ENABLED,
      MCP_TENCENT_ENABLED: process.env.MCP_TENCENT_ENABLED,

      // 冗余配置
      MAP_PROVIDERS: process.env.MAP_PROVIDERS,
      MAP_PRIMARY_PROVIDER: process.env.MAP_PRIMARY_PROVIDER,
      MAP_FALLBACK_PROVIDER: process.env.MAP_FALLBACK_PROVIDER,
      LLM_PROVIDERS: process.env.LLM_PROVIDERS,
      LLM_PRIMARY_PROVIDER: process.env.LLM_PRIMARY_PROVIDER,
      LLM_FALLBACK_PROVIDER: process.env.LLM_FALLBACK_PROVIDER,

      // 故障转移配置
      FAILOVER_ENABLED: process.env.FAILOVER_ENABLED,
      FAILOVER_TIMEOUT: process.env.FAILOVER_TIMEOUT,
      FAILOVER_RETRY_ATTEMPTS: process.env.FAILOVER_RETRY_ATTEMPTS,
      FAILOVER_CIRCUIT_BREAKER_THRESHOLD: process.env.FAILOVER_CIRCUIT_BREAKER_THRESHOLD,
      LOAD_BALANCER_STRATEGY: process.env.LOAD_BALANCER_STRATEGY,

      // 健康检查配置
      HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED,
      HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL,
      HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT,

      // 应用配置
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },

  // 测试项目配置
  projects: [
    // 桌面端Chrome测试
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // 桌面端Safari测试
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // 桌面端Firefox测试
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // 平板端测试
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
      },
    },
    
    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    
    // 移动端Safari测试
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },
  ],

  // 测试服务器配置
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // 输出目录
  outputDir: 'test-results/artifacts',
  
  // 全局设置和拆卸
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
});
