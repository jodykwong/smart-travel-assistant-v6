/**
 * QA专用的Playwright配置
 * 用于端到端测试和跨浏览器兼容性测试
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录
  testDir: './src/tests/e2e',
  
  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',
  
  // 全局设置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  // 报告器
  reporter: [
    ['html', { outputFolder: './test-results/e2e-report' }],
    ['json', { outputFile: './test-results/e2e-results.json' }],
    ['junit', { outputFile: './test-results/e2e-junit.xml' }]
  ],
  
  // 全局配置
  use: {
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    
    // 浏览器设置
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // 截图和视频
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 超时设置
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 测试项目配置
  projects: [
    // 桌面浏览器
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // 移动设备
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // 平板设备
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
    
    // 特殊测试项目
    {
      name: 'smoke-tests',
      testMatch: '**/*smoke*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'performance-tests',
      testMatch: '**/*performance*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // 性能测试特殊配置
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-extensions']
        }
      },
    }
  ],
  
  // Web服务器配置（用于本地测试）
  ...(process.env.CI ? {} : {
    webServer: {
      command: 'npm run dev',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  }),
  
  // 输出目录
  outputDir: './test-results/e2e-artifacts',
  
  // 全局设置
  globalSetup: './src/tests/e2e/global-setup.ts',
  globalTeardown: './src/tests/e2e/global-teardown.ts',
  
  // 期望配置
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.2,
    },
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },
});
