import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 智游助手v6.0 Playwright配置
 * 全自动端到端测试套件配置
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',
  
  // 全局设置
  fullyParallel: false, // 顺序执行以确保依赖关系
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1, // 单线程执行
  
  // 报告配置
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    ['list']
  ],
  
  // 全局配置
  use: {
    // 基础URL
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    
    // 浏览器设置
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // 截图和视频
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 超时设置
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // 其他设置
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  // 项目配置 - 多浏览器测试
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 启用开发者工具
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },
  ],

  // 测试超时
  timeout: 300000, // 5分钟总超时
  expect: {
    timeout: 30000, // 断言超时
  },

  // Web服务器配置
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      ...process.env,
    },
  },

  // 输出目录
  outputDir: 'test-results/artifacts',
  
  // 全局设置和清理
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
});
