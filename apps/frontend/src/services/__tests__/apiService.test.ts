import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import apiService from '@/services/apiService';
import { API_URL } from '@/config';
import type { ApiResponse } from '@/types/api';

describe('apiService response interceptor', () => {
  const getResponseInterceptor = () => {
    const handlers = ((apiService as unknown as { api: { interceptors: { response: { handlers: any[] } } } }).api.interceptors
      .response.handlers || []) as Array<{ fulfilled?: (response: AxiosResponse<ApiResponse>) => AxiosResponse<ApiResponse> }>;

    const handler = handlers.find((item) => typeof item?.fulfilled === 'function')?.fulfilled;

    if (!handler) {
      throw new Error('Response interceptor not found');
    }

    return handler;
  };

  it('wraps responses from the internal API', () => {
    const handler = getResponseInterceptor();

    const response = {
      data: { foo: 'bar' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        baseURL: API_URL,
        url: '/internal/test',
      },
    } as AxiosResponse<ApiResponse>;

    const result = handler(response);

    expect(result.data).toEqual({ success: true, data: { foo: 'bar' } });
  });

  it('does not wrap external API responses', () => {
    const handler = getResponseInterceptor();

    const response = {
      data: { foo: 'bar' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        url: 'https://third-party.example/api/data',
      },
    } as AxiosResponse<ApiResponse>;

    const result = handler(response);

    expect(result.data).toEqual({ foo: 'bar' });
  });
});
