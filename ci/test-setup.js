/**
 * 智游助手v6.2 测试环境设置
 * Week 3-4: 集成现有监控系统组件
 */

// 导入现有监控系统组件
const { MetricsRegistry } = require('../src/lib/monitoring/MetricsRegistry');
const { PrometheusMetricsCollector } = require('../src/lib/monitoring/MetricsCollector');
const { ErrorHandler } = require('../src/lib/monitoring/ErrorHandler');

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.CI = 'true';
process.env.COVERAGE_THRESHOLD = '80';

// 监控系统测试配置
const monitoringConfig = {
  enabled: true,
  service: {
    name: 'smart-travel-assistant-test',
    version: '6.2.0',
    environment: 'test'
  },
  metrics: {
    http: {
      enabled: true,
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    },
    payment: {
      enabled: true,
      buckets: [0.5, 1, 2, 5, 10, 30]
    },
    business: {
      enabled: true,
      updateInterval: 1000 // 测试环境更频繁更新
    }
  }
};

// 初始化测试监控系统
let testMetricsRegistry;
let testMetricsCollector;
let testErrorHandler;

beforeAll(async () => {
  // 初始化监控组件
  testMetricsRegistry = MetricsRegistry.getInstance();
  testMetricsRegistry.initialize(monitoringConfig);
  
  testMetricsCollector = new PrometheusMetricsCollector();
  testErrorHandler = new ErrorHandler();
  
  // 设置全局测试变量
  global.testMetricsRegistry = testMetricsRegistry;
  global.testMetricsCollector = testMetricsCollector;
  global.testErrorHandler = testErrorHandler;
  
  console.log('✅ 测试监控系统初始化完成');
});

afterAll(async () => {
  // 清理监控系统
  if (testMetricsRegistry) {
    testMetricsRegistry.clear();
  }
  
  console.log('✅ 测试监控系统清理完成');
});

// 每个测试前的设置
beforeEach(() => {
  // 重置监控指标
  if (testMetricsRegistry) {
    testMetricsRegistry.resetMetrics();
  }
  
  // 清除模拟函数调用记录
  jest.clearAllMocks();
});

// 每个测试后的清理
afterEach(() => {
  // 验证没有未处理的Promise
  return new Promise(resolve => setImmediate(resolve));
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (testErrorHandler) {
    testErrorHandler.handleError(new Error(reason), {
      service: 'test',
      method: 'unhandledRejection',
      route: 'test'
    });
  }
});

// 测试工具函数
global.testUtils = {
  // 等待异步操作完成
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 模拟HTTP请求
  mockHttpRequest: (method, route, statusCode, duration) => {
    if (testMetricsCollector) {
      testMetricsCollector.recordHttpRequest(method, route, statusCode, duration, 'test');
    }
  },
  
  // 模拟支付操作
  mockPaymentOperation: (stage, provider, duration, success, errorType) => {
    if (testMetricsCollector) {
      testMetricsCollector.recordPaymentMetrics(stage, provider, duration, success, errorType);
    }
  },
  
  // 模拟业务指标更新
  mockBusinessMetrics: (metrics) => {
    if (testMetricsCollector) {
      testMetricsCollector.updateBusinessMetrics(metrics);
    }
  },
  
  // 模拟错误
  mockError: (error, context) => {
    if (testErrorHandler) {
      testErrorHandler.handleError(error, context);
    }
  },
  
  // 获取指标值
  getMetricValue: (metricName) => {
    if (testMetricsRegistry) {
      return testMetricsRegistry.getMetric(metricName);
    }
    return null;
  },
  
  // 验证指标是否存在
  hasMetric: (metricName) => {
    if (testMetricsRegistry) {
      return testMetricsRegistry.hasMetric(metricName);
    }
    return false;
  }
};

// Jest自定义匹配器
expect.extend({
  // 验证指标值
  toHaveMetricValue(received, metricName, expectedValue) {
    const metric = global.testUtils.getMetricValue(metricName);
    const pass = metric && metric.get() === expectedValue;
    
    if (pass) {
      return {
        message: () => `expected metric ${metricName} not to have value ${expectedValue}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected metric ${metricName} to have value ${expectedValue}, but got ${metric ? metric.get() : 'undefined'}`,
        pass: false,
      };
    }
  },
  
  // 验证指标存在
  toHaveMetric(received, metricName) {
    const hasMetric = global.testUtils.hasMetric(metricName);
    
    if (hasMetric) {
      return {
        message: () => `expected not to have metric ${metricName}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected to have metric ${metricName}`,
        pass: false,
      };
    }
  },
  
  // 验证错误处理
  toHaveHandledError(received, errorType) {
    // 这里可以添加错误处理验证逻辑
    return {
      message: () => `expected to have handled error of type ${errorType}`,
      pass: true,
    };
  }
});

// 模拟外部依赖
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

// 模拟数据库连接
jest.mock('../src/lib/database', () => ({
  query: jest.fn(() => Promise.resolve([])),
  transaction: jest.fn((callback) => callback({
    query: jest.fn(() => Promise.resolve([])),
    commit: jest.fn(() => Promise.resolve()),
    rollback: jest.fn(() => Promise.resolve())
  }))
}));

// 模拟Redis连接
jest.mock('../src/lib/cache', () => ({
  get: jest.fn(() => Promise.resolve(null)),
  set: jest.fn(() => Promise.resolve('OK')),
  del: jest.fn(() => Promise.resolve(1)),
  exists: jest.fn(() => Promise.resolve(0))
}));

console.log('✅ 测试环境设置完成 - 集成现有监控系统');
