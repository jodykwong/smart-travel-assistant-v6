/**
 * 简易熔断器实现
 */
export class CircuitBreaker {
  private failures = 0;
  private open = false;
  private lastOpenedAt = 0;

  constructor(private threshold: number, private resetMs: number) {}

  canPass(): boolean {
    if (!this.open) return true;
    // 半开窗口
    if (Date.now() - this.lastOpenedAt > this.resetMs) {
      this.open = false;
      this.failures = 0;
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    this.open = false;
  }

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.open = true;
      this.lastOpenedAt = Date.now();
    }
  }
}

