/**
 * 智游助手v6.2 CI测试配置
 * Week 3-4: 自动化测试集成
 * 复用现有监控系统组件
 */

const path = require('path');

// 测试环境配置
const testConfig = {
  // 基础配置
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,ts,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{js,ts,tsx}'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/out/',
    '<rootDir>/build/'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/monitoring/(.*)$': '<rootDir>/src/lib/monitoring/$1'
  },
  
  // TypeScript转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/ci/test-setup.js'
  ],
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 监控系统组件要求更高覆盖率
    'src/lib/monitoring/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // 支付系统要求最高覆盖率
    'src/services/payment/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'cobertura',
    'json-summary'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage',
  
  // 测试报告配置
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'unit-tests.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // 测试超时
  testTimeout: 30000,
  
  // 并发测试数量
  maxWorkers: '50%'
};

// 集成测试配置
const integrationTestConfig = {
  ...testConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/tests/integration/**/*.{test,spec}.{js,ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/ci/integration-test-setup.js'
  ],
  testTimeout: 60000
};

// E2E测试配置
const e2eTestConfig = {
  displayName: 'E2E Tests',
  testMatch: [
    '<rootDir>/tests/e2e/**/*.{test,spec}.{js,ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/ci/e2e-test-setup.js'
  ],
  testTimeout: 120000,
  maxWorkers: 1 // E2E测试串行执行
};

// 监控系统测试配置
const monitoringTestConfig = {
  ...testConfig,
  displayName: 'Monitoring Tests',
  testMatch: [
    '<rootDir>/src/lib/monitoring/**/*.{test,spec}.{js,ts,tsx}',
    '<rootDir>/tests/monitoring/**/*.{test,spec}.{js,ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/ci/monitoring-test-setup.js'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};

// 性能测试配置
const performanceTestConfig = {
  displayName: 'Performance Tests',
  testMatch: [
    '<rootDir>/tests/performance/**/*.{test,spec}.{js,ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/ci/performance-test-setup.js'
  ],
  testTimeout: 300000 // 5分钟超时
};

module.exports = {
  // 默认配置
  ...testConfig,
  
  // 多项目配置
  projects: [
    {
      ...testConfig,
      displayName: 'Unit Tests'
    },
    integrationTestConfig,
    e2eTestConfig,
    monitoringTestConfig,
    performanceTestConfig
  ]
};

// 导出各种配置供CI使用
module.exports.unitTestConfig = testConfig;
module.exports.integrationTestConfig = integrationTestConfig;
module.exports.e2eTestConfig = e2eTestConfig;
module.exports.monitoringTestConfig = monitoringTestConfig;
module.exports.performanceTestConfig = performanceTestConfig;
