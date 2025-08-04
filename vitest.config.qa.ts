/**
 * QA专用的Vitest配置
 * 用于质量保证阶段的测试执行
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 测试文件匹配模式
    include: [
      'src/services/parsers/**/*.test.ts',
      'src/tests/integration/**/*.test.ts',
      'src/tests/performance/**/*.test.ts'
    ],
    
    // 排除E2E测试（单独运行）
    exclude: [
      'src/tests/e2e/**/*',
      'node_modules/**/*'
    ],
    
    // 全局设置
    globals: true,
    
    // 设置文件
    setupFiles: ['src/test/setup.ts'],
    
    // 超时设置
    testTimeout: 30000,  // 30秒，适合性能测试
    hookTimeout: 10000,  // 10秒
    
    // 并发设置
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // 报告器配置
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // 输出文件
    outputFile: {
      json: './test-results/qa-results.json',
      html: './test-results/qa-report.html'
    },
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/qa',
      include: [
        'src/services/parsers/**/*.ts'
      ],
      exclude: [
        'src/services/parsers/**/*.test.ts',
        'src/services/parsers/**/__tests__/**'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // 性能测试特殊配置
    benchmark: {
      include: ['src/tests/performance/**/*.bench.ts'],
      exclude: ['node_modules/**/*'],
      reporters: ['verbose', 'json'],
      outputFile: './test-results/benchmark-results.json'
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './src/tests')
    }
  },
  
  // 环境变量
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_ENABLE_NEW_PARSER': '"true"'
  }
});
