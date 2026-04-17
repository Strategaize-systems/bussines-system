// =============================================================
// Retry with Exponential Backoff — shared utility for AI calls
// =============================================================

const DEFAULT_DELAYS_MS = [10_000, 30_000, 90_000]; // 10s, 30s, 90s

/**
 * Wraps an async function with exponential backoff retry logic.
 * Retries on 429 (rate limit) and 5xx (server errors).
 *
 * @param fn - The async function to retry
 * @param shouldRetry - Predicate to decide if the error is retryable
 * @param delays - Array of delay durations in ms (default: [10s, 30s, 90s])
 * @returns The result of fn, or throws after all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  delays: number[] = DEFAULT_DELAYS_MS,
): Promise<T> {
  let lastError: unknown;

  // First attempt (no delay)
  try {
    return await fn();
  } catch (err) {
    lastError = err;
    if (!shouldRetry(err)) throw err;
  }

  // Retry attempts with delay
  for (let i = 0; i < delays.length; i++) {
    const delay = delays[i];
    console.log(
      `[Retry] Attempt ${i + 2}/${delays.length + 1} after ${delay}ms delay...`,
    );
    await sleep(delay);

    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!shouldRetry(err)) throw err;
    }
  }

  throw lastError;
}

/**
 * Checks if an error is retryable (429 or 5xx status codes).
 * Works with OpenAI SDK errors, fetch errors, and Bedrock errors.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const msg = error instanceof Error ? error.message : String(error);

  // OpenAI rate limit
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Rate limit")) {
    return true;
  }

  // Server errors (5xx)
  if (/\b5\d{2}\b/.test(msg)) {
    return true;
  }

  // Timeout (may be transient)
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET")) {
    return true;
  }

  // AWS Bedrock throttling
  if (msg.includes("ThrottlingException") || msg.includes("TooManyRequestsException")) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
