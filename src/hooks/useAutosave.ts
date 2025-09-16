import { useCallback, useEffect, useRef, useState } from 'react';

type Options<T> = {
  key: string;
  data: T;
  debounceMs?: number;
  enabled?: boolean;
};

export function useAutosave<T>({ key, data, debounceMs = 800, enabled = true }: Options<T>) {
  const [restored, setRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Detect existing draft
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const raw = localStorage.getItem(key);
    setHasDraft(!!raw);
  }, [key, enabled]);

  // Persist
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }, debounceMs);
    return () => window.clearTimeout(timer.current);
  }, [key, data, debounceMs, enabled]);

  const restore = useCallback(<S>(setter: (value: S) => void) => {
    if (!enabled || typeof window === 'undefined') return false;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      setter(parsed);
      setRestored(true);
      setHasDraft(false);
      return true;
    } catch (error) {
      console.warn('Failed to parse localStorage data:', error);
      return false;
    }
  }, [key, enabled]);

  const clear = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key, enabled]);

  return { restored, hasDraft, restore, clear };
}

export default useAutosave;

