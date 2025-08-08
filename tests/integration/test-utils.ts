/**
 * Playwright 测试工具
 */

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  unitContext: async ({}, use) => {
    await use({});
  },
});

export { expect };
export const describe = test.describe;
export const it = test;
export const beforeAll = test.beforeAll;
export const afterAll = test.afterAll;
export const beforeEach = test.beforeEach;
export const afterEach = test.afterEach;

export const vi = {
  fn: (implementation?: any) => {
    const mockFn = (...args: any[]) => {
      mockFn.calls.push(args);
      if (implementation) return implementation(...args);
    };
    mockFn.calls = [];
    mockFn.mockReturnValue = (value: any) => { implementation = () => value; return mockFn; };
    mockFn.mockImplementation = (impl: any) => { implementation = impl; return mockFn; };
    return mockFn;
  },
  mock: (path: string) => console.warn(`vi.mock('${path}') - 功能有限`),
  spyOn: (object: any, method: string) => {
    const original = object[method];
    const spy = vi.fn(original);
    object[method] = spy;
    spy.mockRestore = () => { object[method] = original; };
    return spy;
  },
};
