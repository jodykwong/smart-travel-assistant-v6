/**
 * 智游助手v5.0 - API客户端服务
 * 基于fetch的HTTP客户端，支持重试、熔断、超时等机制
 */

import type { APIResponse } from '@/types/travel-planning';

// ============= 配置类型 =============

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// ============= 错误类型 =============

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class TimeoutError extends APIError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============= 熔断器实现 =============

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000 // 1分钟
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new APIError('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// ============= API客户端实现 =============

export class APIClient {
  private readonly config: APIClientConfig;
  private readonly circuitBreaker = new CircuitBreaker();

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = {
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const requestConfig = this.buildRequestConfig(config);

    return this.circuitBreaker.execute(async () => {
      return this.executeWithRetry(url, requestConfig);
    });
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  private buildRequestConfig(config: RequestConfig): RequestInit {
    const headers = {
      ...this.config.headers,
      ...config.headers,
    };

    const requestInit: RequestInit = {
      method: config.method || 'GET',
      headers,
      signal: config.signal,
    };

    if (config.body && config.method !== 'GET') {
      if (config.body instanceof FormData) {
        requestInit.body = config.body;
        delete headers['Content-Type']; // Let browser set it for FormData
      } else {
        requestInit.body = JSON.stringify(config.body);
      }
    }

    return requestInit;
  }

  private async executeWithRetry<T>(
    url: string,
    config: RequestInit
  ): Promise<APIResponse<T>> {
    const maxRetries = this.config.retries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url, config);
      } catch (error) {
        lastError = error as Error;
        
        // 不重试的错误类型
        if (error instanceof APIError && error.status && error.status < 500) {
          throw error;
        }

        // 最后一次尝试
        if (attempt === maxRetries) {
          throw lastError;
        }

        // 等待后重试
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  private async executeRequest<T>(
    url: string,
    config: RequestInit
  ): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.safeParseJSON(response);
        throw new APIError(
          errorData?.message || `HTTP ${response.status}`,
          response.status,
          errorData?.code,
          errorData?.details
        );
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(this.config.timeout);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed');
      }

      throw error;
    }
  }

  private async safeParseJSON(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============= 默认实例 =============

export const apiClient = new APIClient();

// ============= 便捷方法 =============

export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) => 
    apiClient.get<T>(endpoint, config),
  
  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) => 
    apiClient.post<T>(endpoint, body, config),
  
  put: <T>(endpoint: string, body?: unknown, config?: RequestConfig) => 
    apiClient.put<T>(endpoint, body, config),
  
  delete: <T>(endpoint: string, config?: RequestConfig) => 
    apiClient.delete<T>(endpoint, config),
};
