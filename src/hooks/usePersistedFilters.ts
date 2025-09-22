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
    if (firstLoad.current) {
      firstLoad.current = false;
      const savedState = localStorage.getItem(key);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setState(parsed);
          return;
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }

    const params = new URLSearchParams(location.search);
    const hasParams = Array.from(params.keys()).length > 0;

    if (hasParams) {
      setState((prev) => {
        const next = { ...prev } as Record<string, unknown>;

        params.forEach((value, paramKey) => {
          const reference =
            (prev as Record<string, unknown>)[paramKey] ??
            (initial as Record<string, unknown>)[paramKey];

          let parsed: unknown = value;

          if (typeof reference === 'number') {
            const numeric = Number(value);
            parsed = Number.isNaN(numeric) ? reference : numeric;
          } else if (typeof reference === 'boolean') {
            if (/^(true|false)$/i.test(value)) {
              parsed = value.toLowerCase() === 'true';
            } else {
              parsed = reference;
            }
          } else if (typeof reference === 'string') {
            parsed = value;
          } else if (Array.isArray(reference)) {
            try {
              const candidate = JSON.parse(value);
              parsed = Array.isArray(candidate)
                ? candidate
                : value
                    .split(',')
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0);
            } catch {
              parsed = value
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
            }
          } else if (reference && typeof reference === 'object') {
            try {
              parsed = JSON.parse(value);
            } catch {
              parsed = reference;
            }
          } else {
            try {
              parsed = JSON.parse(value);
            } catch {
              parsed = value;
            }
          }

          next[paramKey] = parsed;
        });

        return next as T;
      });
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

