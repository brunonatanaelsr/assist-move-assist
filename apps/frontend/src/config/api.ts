import axios from 'axios';
import { API_URL } from '@/config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'csrf_token',
  xsrfHeaderName: 'X-CSRF-Token',
});

export default api;
