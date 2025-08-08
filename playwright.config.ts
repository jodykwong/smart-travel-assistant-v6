/**
 * 智游助手v6.2 - Playwright统一测试配置
 * 支持单元测试、集成测试、E2E测试和性能测试
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录 - 包含所有测试类型
  testDir: './tests',

  // 测试文件匹配模式
  testMatch: ['**/*.{test,spec}.{js,ts}'],
  
  // 全局测试超时时间
  timeout: 30 * 1000,
  
  // 每个测试的期望超时时间
  expect: {
    timeout: 5000,
  },
  
  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并行执行的worker数量
  workers: 1, // 单线程运行，避免数据冲突
  
  // 测试报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // 全局设置
  use: {
    // 基础URL
    baseURL: 'http://localhost:3001',
    
    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    
    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,
    
    // 录制选项
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    
    // 等待策略
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 项目配置 - 支持不同测试类型
  projects: [
    // 单元测试项目 - 不需要浏览器
    {
      name: 'unit',
      testMatch: ['**/tests/unit/**/*.{test,spec}.{js,ts}'],
      use: {
        // 单元测试不需要浏览器上下文
      },
    },

    // 集成测试项目 - 可能需要浏览器
    {
      name: 'integration',
      testMatch: ['**/tests/integration/**/*.{test,spec}.{js,ts}'],
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },

    // E2E测试项目 - 完整浏览器测试
    {
      name: 'e2e-chromium',
      testMatch: ['**/tests/e2e/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    {
      name: 'e2e-firefox',
      testMatch: ['**/tests/e2e/**/*.spec.ts'],
      use: { ...devices['Desktop Firefox'] },
    },

    // 性能测试项目
    {
      name: 'performance',
      testMatch: ['**/tests/performance/**/*.{test,spec}.{js,ts}'],
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],
  
  // 测试服务器配置
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // 全局设置和清理 - 暂时禁用以简化测试
  // globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});
