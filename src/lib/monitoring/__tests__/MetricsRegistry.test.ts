/**
 * MetricsRegistry 单元测试
 * 测试统一指标注册中心的功能
 */

import { MetricsRegistry, MetricDefinition } from '../MetricsRegistry';
import { register } from 'prom-client';

// Mock环境变量
const originalEnv = process.env;

describe('MetricsRegistry', () => {
  let metricsRegistry: MetricsRegistry;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
    
    // 清除所有指标
    register.clear();
    
    // 获取新的实例
    metricsRegistry = MetricsRegistry.getInstance();
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
    
    // 清理指标
    metricsRegistry.clear();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = MetricsRegistry.getInstance();
      const instance2 = MetricsRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('配置加载', () => {
    it('应该加载默认配置', () => {
      const config = metricsRegistry.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.service.name).toBe('smart-travel');
      expect(config.service.version).toBe('6.2.0');
      expect(config.metrics.http.enabled).toBe(true);
    });

    it('应该从环境变量加载配置', () => {
      process.env.SERVICE_NAME = 'test-service';
      process.env.SERVICE_VERSION = '1.0.0';
      process.env.MONITORING_ENABLED = 'false';
      
      // 创建新实例以加载新的环境变量
      const testRegistry = new (MetricsRegistry as any)();
      const config = testRegistry.getConfig();
      
      expect(config.service.name).toBe('test-service');
      expect(config.service.version).toBe('1.0.0');
      expect(config.enabled).toBe(false);
    });

    it('应该解析桶配置', () => {
      process.env.HTTP_METRICS_BUCKETS = '0.1,0.5,1.0,2.0';
      
      const testRegistry = new (MetricsRegistry as any)();
      const config = testRegistry.getConfig();
      
      expect(config.metrics.http.buckets).toEqual([0.1, 0.5, 1.0, 2.0]);
    });
  });

  describe('指标注册', () => {
    beforeEach(() => {
      metricsRegistry.initialize();
    });

    it('应该注册Counter指标', () => {
      const definition: MetricDefinition = {
        name: 'test_counter',
        help: 'Test counter metric',
        type: 'counter',
        labelNames: ['method', 'status']
      };

      metricsRegistry.registerMetric(definition);
      const metric = metricsRegistry.getMetric('test_counter');
      
      expect(metric).toBeDefined();
      expect(metric.name).toBe('test_counter');
    });

    it('应该注册Gauge指标', () => {
      const definition: MetricDefinition = {
        name: 'test_gauge',
        help: 'Test gauge metric',
        type: 'gauge'
      };

      metricsRegistry.registerMetric(definition);
      const metric = metricsRegistry.getMetric('test_gauge');
      
      expect(metric).toBeDefined();
      expect(metric.name).toBe('test_gauge');
    });

    it('应该注册Histogram指标', () => {
      const definition: MetricDefinition = {
        name: 'test_histogram',
        help: 'Test histogram metric',
        type: 'histogram',
        buckets: [0.1, 0.5, 1.0]
      };

      metricsRegistry.registerMetric(definition);
      const metric = metricsRegistry.getMetric('test_histogram');
      
      expect(metric).toBeDefined();
      expect(metric.name).toBe('test_histogram');
    });

    it('应该防止重复注册', () => {
      const definition: MetricDefinition = {
        name: 'duplicate_metric',
        help: 'Duplicate metric',
        type: 'counter'
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      metricsRegistry.registerMetric(definition);
      metricsRegistry.registerMetric(definition); // 重复注册

      expect(consoleSpy).toHaveBeenCalledWith('Metric duplicate_metric already registered');
      
      consoleSpy.mockRestore();
    });

    it('应该抛出不支持的指标类型错误', () => {
      const definition = {
        name: 'invalid_metric',
        help: 'Invalid metric',
        type: 'invalid_type' as any
      };

      expect(() => {
        metricsRegistry.registerMetric(definition);
      }).toThrow('Unsupported metric type: invalid_type');
    });
  });

  describe('预定义指标', () => {
    it('应该注册HTTP指标', () => {
      metricsRegistry.initialize();
      
      const httpRequestsTotal = metricsRegistry.getMetric('http_requests_total');
      const httpRequestDuration = metricsRegistry.getMetric('http_request_duration_seconds');
      
      expect(httpRequestsTotal).toBeDefined();
      expect(httpRequestDuration).toBeDefined();
    });

    it('应该注册支付指标', () => {
      metricsRegistry.initialize();
      
      const paymentSuccessRate = metricsRegistry.getMetric('smart_travel_payment_success_rate');
      const paymentResponseTime = metricsRegistry.getMetric('smart_travel_payment_response_time_seconds');
      const paymentErrors = metricsRegistry.getMetric('smart_travel_payment_errors_total');
      
      expect(paymentSuccessRate).toBeDefined();
      expect(paymentResponseTime).toBeDefined();
      expect(paymentErrors).toBeDefined();
    });

    it('应该注册业务指标', () => {
      metricsRegistry.initialize();
      
      const userRegistrationRate = metricsRegistry.getMetric('smart_travel_user_registration_rate');
      const orderCompletionRate = metricsRegistry.getMetric('smart_travel_order_completion_rate');
      const activeUsers = metricsRegistry.getMetric('smart_travel_active_users');
      
      expect(userRegistrationRate).toBeDefined();
      expect(orderCompletionRate).toBeDefined();
      expect(activeUsers).toBeDefined();
    });

    it('应该根据配置禁用指标组', () => {
      process.env.HTTP_METRICS_ENABLED = 'false';
      
      const testRegistry = new (MetricsRegistry as any)();
      testRegistry.initialize();
      
      const httpRequestsTotal = testRegistry.getMetric('http_requests_total');
      expect(httpRequestsTotal).toBeUndefined();
    });
  });

  describe('指标获取', () => {
    beforeEach(() => {
      metricsRegistry.initialize();
    });

    it('应该返回所有指标', () => {
      const metrics = metricsRegistry.getAllMetrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('smart_travel_payment_success_rate');
    });

    it('应该返回undefined对于不存在的指标', () => {
      const metric = metricsRegistry.getMetric('non_existent_metric');
      expect(metric).toBeUndefined();
    });
  });

  describe('清理功能', () => {
    it('应该清除所有指标', () => {
      metricsRegistry.initialize();
      
      // 验证指标存在
      let metrics = metricsRegistry.getAllMetrics();
      expect(metrics).toContain('http_requests_total');
      
      // 清除指标
      metricsRegistry.clear();
      
      // 验证指标被清除
      metrics = metricsRegistry.getAllMetrics();
      expect(metrics).not.toContain('http_requests_total');
    });

    it('应该重置初始化状态', () => {
      metricsRegistry.initialize();
      metricsRegistry.clear();
      
      // 应该能够重新初始化
      expect(() => {
        metricsRegistry.initialize();
      }).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的桶配置', () => {
      process.env.HTTP_METRICS_BUCKETS = 'invalid,buckets,config';
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const testRegistry = new (MetricsRegistry as any)();
      const config = testRegistry.getConfig();
      
      expect(config.metrics.http.buckets).toEqual([0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]); // 默认值
      expect(consoleSpy).toHaveBeenCalledWith('Invalid buckets configuration:', 'invalid,buckets,config');
      
      consoleSpy.mockRestore();
    });

    it('应该处理部分无效的桶配置', () => {
      process.env.HTTP_METRICS_BUCKETS = '0.1,invalid,1.0,2.0';
      
      const testRegistry = new (MetricsRegistry as any)();
      const config = testRegistry.getConfig();
      
      expect(config.metrics.http.buckets).toEqual([0.1, 1.0, 2.0]); // 过滤掉无效值
    });
  });
});
