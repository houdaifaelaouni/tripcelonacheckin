import { useEffect, useState } from 'react';

// Tiny history router: enough for a handful of routes, no dependency.
export function navigate(to: string, replace = false) {
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new Event('tc-nav'));
  window.scrollTo(0, 0);
}

export function useLocation() {
  const read = () => ({ path: location.pathname, search: new URLSearchParams(location.search), hash: location.hash });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener('popstate', on);
    window.addEventListener('tc-nav', on);
    return () => {
      window.removeEventListener('popstate', on);
      window.removeEventListener('tc-nav', on);
    };
  }, []);
  return loc;
}

/** Match "/trips/:id" against a path; returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
