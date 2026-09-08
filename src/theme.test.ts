import { describe, it, expect, beforeEach, vi } from 'vitest';
import { THEME_KEY, applyTheme, readThemePreference, resolveTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('resolveTheme', () => {
  it('follows the OS only for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('readThemePreference', () => {
  it('defaults to system when nothing or garbage is stored', () => {
    expect(readThemePreference()).toBe('system');
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readThemePreference()).toBe('system');
  });

  it('returns a stored preference', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(readThemePreference()).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('toggles the dark class on <html> and persists the preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
    vi.unstubAllGlobals();
  });
});
