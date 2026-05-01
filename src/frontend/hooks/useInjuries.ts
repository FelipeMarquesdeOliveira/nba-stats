/**
 * useInjuries - Hook for fetching NBA injuries from ESPN
 * With polling, cache awareness, and stale detection
 */

import { useState, useEffect, useRef } from 'react';
import { AvailabilityItem } from '@domain/types';
import { injuryGateway, circuitBreaker, CircuitState, DataSource } from '@data-collection';

interface UseInjuriesResult {
  injuries: AvailabilityItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
  lastUpdated: Date | null;
  circuitOpen: boolean;
}

export function useInjuries(): UseInjuriesResult {
  const [injuries, setInjuries] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const injuriesRef = useRef<AvailabilityItem[]>([]);

  // Keep injuriesRef in sync
  useEffect(() => {
    injuriesRef.current = injuries;
  }, [injuries]);

  const fetchInjuries = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
    }
    setError(null);

    try {
      // injuryGateway.getInjuriesByTeam('') returns all injuries
      const allInjuries = await injuryGateway.getInjuriesByTeam('');
      setInjuries(allInjuries);
      setLastUpdated(new Date());
      setIsStale(false);
      setCircuitOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch injuries';

      // Check if circuit is open
      const circuitState = circuitBreaker.getState(DataSource.ESPN);
      const isCircuitOpen = circuitState === CircuitState.OPEN;

      if (isCircuitOpen) {
        setCircuitOpen(true);
      }

      // Check if we have stale data to show
      if (injuriesRef.current.length > 0 && err instanceof Error &&
          (err.message.includes('fetch') || err.message.includes('network') ||
           err.message.includes('timeout') || err.message.includes('API') ||
           err.message.includes('Circuit'))) {
        setIsStale(true);
        setError(null);
      } else if (isCircuitOpen) {
        setError('Serviço temporariamente indisponível');
        setIsStale(false);
      } else {
        setError(errorMessage);
        setIsStale(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get polling interval based on circuit state
  const getPollingInterval = (): number => {
    const circuitState = circuitBreaker.getState(DataSource.ESPN);
    const isCircuitOpen = circuitState === CircuitState.OPEN;

    // When circuit is open, polling is much slower (900s vs 600s)
    if (isCircuitOpen) {
      return 900_000; // 15 minutes when circuit is open
    }

    // Normal polling: 10 minutes
    return 600_000;
  };

  // Polling management
  const startPolling = () => {
    const interval = getPollingInterval();

    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Reduce interval when tab is hidden
    let adjustedInterval = interval;
    if (typeof document !== 'undefined' && document.hidden) {
      adjustedInterval = interval * 1.5;
    }

    pollingIntervalRef.current = setInterval(() => {
      fetchInjuries(true);
    }, adjustedInterval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchInjuries();
    return () => stopPolling();
  }, []);

  // Start polling after initial load
  useEffect(() => {
    if (!loading && injuries.length > 0) {
      startPolling();
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, injuries.length]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (injuries.length > 0) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injuries.length]);

  return {
    injuries,
    loading,
    error,
    refetch: () => fetchInjuries(false),
    isStale,
    lastUpdated,
    circuitOpen,
  };
}