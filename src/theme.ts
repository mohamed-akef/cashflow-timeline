import { useCallback, useEffect, useState } from 'react';

/**
 * Colour theme. The preference lives in its own localStorage key, outside the
 * plan, so exported JSON files never carry a device setting. index.html has a
 * tiny inline script that reads the same key before the bundle loads, so the
 * first paint is already the right colour.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];
export const THEME_KEY = 'cashflow-timeline:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const isPreference = (v: unknown): v is ThemePreference =>
  (THEME_PREFERENCES as readonly unknown[]).includes(v);

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function osPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** Persist the preference and reflect the resolved theme on <html>. */
export function applyTheme(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Private mode or quota: the theme still applies for this page load.
  }
  document.documentElement.classList.toggle('dark', resolveTheme(pref, osPrefersDark()) === 'dark');
}

/** Current preference plus a setter; re-applies when the OS theme changes under "system". */
export function useThemePreference(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPrefState] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((next: ThemePreference) => setPrefState(next), []);
  return [pref, setPref];
}
