/**
 * Playwright 单元测试工具
 * 为单元测试提供类似 Vitest 的 API
 */

import { test as base, expect } from '@playwright/test';

// 扩展 Playwright 的 test 对象，添加单元测试功能
export const test = base.extend({
  // 为单元测试提供一个空的页面上下文（不实际启动浏览器）
  unitContext: async ({}, use) => {
    // 单元测试不需要浏览器上下文
    await use({});
  },
});

// 导出 expect 用于断言
export { expect };

// 模拟 Vitest 的 describe 和 it 函数
export const describe = test.describe;
export const it = test;

// 模拟 Vitest 的生命周期钩子
export const beforeAll = test.beforeAll;
export const afterAll = test.afterAll;
export const beforeEach = test.beforeEach;
export const afterEach = test.afterEach;

// 模拟 Vitest 的 vi 对象（用于 mock）
export const vi = {
  fn: (implementation?: any) => {
    const mockFn = (...args: any[]) => {
      mockFn.calls.push(args);
      if (implementation) {
        return implementation(...args);
      }
    };
    mockFn.calls = [];
    mockFn.mockReturnValue = (value: any) => {
      implementation = () => value;
      return mockFn;
    };
    mockFn.mockImplementation = (impl: any) => {
      implementation = impl;
      return mockFn;
    };
    mockFn.mockResolvedValue = (value: any) => {
      implementation = () => Promise.resolve(value);
      return mockFn;
    };
    mockFn.mockRejectedValue = (error: any) => {
      implementation = () => Promise.reject(error);
      return mockFn;
    };
    return mockFn;
  },
  
  mock: (path: string, factory?: () => any) => {
    // 简单的模块模拟实现
    console.warn(`vi.mock('${path}') - 在 Playwright 中模拟模块功能有限`);
  },
  
  spyOn: (object: any, method: string) => {
    const original = object[method];
    const spy = vi.fn(original);
    object[method] = spy;
    spy.mockRestore = () => {
      object[method] = original;
    };
    return spy;
  },
};

// 性能测试工具
export const performance = {
  now: () => Date.now(),
  mark: (name: string) => {
    console.time(name);
  },
  measure: (name: string, startMark: string) => {
    console.timeEnd(startMark);
  },
};

// 内存使用监控
export const memoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
  };
};
