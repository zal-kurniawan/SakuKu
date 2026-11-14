'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  isFetching?: boolean;
}

// Global in-memory cache store
const cacheStore = new Map<string, CacheEntry>();
// Active subscribers listening for updates to specific cache keys
const keySubscribers = new Map<string, Set<(data: any) => void>>();
// Active fetch promises to deduplicate in-flight requests for the exact same URL
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Normalizes URL keys for consistent cache lookup
 */
function normalizeKey(url: string): string {
  return url.trim();
}

/**
 * Retrieves cached data synchronously if available
 */
export function getCachedData<T = any>(url: string): T | undefined {
  const key = normalizeKey(url);
  const entry = cacheStore.get(key);
  return entry ? (entry.data as T) : undefined;
}

/**
 * Checks if a cache entry is still fresh within its TTL
 */
export function isCacheFresh(url: string, ttlMs: number = 60000): boolean {
  const key = normalizeKey(url);
  const entry = cacheStore.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Manually updates a cache entry and notifies all active component subscribers
 */
export function mutateCache<T = any>(
  url: string,
  dataOrUpdater: T | ((prev?: T) => T),
  triggerRevalidation: boolean = false
): void {
  const key = normalizeKey(url);
  const prevEntry = cacheStore.get(key);
  const prevData = prevEntry ? (prevEntry.data as T) : undefined;

  const nextData =
    typeof dataOrUpdater === 'function'
      ? (dataOrUpdater as (prev?: T) => T)(prevData)
      : dataOrUpdater;

  cacheStore.set(key, {
    data: nextData,
    timestamp: Date.now(),
    isFetching: false,
  });

  // Notify all components subscribed to this key
  const subs = keySubscribers.get(key);
  if (subs) {
    subs.forEach((callback) => {
      try {
        callback(nextData);
      } catch (err) {
        console.error('Error notifying cache subscriber:', err);
      }
    });
  }

  if (triggerRevalidation) {
    fetchFromNetwork(url).catch(() => {});
  }
}

/**
 * Invalidates cache entries matching a string prefix or RegExp pattern.
 * If no pattern is provided, invalidates all keys starting with '/api/'.
 * Matching subscribers are immediately signaled to re-fetch fresh data from server.
 */
export function invalidateCache(pattern?: string | RegExp): void {
  const keysToInvalidate: string[] = [];

  for (const key of cacheStore.keys()) {
    if (!pattern) {
      if (key.startsWith('/api/')) keysToInvalidate.push(key);
    } else if (typeof pattern === 'string') {
      if (key.includes(pattern)) keysToInvalidate.push(key);
    } else if (pattern.test(key)) {
      keysToInvalidate.push(key);
    }
  }

  // Delete matching entries from memory cache
  for (const key of keysToInvalidate) {
    cacheStore.delete(key);
  }

  // Notify active subscribers on matching keys to trigger silent revalidation
  for (const [key, subs] of keySubscribers.entries()) {
    const isMatch =
      !pattern
        ? key.startsWith('/api/')
        : typeof pattern === 'string'
        ? key.includes(pattern)
        : pattern.test(key);

    if (isMatch) {
      subs.forEach((callback) => {
        try {
          callback(undefined); // undefined signals that the cache is invalidated
        } catch (err) {
          console.error('Error invalidating subscriber:', err);
        }
      });
    }
  }
}

/**
 * Invalidates all core Dashboard related API caches:
 * /api/dashboard, /api/stats, /api/wallets, /api/transactions, /api/budgets
 */
export function invalidateDashboardCache(): void {
  invalidateCache(/^\/api\/(dashboard|stats|wallets|transactions|budgets)/);
}

/**
 * Dedicated network fetcher with deduplication of in-flight promises
 */
async function fetchFromNetwork<T = any>(url: string): Promise<T> {
  const key = normalizeKey(url);

  // If a request for this exact URL is already in-flight, return the existing promise
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();

      cacheStore.set(key, {
        data: json,
        timestamp: Date.now(),
        isFetching: false,
      });

      // Notify subscribers
      const subs = keySubscribers.get(key);
      if (subs) {
        subs.forEach((cb) => {
          try {
            cb(json);
          } catch (e) {
            console.error('Subscriber error:', e);
          }
        });
      }

      return json as T;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}

export interface UseSakuKuCacheOptions<T> {
  ttl?: number; // Cache freshness duration in milliseconds (default: 60s)
  enabled?: boolean; // Whether to fetch automatically (default: true)
  fallbackData?: T; // Initial fallback data before fetch
  revalidateOnMount?: boolean; // Whether to revalidate on mount even if fresh
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export interface UseSakuKuCacheResult<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  isValidating: boolean;
  refetch: () => Promise<T | undefined>;
  mutate: (newData: T | ((prev?: T) => T), triggerRevalidate?: boolean) => void;
}

/**
 * High-performance Stale-While-Revalidate caching hook for SakuKu
 * - If cached & fresh within TTL: Returns instant cached data with ZERO spinner.
 * - If cached but stale: Returns stale data instantly while revalidating quietly in background.
 * - If not in cache: Sets loading: true and fetches from network.
 * - Supports automatic background updates and synchronized cross-component subscriptions.
 */
export function useSakuKuCache<T = any>(
  url: string | null,
  options: UseSakuKuCacheOptions<T> = {}
): UseSakuKuCacheResult<T> {
  const {
    ttl = 60000,
    enabled = true,
    fallbackData,
    revalidateOnMount = false,
  } = options;

  const normalizedUrl = url ? normalizeKey(url) : null;

  // Read initial cache state synchronously
  const initialEntry = normalizedUrl ? cacheStore.get(normalizedUrl) : undefined;
  const isInitiallyFresh = initialEntry
    ? Date.now() - initialEntry.timestamp < ttl
    : false;

  const [data, setData] = useState<T | undefined>(() => {
    if (initialEntry) return initialEntry.data as T;
    return fallbackData;
  });

  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    if (!enabled || !normalizedUrl) return false;
    return !initialEntry; // If already cached, never show initial full loading spinner
  });
  const [isValidating, setIsValidating] = useState<boolean>(() => {
    if (!enabled || !normalizedUrl) return false;
    return !isInitiallyFresh;
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Revalidation trigger
  const revalidate = useCallback(async (): Promise<T | undefined> => {
    if (!normalizedUrl || !enabled) return undefined;

    setIsValidating(true);
    try {
      const result = await fetchFromNetwork<T>(normalizedUrl);
      setData(result);
      setError(null);
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (err: any) {
      setError(err);
      optionsRef.current.onError?.(err);
      return undefined;
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  }, [normalizedUrl, enabled]);

  // Active subscriber listener
  useEffect(() => {
    if (!normalizedUrl || !enabled) return;

    if (!keySubscribers.has(normalizedUrl)) {
      keySubscribers.set(normalizedUrl, new Set());
    }
    const subs = keySubscribers.get(normalizedUrl)!;

    const subscriberCallback = (updatedData: any) => {
      if (updatedData === undefined) {
        // Cache was invalidated -> revalidate quietly
        revalidate();
      } else {
        setData(updatedData);
        setLoading(false);
        setIsValidating(false);
        setError(null);
      }
    };

    subs.add(subscriberCallback);

    // Initial load logic
    const entry = cacheStore.get(normalizedUrl);
    const fresh = entry ? Date.now() - entry.timestamp < ttl : false;

    if (entry) {
      setData(entry.data as T);
      setLoading(false);
      if (!fresh || revalidateOnMount) {
        revalidate();
      } else {
        setIsValidating(false);
      }
    } else {
      revalidate();
    }

    return () => {
      subs.delete(subscriberCallback);
      if (subs.size === 0) {
        keySubscribers.delete(normalizedUrl);
      }
    };
  }, [normalizedUrl, enabled, ttl, revalidateOnMount, revalidate]);

  const mutate = useCallback(
    (newData: T | ((prev?: T) => T), triggerRevalidate: boolean = false) => {
      if (!normalizedUrl) return;
      mutateCache(normalizedUrl, newData, triggerRevalidate);
    },
    [normalizedUrl]
  );

  return {
    data,
    error,
    loading,
    isValidating,
    refetch: revalidate,
    mutate,
  };
}
