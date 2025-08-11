import { CircuitBreaker } from './circuit-breaker';
import { HealthChecker } from './health-checker';
import { getConfigSingleton } from '@/lib/config/failover-config';

export interface ChatRequest {
  model: string;
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[]; // 透传工具定义（用于通过LLM调用 MCP 工具）
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

export class LLMFailoverService {
  private cbPrimary: CircuitBreaker;
  private cbFallback: CircuitBreaker;
  private healthChecker: HealthChecker | null = null;

  constructor() {
    const cfg = getConfigSingleton();
    this.cbPrimary = new CircuitBreaker(
      cfg.failover.circuitBreakerThreshold,
      cfg.failover.healthCheckIntervalMs
    );
    this.cbFallback = new CircuitBreaker(
      cfg.failover.circuitBreakerThreshold,
      cfg.failover.healthCheckIntervalMs
    );

    if (cfg.failover.healthCheckEnabled) {
      this.healthChecker = new HealthChecker(
        [
          {
            name: 'deepseek',
            timeoutMs: cfg.failover.healthCheckTimeoutMs,
            probe: async () => {
              // 轻量 probe：HEAD/GET model list（部分供应商可能不支持，这里保守为 false/true）
              try {
                const r = await fetch(`${cfg.llm.deepseek.baseURL}/models`, {
                  headers: { Authorization: `Bearer ${cfg.llm.deepseek.apiKey}` },
                  method: 'GET',
                });
                return r.ok;
              } catch {
                return false;
              }
            },
          },
          {
            name: 'siliconflow',
            timeoutMs: cfg.failover.healthCheckTimeoutMs,
            probe: async () => {
              try {
                const r = await fetch(`${cfg.llm.siliconflow.baseURL}/models`, {
                  headers: { Authorization: `Bearer ${cfg.llm.siliconflow.apiKey}` },
                  method: 'GET',
                });
                return r.ok;
              } catch {
                return false;
              }
            },
          },
        ],
        cfg.failover.healthCheckIntervalMs
      );
      this.healthChecker.start();
    }
  }

  private async callDeepSeek(req: ChatRequest) {
    const cfg = getConfigSingleton();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.failover.timeoutMs);
    try {
      const r = await fetch(`${cfg.llm.deepseek.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.llm.deepseek.apiKey}`,
        },
        body: JSON.stringify({ ...req, model: cfg.llm.deepseek.model }),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(`DeepSeek HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private async callSiliconFlow(req: ChatRequest) {
    const cfg = getConfigSingleton();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.failover.timeoutMs);
    try {
      const r = await fetch(`${cfg.llm.siliconflow.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.llm.siliconflow.apiKey}`,
        },
        body: JSON.stringify({ ...req, model: cfg.llm.siliconflow.model }),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(`SiliconFlow HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private preferOrder(): ('deepseek' | 'siliconflow')[] {
    const cfg = getConfigSingleton();
    const primary = cfg.llm.primary as 'deepseek' | 'siliconflow';
    const fallback = cfg.llm.fallback as 'deepseek' | 'siliconflow';
    // 根据健康状态动态调整
    const healthy = (name: string) =>
      this.healthChecker ? this.healthChecker.getStatus(name) === 'healthy' : true;
    const order = [primary, fallback].filter((p, idx, arr) => arr.indexOf(p) === idx);
    // health_based: 如果 primary 不健康，则将 fallback 提前
    if (cfg.failover.loadBalancerStrategy === 'health_based') {
      if (!healthy(primary) && healthy(fallback)) {
        return [fallback, primary];
      }
    }
    return order as any;
  }

  async chat(req: ChatRequest) {
    const cfg = getConfigSingleton();
    const order = this.preferOrder();

    const attempt = async (provider: 'deepseek' | 'siliconflow') => {
      const cb = provider === 'deepseek' ? this.cbPrimary : this.cbFallback;
      if (!cb.canPass()) throw new Error(`${provider} circuit open`);
      try {
        const result =
          provider === 'deepseek' ? await this.callDeepSeek(req) : await this.callSiliconFlow(req);
        cb.recordSuccess();
        return { provider, result };
      } catch (err) {
        cb.recordFailure();
        throw err;
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

    throw new Error(`LLM failover exhausted. Details: ${errors.join(' | ')}`);
  }

  snapshot() {
    const cfg = getConfigSingleton();
    return {
      order: this.preferOrder(),
      healthEnabled: !!this.healthChecker,
      timeoutMs: cfg.failover.timeoutMs,
    };
  }
}
