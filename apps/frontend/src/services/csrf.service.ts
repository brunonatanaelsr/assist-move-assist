import type { AxiosInstance } from 'axios';
import api from '@/config/api';
import {
  applyCsrfTokenToAxios,
  getCsrfToken,
  setCsrfToken,
} from './csrfTokenStore';

let csrfFetchPromise: Promise<string | null> | null = null;

export async function ensureCsrfTokenFetched(
  axiosInstance: AxiosInstance = api,
  endpoint = '/csrf-token'
): Promise<string | null> {
  const existingToken = getCsrfToken();
  if (existingToken) {
    applyCsrfTokenToAxios(axiosInstance);
    return existingToken;
  }

  if (!csrfFetchPromise) {
    csrfFetchPromise = axiosInstance
      .get<{ csrfToken?: string }>(endpoint, { withCredentials: true })
      .then((response) => {
        const csrfToken = response?.data?.csrfToken ?? null;
        if (csrfToken) {
          setCsrfToken(csrfToken);
        }
        return csrfToken;
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }

  const token = await csrfFetchPromise;

  if (token) {
    applyCsrfTokenToAxios(axiosInstance);
  }

  return token;
}
