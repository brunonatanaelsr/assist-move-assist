import axios from 'axios';
import { API_URL } from '@/config';
import { applyCsrfTokenToConfig } from '@/services/csrfTokenStore';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => applyCsrfTokenToConfig(config));

export default api;
