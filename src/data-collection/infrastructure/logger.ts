/**
 * Structured Logger for NBA Stats Data Collection
 * Provides consistent logging across all sources
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum DataSource {
  ESPN = 'ESPN',
  STATS_NBA_COM = 'stats.nba.com',
  CACHE = 'cache',
  CIRCUIT_BREAKER = 'circuit-breaker',
}

export type LogStatus =
  | 'success'
  | 'failure'
  | 'retry'
  | 'cache-hit'
  | 'cache-stale'
  | 'circuit-open'
  | 'circuit-closed';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: DataSource;
  operation: string;
  requestId: string;
  duration?: number;
  status: LogStatus;
  errorCode?: string;
  attempt?: number;
  cached?: boolean;
  cacheAge?: number;
}

interface LogInput {
  level: LogLevel;
  source: DataSource;
  operation: string;
  requestId: string;
  status?: LogStatus;
  duration?: number;
  errorCode?: string;
  attempt?: number;
  cached?: boolean;
  cacheAge?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

class Logger {
  private minLevel: LogLevel = LogLevel.DEBUG;
  private requestCounter = 0;

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.operation}`;
    const extras: string[] = [`reqId=${entry.requestId}`];

    if (entry.duration !== undefined) extras.push(`duration=${entry.duration}ms`);
    if (entry.status) extras.push(`status=${entry.status}`);
    if (entry.errorCode) extras.push(`error=${entry.errorCode}`);
    if (entry.attempt) extras.push(`attempt=${entry.attempt}`);
    if (entry.cached !== undefined) extras.push(`cached=${entry.cached}`);
    if (entry.cacheAge !== undefined) extras.push(`cacheAge=${entry.cacheAge}ms`);

    return `${base} ${extras.join(' ')}`;
  }

  log(input: LogInput): string {
    const requestId = input.requestId || this.generateRequestId();
    const fullEntry: LogEntry = {
      ...input,
      timestamp: new Date().toISOString(),
      requestId,
      status: input.status || 'success',
    } as LogEntry;

    if (this.shouldLog(input.level)) {
      const formatted = this.formatEntry(fullEntry);

      switch (input.level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        default:
          console.log(formatted);
      }

      return requestId;
    }

    return requestId;
  }

  debug(source: DataSource, operation: string, requestId: string, extras?: Partial<LogEntry>): void {
    this.log({ level: LogLevel.DEBUG, source, operation, requestId, status: 'success', ...extras });
  }

  info(source: DataSource, operation: string, requestId: string, extras?: Partial<LogEntry>): void {
    this.log({ level: LogLevel.INFO, source, operation, requestId, status: 'success', ...extras });
  }

  warn(source: DataSource, operation: string, requestId: string, extras?: Partial<LogEntry>): void {
    this.log({ level: LogLevel.WARN, source, operation, requestId, status: 'failure', ...extras });
  }

  error(source: DataSource, operation: string, requestId: string, extras?: Partial<LogEntry>): void {
    this.log({ level: LogLevel.ERROR, source, operation, requestId, status: 'failure', ...extras });
  }

  logCacheHit(source: DataSource, operation: string, requestId: string, cacheAge: number): void {
    this.log({ level: LogLevel.DEBUG, source, operation, requestId, status: 'cache-hit', cached: true, cacheAge });
  }

  logCacheStale(source: DataSource, operation: string, requestId: string, cacheAge: number): void {
    this.log({ level: LogLevel.WARN, source, operation, requestId, status: 'cache-stale', cached: true, cacheAge });
  }

  logRetry(source: DataSource, operation: string, requestId: string, attempt: number, errorCode?: string): void {
    this.log({ level: LogLevel.INFO, source, operation, requestId, status: 'retry', attempt, errorCode });
  }

  logCircuitOpen(source: DataSource, requestId: string): void {
    this.log({ level: LogLevel.WARN, source, operation: 'circuit-breaker', requestId, status: 'circuit-open' });
  }

  logCircuitClosed(source: DataSource, requestId: string): void {
    this.log({ level: LogLevel.INFO, source, operation: 'circuit-breaker', requestId, status: 'circuit-closed' });
  }
}

export const logger = new Logger();