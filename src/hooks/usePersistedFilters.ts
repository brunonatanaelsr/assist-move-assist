import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Options<T> = {
  key: string;
  initial: T;
};

export function usePersistedFilters<T extends Record<string, unknown>>({ key, initial }: Options<T>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<T>(initial);
  const firstLoad = useRef(true);

  // Load from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl: Record<string, unknown> = {};
    params.forEach((v, k) => { fromUrl[k] = v; });

    if (Object.keys(fromUrl).length > 0) {
      setState((prev) => ({ ...prev, ...(fromUrl as Partial<T>) }));
    } else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setState({ ...initial, ...(JSON.parse(raw) as T) });
      } catch (error) {
        console.warn('Failed to load filters from localStorage:', error);
      }
    }
  }, [location.pathname, initial]);

  // Persist to localStorage and URL
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }

    const params = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
    });
    navigate({ search: params.toString() }, { replace: true });
  }, [key, state, navigate]);

  const set = useCallback((patch: Partial<T>) => setState((prev) => ({ ...prev, ...patch })), []);
  const reset = useCallback(() => setState(initial), [initial]);

  return useMemo(() => ({ state, set, reset }), [state, set, reset]);
}

export default usePersistedFilters;

