/**
 * 智游助手v5.0 - 测试环境设置
 * 全局测试配置和模拟设置
 */

import '@testing-library/jest-dom';
import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// ============= 全局清理 =============

// 每个测试后清理DOM
afterEach(() => {
  cleanup();
});

// ============= MSW服务器设置 =============

// 启动模拟服务器
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// 每个测试后重置处理器
afterEach(() => {
  server.resetHandlers();
});

// 测试完成后关闭服务器
afterAll(() => {
  server.close();
});

// ============= 全局模拟 =============

// 模拟Next.js路由
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// 模拟WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// 模拟localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// 模拟sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// 模拟IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// 模拟ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// 模拟matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 模拟fetch
global.fetch = vi.fn();

// 模拟console方法（避免测试输出污染）
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// 在需要时恢复console
export const restoreConsole = () => {
  global.console = originalConsole;
};

// ============= 测试工具函数 =============

// 等待异步操作完成
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// 模拟延迟
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 创建模拟的SessionId
export const createMockSessionId = (prefix = 'test') => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any;

// 创建模拟的用户偏好
export const createMockUserPreferences = () => ({
  budget: 'mid-range' as const,
  travelStyles: ['culture', 'food'] as const,
  accommodation: 'hotel' as const,
  groupSize: 2,
  specialRequirements: 'Test requirements',
});

// 创建模拟的旅行规划状态
export const createMockTravelPlanningState = () => ({
  sessionId: createMockSessionId(),
  destination: '新疆',
  totalDays: 13,
  startDate: '2024-06-15',
  endDate: '2024-06-27',
  userPreferences: createMockUserPreferences(),
  regions: [],
  currentRegionIndex: 0,
  currentPhase: 'analyze_complexity' as const,
  realData: {},
  regionPlans: {},
  progress: 0,
  errors: [],
  retryCount: 0,
  qualityScore: 0 as any,
  tokensUsed: 0 as any,
  tokensRemaining: 20000 as any,
});

// ============= 自定义匹配器 =============

// 扩展expect匹配器
expect.extend({
  toBeValidSessionId(received: string) {
    const isValid = typeof received === 'string' && received.length > 0;
    return {
      message: () => `expected ${received} to be a valid session ID`,
      pass: isValid,
    };
  },
  
  toBeValidTravelPlan(received: any) {
    const hasRequiredFields = received && 
      typeof received.id === 'string' &&
      typeof received.destination === 'string' &&
      typeof received.totalDays === 'number' &&
      Array.isArray(received.regions);
    
    return {
      message: () => `expected ${received} to be a valid travel plan`,
      pass: hasRequiredFields,
    };
  },
});

// 类型声明
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidSessionId(): T;
    toBeValidTravelPlan(): T;
  }
}
