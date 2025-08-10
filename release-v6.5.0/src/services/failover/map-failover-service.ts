import { CircuitBreaker } from './circuit-breaker';
import { HealthChecker } from './health-checker';
import { getConfigSingleton } from '@/lib/config/failover-config';
import { LLMFailoverService, ChatRequest } from './llm-failover-service';

// 统一的地图查询接口（通过 LLM 的 MCP 工具调用）
export interface MapQuery {
  type: 'poi_search' | 'geocode' | 'weather' | 'around';
  params: Record<string, any>;
}

export class MapFailoverService {
  private cbAmap: CircuitBreaker;
  private cbTencent: CircuitBreaker;
  private healthChecker: HealthChecker | null = null;
  private llm = new LLMFailoverService();

  constructor() {
    const cfg = getConfigSingleton();
    this.cbAmap = new CircuitBreaker(cfg.failover.circuitBreakerThreshold, cfg.failover.healthCheckIntervalMs);
    this.cbTencent = new CircuitBreaker(cfg.failover.circuitBreakerThreshold, cfg.failover.healthCheckIntervalMs);

    if (cfg.failover.healthCheckEnabled) {
      this.healthChecker = new HealthChecker(
        [
          {
            name: 'amap',
            timeoutMs: cfg.failover.healthCheckTimeoutMs,
            probe: async () => {
              // 通过 LLM 工具做一次轻量地理编码探测（东三省地点）
              return this.llmToolProbe('amap', '哈尔滨市政府');
            },
          },
          {
            name: 'tencent',
            timeoutMs: cfg.failover.healthCheckTimeoutMs,
            probe: async () => {
              return this.llmToolProbe('tencent', '沈阳市政府');
            },
          },
        ],
        cfg.failover.healthCheckIntervalMs
      );
      this.healthChecker.start();
    }
  }

  private providerOrder(): ('amap' | 'tencent')[] {
    const cfg = getConfigSingleton();
    const primary = cfg.map.primary as 'amap' | 'tencent';
    const fallback = cfg.map.fallback as 'amap' | 'tencent';

    const healthy = (name: string) =>
      this.healthChecker ? this.healthChecker.getStatus(name) === 'healthy' : true;

    const order = [primary, fallback].filter((p, idx, arr) => arr.indexOf(p) === idx);
    if (cfg.failover.loadBalancerStrategy === 'health_based') {
      if (!healthy(primary) && healthy(fallback)) return [fallback, primary];
    }
    return order as any;
  }

  private buildToolDefs(provider: 'amap' | 'tencent', type: MapQuery['type']) {
    const suffixHyphen = provider === 'amap' ? 'amap-maps' : 'tencent-maps';
    const suffixUnderscore = provider === 'amap' ? 'amap_maps' : 'tencent_maps';

    const mapping: Record<MapQuery['type'], { hyphen: string; underscore: string; params: any }> = {
      poi_search: {
        hyphen: `maps_text_search_${suffixHyphen}`,
        underscore: `maps_text_search_${suffixUnderscore}`,
        params: {
          type: 'object',
          properties: { keywords: { type: 'string' }, city: { type: 'string' }, types: { type: 'string' } },
          required: ['keywords'],
        },
      },
      geocode: {
        hyphen: `maps_geo_${suffixHyphen}`,
        underscore: `maps_geo_${suffixUnderscore}`,
        params: {
          type: 'object',
          properties: { address: { type: 'string' }, city: { type: 'string' } },
          required: ['address'],
        },
      },
      weather: {
        hyphen: `maps_weather_${suffixHyphen}`,
        underscore: `maps_weather_${suffixUnderscore}`,
        params: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
      around: {
        hyphen: `maps_around_search_${suffixHyphen}`,
        underscore: `maps_around_search_${suffixUnderscore}`,
        params: {
          type: 'object',
          properties: { location: { type: 'string' }, keywords: { type: 'string' }, radius: { type: 'string' } },
          required: ['location'],
        },
      },
    };

    return mapping[type];
  }

  private async llmToolProbe(provider: 'amap' | 'tencent', address: string): Promise<boolean> {
    try {
      const def = this.buildToolDefs(provider, 'geocode');
      const messages = [{ role: 'user', content: `请对地址进行地理编码: ${address}` }];
      const tools = [
        { type: 'function', function: { name: def.hyphen, description: '地理编码', parameters: def.params } },
        { type: 'function', function: { name: def.underscore, description: '地理编码', parameters: def.params } },
      ];
      const tool_choice = { type: 'function', function: { name: def.hyphen } } as any;
      const req: ChatRequest = { model: 'deepseek-chat', messages, tools, tool_choice } as any;
      const { result } = await this.llm.chat(req);
      // 只要不报错，视为健康
      return !!result;
    } catch {
      return false;
    }
  }

  private async invokeMcp(provider: 'amap' | 'tencent', q: MapQuery): Promise<any> {
    const def = this.buildToolDefs(provider, q.type);
    const messages = [{ role: 'user', content: `执行${q.type}，参数: ${JSON.stringify(q.params)}` }];
    const tools = [
      { type: 'function', function: { name: def.hyphen, description: '地图工具', parameters: def.params } },
      { type: 'function', function: { name: def.underscore, description: '地图工具', parameters: def.params } },
    ];
    const tool_choice = { type: 'function', function: { name: def.hyphen } } as any;
    const req: ChatRequest = { model: 'deepseek-chat', messages, tools, tool_choice } as any;

    try {
      const { result } = await this.llm.chat(req);
      return result ?? { status: '1', info: 'OK' };
    } catch (e) {
      return { status: '0', info: 'FAILED' };
    }
  }

  async query(q: MapQuery) {
    const cfg = getConfigSingleton();
    const order = this.providerOrder();

    const attempt = async (provider: 'amap' | 'tencent') => {
      const cb = provider === 'amap' ? this.cbAmap : this.cbTencent;
      if (!cb.canPass()) throw new Error(`${provider} circuit open`);

      // 调用 MCP 工具
      try {
        const result = await this.invokeMcp(provider, q);
        cb.recordSuccess();
        return { provider, result };
      } catch (e) {
        cb.recordFailure();
        throw e;
      }
    };

    const errors: string[] = [];
    for (const provider of order) {
      for (let i = 0; i < cfg.failover.retryAttempts; i++) {
        try {
          return await attempt(provider);
        } catch (e: any) {
          errors.push(`${provider} attempt ${i + 1} failed: ${e?.message || e}`);
        }
      }
    }

    throw new Error(`MAP failover exhausted. Details: ${errors.join(' | ')}`);
  }

  snapshot() {
    const cfg = getConfigSingleton();
    return {
      order: this.providerOrder(),
      healthEnabled: !!this.healthChecker,
      mapPrimary: cfg.map.primary,
      mapFallback: cfg.map.fallback,
    };
  }
}

