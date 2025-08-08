/**
 * MetricsCollector 单元测试
 * 测试指标收集器的功能
 */

import { 
  PrometheusMetricsCollector, 
  NullMetricsCollector, 
  MetricsCollectorFactory,
  BusinessMetrics 
} from '../MetricsCollector';
import { metricsRegistry } from '../MetricsRegistry';
import { Counter, Gauge, Histogram } from 'prom-client';

// Mock MetricsRegistry
jest.mock('../MetricsRegistry');

describe('PrometheusMetricsCollector', () => {
  let collector: PrometheusMetricsCollector;
  let mockHttpRequestsTotal: jest.Mocked<Counter<string>>;
  let mockHttpRequestDuration: jest.Mocked<Histogram<string>>;
  let mockPaymentSuccessRate: jest.Mocked<Gauge<string>>;
  let mockPaymentResponseTime: jest.Mocked<Histogram<string>>;
  let mockPaymentErrorsTotal: jest.Mocked<Counter<string>>;

  beforeEach(() => {
    // 创建mock指标
    mockHttpRequestsTotal = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn()
    } as any;

    mockHttpRequestDuration = {
      labels: jest.fn().mockReturnThis(),
      observe: jest.fn()
    } as any;

    mockPaymentSuccessRate = {
      set: jest.fn()
    } as any;

    mockPaymentResponseTime = {
      labels: jest.fn().mockReturnThis(),
      observe: jest.fn()
    } as any;

    mockPaymentErrorsTotal = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn()
    } as any;

    // Mock metricsRegistry
    const mockMetricsRegistry = metricsRegistry as jest.Mocked<typeof metricsRegistry>;
    mockMetricsRegistry.initialize = jest.fn();
    mockMetricsRegistry.getMetric = jest.fn().mockImplementation((name: string) => {
      switch (name) {
        case 'http_requests_total':
          return mockHttpRequestsTotal;
        case 'http_request_duration_seconds':
          return mockHttpRequestDuration;
        case 'smart_travel_payment_success_rate':
          return mockPaymentSuccessRate;
        case 'smart_travel_payment_response_time_seconds':
          return mockPaymentResponseTime;
        case 'smart_travel_payment_errors_total':
          return mockPaymentErrorsTotal;
        default:
          return undefined;
      }
    });

    collector = new PrometheusMetricsCollector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP请求指标记录', () => {
    it('应该记录HTTP请求指标', () => {
      collector.recordHttpRequest('GET', '/api/users', 200, 0.5, 'test-service');

      expect(mockHttpRequestsTotal.labels).toHaveBeenCalledWith('GET', '/api/users', '200', 'test-service');
      expect(mockHttpRequestsTotal.inc).toHaveBeenCalled();
      expect(mockHttpRequestDuration.labels).toHaveBeenCalledWith('GET', '/api/users', 'test-service');
      expect(mockHttpRequestDuration.observe).toHaveBeenCalledWith(0.5);
    });

    it('应该处理缺失的服务名称', () => {
      // Mock配置
      const mockConfig = {
        service: { name: 'default-service' }
      };
      (metricsRegistry.getConfig as jest.Mock).mockReturnValue(mockConfig);

      collector.recordHttpRequest('POST', '/api/orders', 201, 1.2);

      expect(mockHttpRequestsTotal.labels).toHaveBeenCalledWith('POST', '/api/orders', '201', 'default-service');
    });

    it('应该处理指标记录错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockHttpRequestsTotal.labels.mockImplementation(() => {
        throw new Error('Metric error');
      });

      // 不应该抛出异常
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 500, 2.0);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('支付指标记录', () => {
    it('应该记录成功的支付指标', () => {
      collector.recordPaymentMetrics('payment_processing', 'wechat', 1.5, true);

      expect(mockPaymentResponseTime.labels).toHaveBeenCalledWith('payment_processing', 'wechat');
      expect(mockPaymentResponseTime.observe).toHaveBeenCalledWith(1.5);
      expect(mockPaymentSuccessRate.set).toHaveBeenCalledWith(0.99); // 简化的成功率
    });

    it('应该记录失败的支付指标', () => {
      collector.recordPaymentMetrics('payment_processing', 'alipay', 2.0, false, 'NetworkError');

      expect(mockPaymentResponseTime.labels).toHaveBeenCalledWith('payment_processing', 'alipay');
      expect(mockPaymentResponseTime.observe).toHaveBeenCalledWith(2.0);
      expect(mockPaymentErrorsTotal.labels).toHaveBeenCalledWith('payment_processing', 'alipay', 'NetworkError');
      expect(mockPaymentErrorsTotal.inc).toHaveBeenCalled();
      expect(mockPaymentSuccessRate.set).toHaveBeenCalledWith(0.95); // 简化的失败率
    });

    it('应该处理没有错误类型的失败', () => {
      collector.recordPaymentMetrics('order_creation', 'wechat', 0.8, false);

      expect(mockPaymentResponseTime.observe).toHaveBeenCalledWith(0.8);
      expect(mockPaymentErrorsTotal.inc).not.toHaveBeenCalled(); // 没有错误类型，不记录错误
    });
  });

  describe('业务指标更新', () => {
    let mockUserRegistrationRate: jest.Mocked<Gauge<string>>;
    let mockOrderCompletionRate: jest.Mocked<Gauge<string>>;
    let mockActiveUsers: jest.Mocked<Gauge<string>>;

    beforeEach(() => {
      mockUserRegistrationRate = { set: jest.fn() } as any;
      mockOrderCompletionRate = { set: jest.fn() } as any;
      mockActiveUsers = { set: jest.fn() } as any;

      (metricsRegistry.getMetric as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'smart_travel_user_registration_rate':
            return mockUserRegistrationRate;
          case 'smart_travel_order_completion_rate':
            return mockOrderCompletionRate;
          case 'smart_travel_active_users':
            return mockActiveUsers;
          default:
            return undefined;
        }
      });

      collector = new PrometheusMetricsCollector();
    });

    it('应该更新所有业务指标', () => {
      const metrics: BusinessMetrics = {
        paymentSuccessRate: 0.98,
        userRegistrationRate: 0.15,
        orderCompletionRate: 0.92,
        activeUsers: 150,
        cacheHitRate: 0.85,
        databaseConnections: 5
      };

      collector.updateBusinessMetrics(metrics);

      expect(mockUserRegistrationRate.set).toHaveBeenCalledWith(0.15);
      expect(mockOrderCompletionRate.set).toHaveBeenCalledWith(0.92);
      expect(mockActiveUsers.set).toHaveBeenCalledWith(150);
    });

    it('应该只更新提供的指标', () => {
      const metrics: BusinessMetrics = {
        activeUsers: 200
      };

      collector.updateBusinessMetrics(metrics);

      expect(mockActiveUsers.set).toHaveBeenCalledWith(200);
      expect(mockUserRegistrationRate.set).not.toHaveBeenCalled();
      expect(mockOrderCompletionRate.set).not.toHaveBeenCalled();
    });

    it('应该处理undefined值', () => {
      const metrics: BusinessMetrics = {
        activeUsers: undefined,
        userRegistrationRate: 0.12
      };

      collector.updateBusinessMetrics(metrics);

      expect(mockActiveUsers.set).not.toHaveBeenCalled();
      expect(mockUserRegistrationRate.set).toHaveBeenCalledWith(0.12);
    });
  });

  describe('错误记录', () => {
    let mockErrorsTotal: jest.Mocked<Counter<string>>;

    beforeEach(() => {
      mockErrorsTotal = {
        labels: jest.fn().mockReturnThis(),
        inc: jest.fn()
      } as any;

      // Mock注册错误指标
      (metricsRegistry.getMetric as jest.Mock).mockImplementation((name: string) => {
        if (name === 'errors_total') {
          return mockErrorsTotal;
        }
        return undefined;
      });

      (metricsRegistry.registerMetric as jest.Mock).mockImplementation(() => {
        // Mock注册成功
      });

      collector = new PrometheusMetricsCollector();
    });

    it('应该记录错误指标', () => {
      const error = new Error('Test error');
      const context = {
        service: 'test-service',
        method: 'GET',
        route: '/api/test',
        userId: '123'
      };

      collector.recordError(error, context);

      expect(mockErrorsTotal.labels).toHaveBeenCalledWith('test-service', 'GET', '/api/test', 'Error');
      expect(mockErrorsTotal.inc).toHaveBeenCalled();
    });

    it('应该处理错误记录失败', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockErrorsTotal.labels.mockImplementation(() => {
        throw new Error('Metric error');
      });

      const error = new Error('Test error');
      const context = {
        service: 'test-service',
        method: 'GET',
        route: '/api/test'
      };

      // 不应该抛出异常
      expect(() => {
        collector.recordError(error, context);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('NullMetricsCollector', () => {
  let collector: NullMetricsCollector;

  beforeEach(() => {
    collector = new NullMetricsCollector();
  });

  it('应该提供空实现', () => {
    // 所有方法都应该不抛出异常
    expect(() => {
      collector.recordHttpRequest('GET', '/test', 200, 1.0);
      collector.recordPaymentMetrics('payment_processing', 'wechat', 1.0, true);
      collector.updateBusinessMetrics({ activeUsers: 100 });
      collector.recordError(new Error('test'), { service: 'test', method: 'GET', route: '/test' });
    }).not.toThrow();
  });
});

describe('MetricsCollectorFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该在监控启用时创建PrometheusMetricsCollector', () => {
    const mockConfig = { enabled: true };
    (metricsRegistry.getConfig as jest.Mock).mockReturnValue(mockConfig);

    const collector = MetricsCollectorFactory.create();

    expect(collector).toBeInstanceOf(PrometheusMetricsCollector);
  });

  it('应该在监控禁用时创建NullMetricsCollector', () => {
    const mockConfig = { enabled: false };
    (metricsRegistry.getConfig as jest.Mock).mockReturnValue(mockConfig);

    const collector = MetricsCollectorFactory.create();

    expect(collector).toBeInstanceOf(NullMetricsCollector);
  });
});
