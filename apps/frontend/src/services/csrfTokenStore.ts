import type { AxiosInstance, AxiosRequestConfig } from 'axios';

let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export function applyCsrfTokenToAxios(instance: AxiosInstance): void {
  if (!instance?.defaults?.headers) {
    return;
  }

  if (csrfToken) {
    instance.defaults.headers.common = instance.defaults.headers.common ?? {};
    instance.defaults.headers.common['X-CSRF-Token'] = csrfToken;
  } else if (instance.defaults.headers.common) {
    delete instance.defaults.headers.common['X-CSRF-Token'];
  }
}

export function applyCsrfTokenToConfig(config: AxiosRequestConfig): AxiosRequestConfig {
  if (!config.headers) {
    config.headers = {};
  }

  if (csrfToken) {
    (config.headers as Record<string, unknown>)['X-CSRF-Token'] = csrfToken;
  } else if ('X-CSRF-Token' in config.headers) {
    delete (config.headers as Record<string, unknown>)['X-CSRF-Token'];
  }

  return config;
}
