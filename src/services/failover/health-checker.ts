/**
 * 健康检查器：周期性探测各提供商健康状态
 */
export type HealthStatus = 'healthy' | 'unhealthy';

export interface HealthProbeTarget {
  name: string;
  url?: string;
  timeoutMs: number;
  probe: () => Promise<boolean>;
}

export class HealthChecker {
  private statuses = new Map<string, HealthStatus>();
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    private targets: HealthProbeTarget[],
    private intervalMs: number,
  ) {}

  getStatus(name: string): HealthStatus {
    return this.statuses.get(name) || 'healthy';
  }

  async once() {
    await Promise.all(
      this.targets.map(async (t) => {
        try {
          const ok = await Promise.race([
            t.probe(),
            new Promise<boolean>((resolve) =>
              setTimeout(() => resolve(false), t.timeoutMs)
            ),
          ]);
          this.statuses.set(t.name, ok ? 'healthy' : 'unhealthy');
        } catch {
          this.statuses.set(t.name, 'unhealthy');
        }
      })
    );
  }

  start() {
    this.stop();
    this.once();
    this.intervalHandle = setInterval(() => this.once(), this.intervalMs);
  }

  stop() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }
}

