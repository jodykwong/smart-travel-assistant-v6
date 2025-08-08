/**
 * 智游助手v6.2 - MCP基础客户端
 * 为所有MCP客户端提供基础功能
 */

// ================================
// MCP基础接口定义
// ================================

export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
  id?: string;
  timestamp?: number;
}

export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
  requestId?: string;
}

export interface MCPClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  apiKey?: string;
  headers?: Record<string, string>;
}

// ================================
// MCP基础客户端类
// ================================

export abstract class BaseMCPClient {
  protected config: MCPClientConfig;
  protected requestCount: number = 0;

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };
  }

  /**
   * 发送MCP请求
   */
  protected async sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 添加请求ID和时间戳
      const enrichedRequest: MCPRequest = {
        ...request,
        id: requestId,
        timestamp: startTime
      };

      console.log(`📤 MCP请求 [${requestId}]:`, enrichedRequest.method);

      // 执行具体的请求逻辑（由子类实现）
      const response = await this.executeRequest<T>(enrichedRequest);

      const duration = Date.now() - startTime;
      console.log(`📥 MCP响应 [${requestId}]: ${response.success ? '成功' : '失败'} (${duration}ms)`);

      return {
        ...response,
        timestamp: Date.now(),
        requestId
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ MCP请求失败 [${requestId}]:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'REQUEST_FAILED',
        timestamp: Date.now(),
        requestId
      };
    }
  }

  /**
   * 执行具体的请求逻辑（由子类实现）
   */
  protected abstract executeRequest<T>(request: MCPRequest): Promise<MCPResponse<T>>;

  /**
   * 生成请求ID
   */
  protected generateRequestId(): string {
    this.requestCount++;
    return `mcp_${Date.now()}_${this.requestCount}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 验证响应
   */
  protected validateResponse<T>(response: any): MCPResponse<T> {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: '无效的响应格式',
        code: 'INVALID_RESPONSE',
        timestamp: Date.now()
      };
    }

    return {
      success: response.success || false,
      data: response.data,
      error: response.error,
      code: response.code,
      timestamp: Date.now()
    };
  }

  /**
   * 重试机制
   */
  protected async withRetry<T>(
    operation: () => Promise<MCPResponse<T>>,
    maxRetries: number = this.config.retries || 3
  ): Promise<MCPResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (result.success) {
          return result;
        }

        // 如果是最后一次尝试，返回失败结果
        if (attempt === maxRetries) {
          return result;
        }

        // 等待后重试
        await this.delay(Math.pow(2, attempt - 1) * 1000);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: lastError.message,
            code: 'MAX_RETRIES_EXCEEDED',
            timestamp: Date.now()
          };
        }

        // 等待后重试
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    return {
      success: false,
      error: lastError?.message || '未知错误',
      code: 'RETRY_FAILED',
      timestamp: Date.now()
    };
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取客户端状态
   */
  public getStatus(): {
    requestCount: number;
    config: MCPClientConfig;
  } {
    return {
      requestCount: this.requestCount,
      config: { ...this.config }
    };
  }
}

// ================================
// 工具函数
// ================================

/**
 * 创建标准MCP响应
 */
export function createMCPResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  code?: string
): MCPResponse<T> {
  return {
    success,
    data,
    error,
    code,
    timestamp: Date.now()
  } as MCPResponse<T>;
}

/**
 * 创建MCP错误响应
 */
export function createMCPError(
  error: string,
  code: string = 'UNKNOWN_ERROR'
): MCPResponse<never> {
  return {
    success: false,
    error,
    code,
    timestamp: Date.now()
  };
}

/**
 * 创建MCP成功响应
 */
export function createMCPSuccess<T>(data: T): MCPResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now()
  };
}

export default BaseMCPClient;
