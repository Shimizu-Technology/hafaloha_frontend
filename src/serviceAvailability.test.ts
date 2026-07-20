import { describe, expect, it, vi } from 'vitest';
import { buildFrontendHealthUrl, checkServiceAvailability } from './serviceAvailability';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

describe('buildFrontendHealthUrl', () => {
  it('builds the tenant-specific readiness URL with or without a trailing slash', () => {
    expect(buildFrontendHealthUrl('https://api.example.com', '7')).toBe(
      'https://api.example.com/health/frontend?restaurant_id=7'
    );
    expect(buildFrontendHealthUrl('https://api.example.com/', '7')).toBe(
      'https://api.example.com/health/frontend?restaurant_id=7'
    );
  });
});

describe('checkServiceAvailability', () => {
  it('returns true only for the expected restaurant readiness contract', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'available', restaurant_id: 7 }));

    await expect(checkServiceAvailability({
      apiBaseUrl: 'https://api.example.com',
      restaurantId: '7',
      fetchImpl
    })).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/health/frontend?restaurant_id=7',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        signal: expect.any(AbortSignal)
      })
    );
  });

  it.each([
    ['an error response', async () => jsonResponse({ errors: ['Unavailable'] }, 503)],
    ['an unexpected status', async () => jsonResponse({ status: 'ok', restaurant_id: 7 })],
    ['a different restaurant', async () => jsonResponse({ status: 'available', restaurant_id: 8 })],
    ['a network failure', async () => { throw new TypeError('Failed to fetch'); }]
  ])('returns false for %s', async (_description, fetchImpl) => {
    await expect(checkServiceAvailability({
      apiBaseUrl: 'https://api.example.com',
      restaurantId: '7',
      fetchImpl
    })).resolves.toBe(false);
  });

  it('returns false when the readiness request times out', async () => {
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    await expect(checkServiceAvailability({
      apiBaseUrl: 'https://api.example.com',
      restaurantId: '7',
      fetchImpl,
      timeoutMs: 5
    })).resolves.toBe(false);
  });
});
