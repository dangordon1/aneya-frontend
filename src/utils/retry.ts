/**
 * Utility for retrying failed operations with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    // Retry on network errors or specific Supabase errors
    if (error?.message?.includes('Load failed')) return true;
    if (error?.message?.includes('network')) return true;
    if (error?.message?.includes('connection')) return true;
    if (error?.code === '') return true; // Empty error code often indicates network issue
    return false;
  }
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute an async operation with retry logic
 * @param operation The async function to execute
 * @param options Configuration options for retry behavior
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === config.maxAttempts || !config.retryCondition(error)) {
        throw error;
      }

      console.warn(
        `Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms...`,
        error
      );

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Wrapper for Supabase queries with retry logic
 * @param queryBuilder A function that returns a Supabase query builder
 * @returns The query result
 */
export async function withSupabaseRetry<T>(
  queryBuilder: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await withRetry(async () => {
      const { data, error } = await queryBuilder();

      // Throw the error so retry logic can catch it
      if (error && (
        error.message?.includes('Load failed') ||
        error.message?.includes('network') ||
        error.code === ''
      )) {
        throw error;
      }

      return { data, error };
    });

    return result;
  } catch (error) {
    // Final error after all retries exhausted
    return { data: null, error };
  }
}
