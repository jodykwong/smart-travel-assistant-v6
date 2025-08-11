/**
 * 智游助手 v6.1 - 双链路冗余配置
 * 以环境变量为单一事实来源，提供类型安全的读取与默认值
 */

export type ProviderKey = 'deepseek' | 'siliconflow' | 'amap' | 'tencent';

export interface FailoverConfig {
  // LLM
  llm: {
    providers: ProviderKey[]; // ['deepseek','siliconflow']
    primary: ProviderKey;     // 'deepseek'
    fallback: ProviderKey;    // 'siliconflow'

    deepseek: {
      apiKey?: string;
      baseURL: string;
      model: string;
      requestTimeoutMs: number;
    };

    siliconflow: {
      apiKey?: string;
      baseURL: string;
      model: string;
      requestTimeoutMs: number;
    };
  };

  // 地图（通过 LLM MCP 工具调用，不直接访问地图 API）
  map: {
    providers: ProviderKey[]; // ['amap','tencent']
    primary: ProviderKey;     // 'amap'
    fallback: ProviderKey;    // 'tencent'

    amap: {
      mcpServerUrl: string; // 用于健康检查/标识
      apiKey?: string;      // 用于标识（不会直接调用）
      enabled: boolean;
    };

    tencent: {
      mcpServerUrl: string; // 同上
      apiKey?: string;
      enabled: boolean;
    };

    transportType: 'sse' | 'http';
    timeoutMs: number;
    retryAttempts: number;
  };

  // 统一故障转移与健康检查
  failover: {
    enabled: boolean;
    timeoutMs: number;
    retryAttempts: number;
    circuitBreakerThreshold: number; // 连续失败阈值
    loadBalancerStrategy: 'round_robin' | 'weighted' | 'health_based';
    healthCheckEnabled: boolean;
    healthCheckIntervalMs: number;
    healthCheckTimeoutMs: number;
  };
}

function parseList(val: string | undefined, fallback: ProviderKey[]): ProviderKey[] {
  if (!val) return fallback;
  return val
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as ProviderKey[];
}

export function getFailoverConfig(): FailoverConfig {
  return {
    llm: {
      providers: parseList(process.env.LLM_PROVIDERS, ['deepseek', 'siliconflow']),
      primary: (process.env.LLM_PRIMARY_PROVIDER || 'deepseek') as ProviderKey,
      fallback: (process.env.LLM_FALLBACK_PROVIDER || 'siliconflow') as ProviderKey,

      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        model: process.env.DEEPSEEK_MODEL_NAME || 'deepseek-chat',
        requestTimeoutMs:  Number(process.env.FAILOVER_TIMEOUT || '5000'),
      },

      siliconflow: {
        apiKey: process.env.SILICONFLOW_API_KEY,
        baseURL: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
        model: process.env.SILICONFLOW_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3',
        requestTimeoutMs:  Number(process.env.FAILOVER_TIMEOUT || '5000'),
      },
    },

    map: {
      providers: parseList(process.env.MAP_PROVIDERS, ['amap', 'tencent']),
      primary: (process.env.MAP_PRIMARY_PROVIDER || 'amap') as ProviderKey,
      fallback: (process.env.MAP_FALLBACK_PROVIDER || 'tencent') as ProviderKey,

      amap: {
        mcpServerUrl: process.env.AMAP_MCP_SERVER_URL || 'https://mcp.amap.com/sse',
        apiKey: process.env.AMAP_MCP_API_KEY,
        enabled: process.env.MCP_AMAP_ENABLED === 'true',
      },

      tencent: {
        mcpServerUrl: process.env.TENCENT_MCP_BASE_URL || 'https://apis.map.qq.com/mcp',
        apiKey: process.env.TENCENT_MCP_API_KEY,
        enabled: process.env.MCP_TENCENT_ENABLED === 'true',
      },

      transportType: (process.env.MCP_TRANSPORT_TYPE || 'sse') as 'sse' | 'http',
      timeoutMs: Number(process.env.MCP_TIMEOUT || '30000'),
      retryAttempts: Number(process.env.MCP_RETRY_ATTEMPTS || '3'),
    },

    failover: {
      enabled: process.env.FAILOVER_ENABLED !== 'false',
      timeoutMs: Number(process.env.FAILOVER_TIMEOUT || '5000'),
      retryAttempts: Number(process.env.FAILOVER_RETRY_ATTEMPTS || '3'),
      circuitBreakerThreshold: Number(process.env.FAILOVER_CIRCUIT_BREAKER_THRESHOLD || '5'),
      loadBalancerStrategy: (process.env.LOAD_BALANCER_STRATEGY || 'health_based') as any,
      healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      healthCheckTimeoutMs: Number(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
    },
  };
}

// 单例读取，避免多次解析
let cached: FailoverConfig | null = null;
export function getConfigSingleton(): FailoverConfig {
  if (!cached) cached = getFailoverConfig();
  return cached;
}

