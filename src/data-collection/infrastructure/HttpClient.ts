/**
 * HTTP Client with Timeout, Retry, Circuit Breaker, and Logging
 *
 * Features:
 * - Configurable timeout per source
 * - Retry with exponential backoff + jitter
 * - 429 handling with Retry-After header
 * - Circuit breaker integration
 * - Structured logging
 */

import { DataSource, logger } from './logger';
import { circuitBreaker, CircuitState } from './CircuitBreaker';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export interface HttpClientConfig {
  timeoutMs: number;
  retry: RetryConfig;
}

const DEFAULT_CONFIGS: Record<DataSource, HttpClientConfig> = {
  [DataSource.ESPN]: {
    timeoutMs: 8_000,
    retry: { maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000, jitterMs: 500 },
  },
  [DataSource.STATS_NBA_COM]: {
    timeoutMs: 3_000,
    retry: { maxAttempts: 1, baseDelayMs: 1_000, maxDelayMs: 3_000, jitterMs: 200 },
  },
  [DataSource.CACHE]: {
    timeoutMs: 1_000,
    retry: { maxAttempts: 1, baseDelayMs: 100, maxDelayMs: 1_000, jitterMs: 100 },
  },
  [DataSource.CIRCUIT_BREAKER]: {
    timeoutMs: 5_000,
    retry: { maxAttempts: 1, baseDelayMs: 100, maxDelayMs: 1_000, jitterMs: 50 },
  },
};

// Errors that should trigger retry
const RETRYABLE_ERRORS = ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

// HTTP status codes that should trigger retry
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

// HTTP status codes that should NOT retry
const NON_RETRYABLE_STATUS = [401, 403, 404, 418];

export class HttpClientError extends Error {
  public retryAfterMs?: number;

  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

interface FetchOptions extends RequestInit {
  signal?: AbortSignal;
}

export class HttpClient {
  private configs: Record<DataSource, HttpClientConfig>;

  constructor(configOverrides?: Partial<Record<DataSource, Partial<HttpClientConfig>>>) {
    this.configs = DEFAULT_CONFIGS;
    if (configOverrides) {
      for (const [source, overrides] of Object.entries(configOverrides)) {
        if (overrides) {
          this.configs[source as DataSource] = {
            ...DEFAULT_CONFIGS[source as DataSource],
            ...overrides,
          };
        }
      }
    }
  }

  /**
   * Fetch with timeout, retry, and circuit breaker
   */
  async fetch<T>(
    source: DataSource,
    url: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const requestId = logger.generateRequestId();
    const config = this.configs[source];

    // Check circuit breaker first
    if (!circuitBreaker.canExecute(source)) {
      logger.warn(source, 'fetch', requestId, { status: 'circuit-open' });
      throw new HttpClientError(
        `Circuit breaker is open for ${source}`,
        'CIRCUIT_OPEN',
        undefined,
        false
      );
    }

    let lastError: Error | HttpClientError | null = null;
    const retryConfig = config.retry;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const isLastAttempt = attempt === retryConfig.maxAttempts;

      try {
        const result = await this.doFetch<T>(source, url, options, config.timeoutMs, requestId);

        // Success - record and return
        circuitBreaker.recordSuccess(source);
        logger.debug(source, 'fetch', requestId, { status: 'success', duration: 0, attempt });

        return result;
      } catch (error) {
        lastError = error as Error;
        const httpError = lastError as HttpClientError;

        // Check if we should retry
        const shouldRetry = this.shouldRetry(httpError, isLastAttempt);

        if (!shouldRetry) {
          // Non-retryable error - record failure and throw
          circuitBreaker.recordFailure(source);
          logger.error(source, 'fetch', requestId, {
            status: 'failure',
            errorCode: httpError.code || httpError.statusCode?.toString(),
            attempt,
          });
          throw lastError;
        }

        // Log retry attempt
        logger.logRetry(source, 'fetch', requestId, attempt, httpError.code);

        if (!isLastAttempt) {
          // Calculate delay
          const delay = this.calculateDelay(attempt, retryConfig, httpError);

          // Check for Retry-After header on 429
          if (httpError.statusCode === 429) {
            const retryAfter = this.extractRetryAfter(httpError);
            if (retryAfter > 0) {
              // Use Retry-After value instead of backoff
              await this.sleep(retryAfter);
              continue;
            }
          }

          // Use exponential backoff
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    circuitBreaker.recordFailure(source);
    logger.error(source, 'fetch', requestId, {
      status: 'failure',
      errorCode: (lastError as HttpClientError)?.code,
    });
    throw lastError;
  }

  private async doFetch<T>(
    source: DataSource,
    url: string,
    options: FetchOptions,
    timeoutMs: number,
    requestId: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorCode = response.status.toString();
        const isRetryable = RETRYABLE_STATUS.includes(response.status) &&
                           !NON_RETRYABLE_STATUS.includes(response.status);

        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseRetryAfter(retryAfter) : 0;

        const error = new HttpClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          errorCode,
          response.status,
          isRetryable
        );

        // Attach Retry-After for 429 handling
        if (retryAfterMs > 0) {
          error.retryAfterMs = retryAfterMs;
        }

        throw error;
      }

      logger.debug(source, 'fetch', requestId, { status: 'success', duration });
      return response.json();
    } catch (error) {
      // Handle abort errors (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const isRetryable = source === DataSource.STATS_NBA_COM;
        const httpError = new HttpClientError(
          `Request timeout after ${timeoutMs}ms`,
          'ECONNABORTED',
          undefined,
          isRetryable
        );
        throw httpError;
      }

      // Re-throw HttpClientErrors
      if (error instanceof HttpClientError) {
        throw error;
      }

      // Convert other errors
      const err = error as Error & { code?: string };
      const code = err.code || 'UNKNOWN';
      const isRetryable = err.code ? RETRYABLE_ERRORS.includes(err.code) : false;
      throw new HttpClientError(
        err.message || 'Unknown error',
        code,
        undefined,
        isRetryable
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private shouldRetry(error: HttpClientError, isLastAttempt: boolean): boolean {
    if (isLastAttempt) return false;
    return error.isRetryable;
  }

  private calculateDelay(
    attempt: number,
    config: RetryConfig,
    error: HttpClientError
  ): number {
    // Check if we have a Retry-After from the error
    const retryAfterMs = error.retryAfterMs;
    if (retryAfterMs && retryAfterMs > 0) {
      return retryAfterMs;
    }

    // Exponential backoff: baseDelay * 2^attempt + jitter
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * config.jitterMs * 2 - config.jitterMs;
    const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

    return Math.floor(delay);
  }

  private extractRetryAfter(error: HttpClientError): number {
    return error.retryAfterMs || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state for a source
   */
  getCircuitState(source: DataSource): CircuitState {
    return circuitBreaker.getState(source);
  }
}

// Helper to parse Retry-After header (supports seconds or HTTP date)
function parseRetryAfter(value: string): number {
  // Try parsing as seconds
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return 0;
}

// Export singleton
export const httpClient = new HttpClient();

// Export config for reference
export const HTTP_CLIENT_CONFIGS = DEFAULT_CONFIGS;