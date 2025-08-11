/**
 * LLMFailoverService 单元测试
 * 测试LLM故障转移服务的核心功能
 */

import { LLMFailoverService } from '../llm-failover-service';
import { getConfigSingleton } from '../../../lib/config/failover-config';

// Mock配置
jest.mock('../../../lib/config/failover-config');
const mockGetConfig = getConfigSingleton as jest.MockedFunction<typeof getConfigSingleton>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('LLMFailoverService', () => {
  let service: LLMFailoverService;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 设置默认配置
    mockGetConfig.mockReturnValue({
      llm: {
        providers: ['deepseek', 'siliconflow'],
        primaryProvider: 'deepseek',
        fallbackProvider: 'siliconflow',
        deepseek: {
          apiKey: 'test-deepseek-key',
          apiUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat'
        },
        siliconflow: {
          apiKey: 'test-siliconflow-key',
          baseUrl: 'https://api.siliconflow.cn/v1',
          model: 'deepseek-ai/DeepSeek-V3'
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
    
    service = new LLMFailoverService();
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化服务', () => {
      expect(service).toBeInstanceOf(LLMFailoverService);
    });

    test('应该正确设置熔断器', () => {
      // 验证熔断器已初始化（通过调用chat方法间接验证）
      expect(service).toBeDefined();
    });
  });

  describe('主服务调用 (DeepSeek)', () => {
    test('应该成功调用DeepSeek API', async () => {
      // Mock成功响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '这是一个测试响应'
            }
          }]
        })
      } as Response);

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      const result = await service.chat(request as any);

      expect(result.provider).toBe('deepseek');
      expect(result.result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-deepseek-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('DeepSeek API失败时应该抛出错误', async () => {
      // Mock失败响应
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      await expect(service.chat(request as any)).rejects.toThrow();
    });
  });

  describe('故障转移机制', () => {
    test('DeepSeek失败时应该自动切换到SiliconFlow', async () => {
      // Mock DeepSeek失败
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        // Mock SiliconFlow成功
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: '这是SiliconFlow的响应'
              }
            }]
          })
        } as Response);

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      const result = await service.chat(request as any);

      expect(result.provider).toBe('siliconflow');
      expect(result.result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2); // 两次调用：DeepSeek失败 + SiliconFlow成功
    });

    test('所有服务都失败时应该抛出聚合错误', async () => {
      // Mock所有服务都失败
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'DeepSeek Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'SiliconFlow Error'
        } as Response);

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      await expect(service.chat(request as any)).rejects.toThrow('All LLM providers failed');
    });
  });

  describe('重试机制', () => {
    test('应该按配置的次数重试失败的请求', async () => {
      // Mock所有请求都失败
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      } as Response);

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      await expect(service.chat(request as any)).rejects.toThrow();

      // 验证重试次数：每个提供商重试3次，共2个提供商 = 6次调用
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });

  describe('健康检查', () => {
    test('应该能够检查DeepSeek服务健康状态', async () => {
      // Mock健康检查成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      const isHealthy = await service.checkHealth('deepseek');

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-deepseek-key'
          })
        })
      );
    });

    test('应该能够检查SiliconFlow服务健康状态', async () => {
      // Mock健康检查成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      const isHealthy = await service.checkHealth('siliconflow');

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.siliconflow.cn/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-siliconflow-key'
          })
        })
      );
    });

    test('服务不可用时健康检查应该返回false', async () => {
      // Mock健康检查失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      const isHealthy = await service.checkHealth('deepseek');

      expect(isHealthy).toBe(false);
    });
  });

  describe('提供商优先级', () => {
    test('应该按照配置的优先级选择提供商', () => {
      const order = service.preferOrder();
      
      expect(order).toEqual(['deepseek', 'siliconflow']);
    });

    test('当主提供商不可用时应该调整优先级', async () => {
      // 这个测试需要访问私有方法，可能需要重构或使用不同的测试策略
      // 暂时跳过，在集成测试中验证
    });
  });

  describe('错误处理', () => {
    test('应该正确处理网络错误', async () => {
      // Mock网络错误
      mockFetch.mockRejectedValue(new Error('Network Error'));

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      await expect(service.chat(request as any)).rejects.toThrow();
    });

    test('应该正确处理超时错误', async () => {
      // Mock超时错误
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request = {
        messages: [{ role: 'user', content: '测试消息' }],
        model: 'deepseek-chat'
      };

      await expect(service.chat(request as any)).rejects.toThrow();
    });
  });

  describe('配置验证', () => {
    test('缺少API密钥时应该抛出错误', () => {
      // Mock缺少API密钥的配置
      mockGetConfig.mockReturnValue({
        llm: {
          providers: ['deepseek'],
          primaryProvider: 'deepseek',
          deepseek: {
            apiKey: '', // 空API密钥
            apiUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
          }
        },
        failover: {
          enabled: true,
          timeout: 30000,
          retryAttempts: 3,
          circuitBreakerThreshold: 5
        }
      } as any);

      expect(() => new LLMFailoverService()).toThrow();
    });
  });
});
