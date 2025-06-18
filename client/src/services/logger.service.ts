import { LogEntry, Strategy } from '@/types/ai-router.types';

export class LoggerService {
  private logs: LogEntry[] = [];

  addSuccessLog(provider: string, duration: number, costPer1K: number, strategy: Strategy): void {
    this.logs.push({
      provider,
      duration,
      costPer1K,
      strategy,
      timestamp: new Date().toISOString(),
    });
  }

  addErrorLog(provider: string, error: string, strategy: Strategy): void {
    this.logs.push({
      provider,
      error,
      strategy,
      timestamp: new Date().toISOString(),
    });
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}