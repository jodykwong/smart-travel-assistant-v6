/**
 * 智游助手v5.0 - Vitest测试配置
 * 单元测试、集成测试和覆盖率配置
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 全局设置
    globals: true,
    
    // 设置文件
    setupFiles: ['./src/test/setup.ts'],
    
    // 测试文件匹配模式
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'e2e',
    ],
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.next/**',
        'src/pages/_app.tsx',
        'src/pages/_document.tsx',
        'src/pages/api/**', // API路由单独测试
      ],
      // 覆盖率阈值
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // 关键模块的更高要求
        'src/store/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/services/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    
    // 测试超时
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // 并发配置
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    
    // 监听模式配置
    watch: {
      ignore: ['node_modules/**', 'dist/**', '.next/**'],
    },
    
    // 报告器
    reporter: ['verbose'],
  },
  
  // 路径解析
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
  
  // 定义全局变量
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_API_BASE_URL': '"/api"',
    'process.env.NEXT_PUBLIC_WS_URL': '"ws://localhost:3000"',
  },
});
