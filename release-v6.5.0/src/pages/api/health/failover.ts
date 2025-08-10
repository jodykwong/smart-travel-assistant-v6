import type { NextApiRequest, NextApiResponse } from 'next';
import { LLMFailoverService } from '@/services/failover/llm-failover-service';
import { MapFailoverService } from '@/services/failover/map-failover-service';
import { getConfigSingleton } from '@/lib/config/failover-config';

// 只读健康状态端点：不执行任何写操作
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' }, timestamp: new Date().toISOString() });
  }

  const cfg = getConfigSingleton();
  const llm = new LLMFailoverService();
  const map = new MapFailoverService();

  try {
    const llmSnap = (llm as any).snapshot?.() || {};
    const mapSnap = (map as any).snapshot?.() || {};

    const payload = {
      success: true,
      data: {
        llm: {
          providers: cfg.llm.providers,
          primary: cfg.llm.primary,
          fallback: cfg.llm.fallback,
          activeOrder: llmSnap.order || [],
          healthEnabled: !!llmSnap.healthEnabled,
          timeoutMs: llmSnap.timeoutMs || cfg.failover.timeoutMs,
        },
        map: {
          providers: cfg.map.providers,
          primary: cfg.map.primary,
          fallback: cfg.map.fallback,
          activeOrder: mapSnap.order || [],
          healthEnabled: !!mapSnap.healthEnabled,
        },
        policy: {
          enabled: cfg.failover.enabled,
          strategy: cfg.failover.loadBalancerStrategy,
          retryAttempts: cfg.failover.retryAttempts,
          circuitBreakerThreshold: cfg.failover.circuitBreakerThreshold,
          healthCheck: {
            enabled: cfg.failover.healthCheckEnabled,
            intervalMs: cfg.failover.healthCheckIntervalMs,
            timeoutMs: cfg.failover.healthCheckTimeoutMs,
          },
        },
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    return res.status(500).json({ success: false, error: { message: e?.message || 'Internal Error' }, timestamp: new Date().toISOString() });
  }
}

