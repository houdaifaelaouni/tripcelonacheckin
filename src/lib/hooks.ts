import { useCallback, useEffect, useState } from 'react';
import { api, errorText, getSession } from './api';
import type { SessionInfo } from '../../shared/types';

export function useSession(): SessionInfo | null {
  const [s, setS] = useState(getSession);
  useEffect(() => {
    const on = () => setS(getSession());
    window.addEventListener('tc-session', on);
    return () => window.removeEventListener('tc-session', on);
  }, []);
  return s;
}

/** Load data from the API; `reload` refetches. Optional polling interval. */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(!!path);
    setData(null);
    reload();
    if (!pollMs || !path) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, pollMs);
    return () => clearInterval(id);
  }, [reload, pollMs, path]);

  return { data, error, loading, reload, setData };
}
