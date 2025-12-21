/**
 * Utility for retrying failed operations with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    // Check if it's a network error that should be retried
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as { code?: string; message?: string };

    if (errorMessage.includes('Load failed')) return true;
    if (errorMessage.includes('network')) return true;
    if (errorMessage.includes('connection')) return true;
    if (errorMessage.includes('TypeError: Load failed')) return true;
    if (errorObj?.code === '') return true; // Empty error code often indicates network issue
    return false;
  }
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute an async Supabase query with retry logic
 * Works with Supabase query builders that return { data, error }
 */
export async function withSupabaseRetry<T>(
  queryFn: () => PromiseLike<{ data: T; error: unknown }>,
  options: RetryOptions = {}
): Promise<{ data: T; error: unknown }> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await queryFn();

      // If there's a retryable error in the result, throw to trigger retry
      if (result.error && config.shouldRetry(result.error)) {
        throw result.error;
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === config.maxAttempts || !config.shouldRetry(error)) {
        // Return with error if it was a Supabase error object
        if (error && typeof error === 'object' && 'message' in error) {
          return { data: null as T, error };
        }
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

  return { data: null as T, error: lastError };
}
