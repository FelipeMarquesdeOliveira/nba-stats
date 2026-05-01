/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by stopping calls to failing sources
 *
 * States:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Circuit is open, calls fail fast
 * - HALF_OPEN: Testing if circuit can recover
 */

import { DataSource } from './logger';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeoutMs: number;        // Time in OPEN state before testing
  halfOpenSuccessThreshold: number; // Number of successes in HALF_OPEN to close
}

const DEFAULT_CONFIG: Record<DataSource, CircuitBreakerConfig> = {
  [DataSource.ESPN]: {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenSuccessThreshold: 1,
  },
  [DataSource.STATS_NBA_COM]: {
    failureThreshold: 5,
    resetTimeoutMs: 45_000,
    halfOpenSuccessThreshold: 2, // More conservative for external API
  },
  [DataSource.CACHE]: {
    failureThreshold: 3,
    resetTimeoutMs: 10_000,
    halfOpenSuccessThreshold: 1,
  },
  [DataSource.CIRCUIT_BREAKER]: {
    failureThreshold: 1,
    resetTimeoutMs: 5_000,
    halfOpenSuccessThreshold: 1,
  },
};

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private circuits: Map<DataSource, CircuitBreakerState> = new Map();
  private config: Record<DataSource, CircuitBreakerConfig>;

  constructor(configOverrides?: Partial<Record<DataSource, Partial<CircuitBreakerConfig>>>) {
    this.config = DEFAULT_CONFIG;
    if (configOverrides) {
      for (const [source, overrides] of Object.entries(configOverrides)) {
        if (overrides) {
          this.config[source as DataSource] = {
            ...DEFAULT_CONFIG[source as DataSource],
            ...overrides,
          };
        }
      }
    }
  }

  getState(source: DataSource): CircuitState {
    this.ensureCircuitExists(source);
    return this.circuits.get(source)!.state;
  }

  isOpen(source: DataSource): boolean {
    return this.getState(source) === CircuitState.OPEN;
  }

  isClosed(source: DataSource): boolean {
    return this.getState(source) === CircuitState.CLOSED;
  }

  /**
   * Check if a call is allowed (not in OPEN state or past reset timeout)
   */
  canExecute(source: DataSource): boolean {
    this.ensureCircuitExists(source);
    const state = this.circuits.get(source)!;
    const now = Date.now();

    if (state.state === CircuitState.CLOSED) {
      return true;
    }

    if (state.state === CircuitState.OPEN) {
      if (now >= state.nextAttemptTime) {
        // Time to try again
        state.state = CircuitState.HALF_OPEN;
        state.successes = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow execution
    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess(source: DataSource): void {
    this.ensureCircuitExists(source);
    const state = this.circuits.get(source)!;
    const cfg = this.config[source];

    if (state.state === CircuitState.HALF_OPEN) {
      state.successes++;
      if (state.successes >= cfg.halfOpenSuccessThreshold) {
        // Circuit recovered
        state.state = CircuitState.CLOSED;
        state.failures = 0;
        state.successes = 0;
      }
    } else if (state.state === CircuitState.CLOSED) {
      // Reset failures on success in CLOSED state
      state.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(source: DataSource): void {
    this.ensureCircuitExists(source);
    const state = this.circuits.get(source)!;
    const cfg = this.config[source];

    if (state.state === CircuitState.HALF_OPEN) {
      // Failure in HALF_OPEN - go back to OPEN
      state.state = CircuitState.OPEN;
      state.lastFailureTime = Date.now();
      state.nextAttemptTime = Date.now() + cfg.resetTimeoutMs;
      state.successes = 0;
    } else if (state.state === CircuitState.CLOSED) {
      state.failures++;
      if (state.failures >= cfg.failureThreshold) {
        // Open the circuit
        state.state = CircuitState.OPEN;
        state.lastFailureTime = Date.now();
        state.nextAttemptTime = Date.now() + cfg.resetTimeoutMs;
      }
    }
  }

  /**
   * Get circuit status for debugging
   */
  getStatus(source: DataSource): {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttemptMs: number;
  } {
    this.ensureCircuitExists(source);
    const state = this.circuits.get(source)!;
    return {
      state: state.state,
      failures: state.failures,
      successes: state.successes,
      nextAttemptMs: Math.max(0, state.nextAttemptTime - Date.now()),
    };
  }

  /**
   * Reset circuit to initial state (for testing)
   */
  reset(source: DataSource): void {
    this.circuits.set(source, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    });
  }

  private ensureCircuitExists(source: DataSource): void {
    if (!this.circuits.has(source)) {
      this.reset(source);
    }
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreaker();