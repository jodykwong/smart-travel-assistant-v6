import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 智游助手v6.2 QR支付专用测试配置
 * 针对QR支付功能的专门测试配置
 */
export default defineConfig({
  // 测试目录
  testDir: './',
  
  // 全局设置
  fullyParallel: false, // 顺序执行以确保依赖关系
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 单线程执行
  
  // 报告配置
  reporter: [
    ['html', { 
      outputFolder: 'test-results/qr-payment-html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/qr-payment-results.json' 
    }],
    ['list']
  ],
  
  // 全局配置
  use: {
    // 基础URL - 使用已运行的开发服务器
    baseURL: 'http://localhost:3001',
    
    // 浏览器设置
    headless: false, // 显示浏览器以便观察测试
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

  // 项目配置 - 仅Chrome测试
  projects: [
    {
      name: 'qr-payment-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // 启用开发者工具
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
  ],

  // 测试超时
  timeout: 300000, // 5分钟总超时
  expect: {
    timeout: 30000, // 断言超时
  },

  // 不启动webServer，使用已运行的服务器
  // webServer: undefined,

  // 输出目录
  outputDir: 'test-results/qr-payment-artifacts',
});
