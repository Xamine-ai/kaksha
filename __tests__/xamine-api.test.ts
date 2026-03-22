import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStudentOverallPerformance } from '@/lib/xamine-api';

describe('Xamine API Middleware', () => {
  const originalEnv = process.env;
  let fetchMock: any;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should attach the Token header when XAMINE_STUDENT_TOKEN is present', async () => {
    const testToken = 'test-token-123';
    process.env.XAMINE_STUDENT_TOKEN = testToken;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ score: 100 }),
    });

    await getStudentOverallPerformance();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];

    expect(url).toBe('https://api.xamine.ai/getStudentOverallPerformance');
    expect(options.method).toBe('GET');
    
    // Check headers
    const headers = options.headers as Headers;
    expect(headers).toBeDefined();
    
    // Depending on whether it's a Headers object or a plain record
    if (headers instanceof Headers) {
      expect(headers.get('Token')).toBe(testToken);
    } else {
      expect((headers as Record<string, string>)['Token']).toBe(testToken);
    }
  });

  it('should catch a 401 error and map it to XamineApiError', async () => {
    process.env.XAMINE_STUDENT_TOKEN = 'invalid-token';

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'Token expired' }),
    });

    await expect(getStudentOverallPerformance()).rejects.toThrow('Xamine API Error: Unauthorized');
  });
});
