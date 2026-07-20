import { config } from './shared/config';

const DEFAULT_TIMEOUT_MS = 8_000;

interface AvailabilityResponse {
  status?: unknown;
  restaurant_id?: unknown;
}

interface CheckServiceAvailabilityOptions {
  apiBaseUrl?: string;
  restaurantId?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildFrontendHealthUrl(
  apiBaseUrl = config.apiBaseUrl,
  restaurantId = config.restaurantId
): string {
  const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
  const url = new URL('health/frontend', baseUrl);
  url.searchParams.set('restaurant_id', restaurantId);
  return url.toString();
}

export async function checkServiceAvailability({
  apiBaseUrl = config.apiBaseUrl,
  restaurantId = config.restaurantId,
  fetchImpl = fetch,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS
}: CheckServiceAvailabilityOptions = {}): Promise<boolean> {
  const controller = new AbortController();
  const abortCheck = () => controller.abort();
  const timeout = globalThis.setTimeout(abortCheck, timeoutMs);

  signal?.addEventListener('abort', abortCheck, { once: true });

  try {
    const response = await fetchImpl(buildFrontendHealthUrl(apiBaseUrl, restaurantId), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) return false;

    const body = await response.json() as AvailabilityResponse;
    return body.status === 'available' && String(body.restaurant_id) === restaurantId;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortCheck);
  }
}
