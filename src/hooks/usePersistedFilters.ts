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
  }, [location.pathname, location.search, initial, key]);

  // Persist to localStorage and URL
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }

    // Persist to localStorage only if changed
    try {
      const nextSerialized = JSON.stringify(state);
      const prevSerialized = localStorage.getItem(key);
      if (prevSerialized !== nextSerialized) {
        localStorage.setItem(key, nextSerialized);
      }
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }

    // Compute next search and compare to current to avoid redundant replaceState
    const params = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
    });
    const nextSearch = params.toString();
    const currentSearch = new URLSearchParams(location.search).toString();
    if (nextSearch !== currentSearch) {
      navigate({ search: nextSearch }, { replace: true });
    }
  }, [key, state, navigate, location.search]);

  const set = useCallback((patch: Partial<T>) => setState((prev) => ({ ...prev, ...patch })), []);
  const reset = useCallback(() => setState(initial), [initial]);

  return useMemo(() => ({ state, set, reset }), [state, set, reset]);
}

export default usePersistedFilters;

