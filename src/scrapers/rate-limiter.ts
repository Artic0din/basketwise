/**
 * Simple timestamp-based rate limiter.
 * Enforces a minimum delay between consecutive requests.
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private _totalRequests = 0;

  constructor(private readonly minDelayMs: number = 1000) {}

  /** Number of requests that have passed through the limiter. */
  get totalRequests(): number {
    return this._totalRequests;
  }

  /**
   * Wait until sufficient time has elapsed since the last request,
   * then mark the current timestamp and allow the caller to proceed.
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const wait = this.minDelayMs - elapsed;

    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }

    this.lastRequestTime = Date.now();
    this._totalRequests++;
  }
}
