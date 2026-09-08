import { useLocale, useT } from '../i18n';
import { LOCALES, useUiStore, type Locale } from '../store/uiStore';
import { THEME_PREFERENCES, useThemePreference, type ThemePreference } from '../theme';
import { input } from './ui';

/** Short, locale-invariant labels: a language switch must be readable in every language. */
const LOCALE_LABEL: Record<Locale, string> = { en: 'EN', ar: 'AR' };
const LOCALE_NAME: Record<Locale, string> = { en: 'English', ar: 'العربية' };
const THEME_LABEL = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;

/** Top bar: app title plus device-level preferences (language, theme). Plan controls live in the Toolbar. */
export function AppBar() {
  const t = useT();
  const locale = useLocale();
  const setLocale = useUiStore((s) => s.setLocale);
  const [theme, setTheme] = useThemePreference();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2">
        <h1 className="me-auto text-lg font-semibold">{t('appTitle')}</h1>

        <div role="group" aria-label={t('language')} className="flex overflow-hidden rounded border border-line-strong text-sm">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              title={LOCALE_NAME[l]}
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
              className={`px-3 py-1 transition-colors ${locale === l ? 'bg-accent text-on-accent' : 'bg-surface hover:bg-surface-muted'}`}
            >
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>

        <select
          className={input}
          aria-label={t('theme')}
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemePreference)}
        >
          {THEME_PREFERENCES.map((p) => <option key={p} value={p}>{t(THEME_LABEL[p])}</option>)}
        </select>
      </div>
    </header>
  );
}
