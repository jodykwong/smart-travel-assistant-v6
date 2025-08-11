/**
 * MapFailoverService 单元测试
 * 测试地图服务故障转移的核心功能
 */

import { MapFailoverService } from '../map-failover-service';
import { getConfigSingleton } from '../../../lib/config/failover-config';

// Mock配置
jest.mock('../../../lib/config/failover-config');
const mockGetConfig = getConfigSingleton as jest.MockedFunction<typeof getConfigSingleton>;

// Mock MCP工具调用
const mockInvokeMcp = jest.fn();
jest.mock('../../../lib/mcp-client', () => ({
  invokeMcpTool: mockInvokeMcp
}));

describe('MapFailoverService', () => {
  let service: MapFailoverService;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 设置默认配置
    mockGetConfig.mockReturnValue({
      map: {
        providers: ['amap', 'tencent'],
        primaryProvider: 'amap',
        fallbackProvider: 'tencent',
        amap: {
          apiKey: 'test-amap-key',
          serverUrl: 'https://mcp.amap.com/sse',
          enabled: true
        },
        tencent: {
          apiKey: 'test-tencent-key',
          baseUrl: 'https://apis.map.qq.com/mcp',
          enabled: true
        }
      },
      failover: {
        enabled: true,
        timeout: 30000,
        retryAttempts: 3,
        circuitBreakerThreshold: 5
      },
      loadBalancer: {
        strategy: 'health_based'
      }
    } as any);
    
    service = new MapFailoverService();
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化服务', () => {
      expect(service).toBeInstanceOf(MapFailoverService);
    });

    test('应该正确设置熔断器', () => {
      expect(service).toBeDefined();
    });
  });

  describe('主服务调用 (高德地图)', () => {
    test('应该成功调用高德地图MCP服务', async () => {
      // Mock成功响应
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: {
          geocodes: [{
            formatted_address: '新疆维吾尔自治区乌鲁木齐市',
            location: '87.617733,43.792818'
          }]
        }
      });

      const query = {
        type: 'geocode',
        params: {
          address: '新疆',
          city: '乌鲁木齐'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('amap');
      expect(result.result).toBeDefined();
      expect(mockInvokeMcp).toHaveBeenCalledWith('amap', query);
    });

    test('高德地图API失败时应该抛出错误', async () => {
      // Mock失败响应
      mockInvokeMcp.mockRejectedValueOnce(new Error('AMap API Error'));

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      await expect(service.query(query as any)).rejects.toThrow();
    });
  });

  describe('故障转移机制', () => {
    test('高德地图失败时应该自动切换到腾讯地图', async () => {
      // Mock高德地图失败
      mockInvokeMcp
        .mockRejectedValueOnce(new Error('AMap Service Error'))
        // Mock腾讯地图成功
        .mockResolvedValueOnce({
          success: true,
          data: {
            result: {
              location: {
                lat: 43.792818,
                lng: 87.617733
              },
              address: '新疆维吾尔自治区乌鲁木齐市'
            }
          }
        });

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('tencent');
      expect(result.result).toBeDefined();
      expect(mockInvokeMcp).toHaveBeenCalledTimes(2); // 两次调用：高德失败 + 腾讯成功
    });

    test('所有地图服务都失败时应该抛出聚合错误', async () => {
      // Mock所有服务都失败
      mockInvokeMcp
        .mockRejectedValueOnce(new Error('AMap Error'))
        .mockRejectedValueOnce(new Error('Tencent Error'));

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      await expect(service.query(query as any)).rejects.toThrow('All map providers failed');
    });
  });

  describe('重试机制', () => {
    test('应该按配置的次数重试失败的请求', async () => {
      // Mock所有请求都失败
      mockInvokeMcp.mockRejectedValue(new Error('Service Error'));

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      await expect(service.query(query as any)).rejects.toThrow();

      // 验证重试次数：每个提供商重试3次，共2个提供商 = 6次调用
      expect(mockInvokeMcp).toHaveBeenCalledTimes(6);
    });
  });

  describe('健康检查', () => {
    test('应该能够检查高德地图服务健康状态', async () => {
      // Mock健康检查成功
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: { status: 'ok' }
      });

      const isHealthy = await service.checkHealth('amap');

      expect(isHealthy).toBe(true);
      expect(mockInvokeMcp).toHaveBeenCalledWith('amap', {
        type: 'health_check',
        params: {}
      });
    });

    test('应该能够检查腾讯地图服务健康状态', async () => {
      // Mock健康检查成功
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: { status: 'healthy' }
      });

      const isHealthy = await service.checkHealth('tencent');

      expect(isHealthy).toBe(true);
      expect(mockInvokeMcp).toHaveBeenCalledWith('tencent', {
        type: 'health_check',
        params: {}
      });
    });

    test('服务不可用时健康检查应该返回false', async () => {
      // Mock健康检查失败
      mockInvokeMcp.mockRejectedValueOnce(new Error('Service Unavailable'));

      const isHealthy = await service.checkHealth('amap');

      expect(isHealthy).toBe(false);
    });
  });

  describe('提供商优先级', () => {
    test('应该按照配置的优先级选择提供商', () => {
      const order = service.providerOrder();
      
      expect(order).toEqual(['amap', 'tencent']);
    });
  });

  describe('不同类型的地图查询', () => {
    test('应该支持地理编码查询', async () => {
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: {
          geocodes: [{
            formatted_address: '新疆维吾尔自治区',
            location: '87.617733,43.792818'
          }]
        }
      });

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('amap');
      expect(result.result).toBeDefined();
    });

    test('应该支持逆地理编码查询', async () => {
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: {
          regeocode: {
            formatted_address: '新疆维吾尔自治区乌鲁木齐市天山区',
            addressComponent: {
              province: '新疆维吾尔自治区',
              city: '乌鲁木齐市'
            }
          }
        }
      });

      const query = {
        type: 'regeocode',
        params: {
          location: '87.617733,43.792818'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('amap');
      expect(result.result).toBeDefined();
    });

    test('应该支持天气查询', async () => {
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: {
          lives: [{
            province: '新疆',
            city: '乌鲁木齐',
            weather: '晴',
            temperature: '25',
            humidity: '45'
          }]
        }
      });

      const query = {
        type: 'weather',
        params: {
          city: '乌鲁木齐'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('amap');
      expect(result.result).toBeDefined();
    });

    test('应该支持POI搜索', async () => {
      mockInvokeMcp.mockResolvedValueOnce({
        success: true,
        data: {
          pois: [{
            name: '天山天池',
            type: '风景名胜',
            location: '88.126944,43.883333',
            address: '新疆维吾尔自治区昌吉回族自治州阜康市'
          }]
        }
      });

      const query = {
        type: 'text_search',
        params: {
          keywords: '天山天池',
          city: '新疆'
        }
      };

      const result = await service.query(query as any);

      expect(result.provider).toBe('amap');
      expect(result.result).toBeDefined();
    });
  });

  describe('错误处理', () => {
    test('应该正确处理MCP连接错误', async () => {
      mockInvokeMcp.mockRejectedValue(new Error('MCP Connection Error'));

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      await expect(service.query(query as any)).rejects.toThrow();
    });

    test('应该正确处理超时错误', async () => {
      mockInvokeMcp.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const query = {
        type: 'geocode',
        params: {
          address: '新疆'
        }
      };

      await expect(service.query(query as any)).rejects.toThrow();
    });
  });

  describe('配置验证', () => {
    test('缺少API密钥时应该抛出错误', () => {
      // Mock缺少API密钥的配置
      mockGetConfig.mockReturnValue({
        map: {
          providers: ['amap'],
          primaryProvider: 'amap',
          amap: {
            apiKey: '', // 空API密钥
            serverUrl: 'https://mcp.amap.com/sse',
            enabled: true
          }
        },
        failover: {
          enabled: true,
          timeout: 30000,
          retryAttempts: 3,
          circuitBreakerThreshold: 5
        }
      } as any);

      expect(() => new MapFailoverService()).toThrow();
    });
  });
});
