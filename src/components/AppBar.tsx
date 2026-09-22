import { useLocale, useT } from '../i18n';
import { LOCALES, useUiStore, type Locale } from '../store/uiStore';
import { THEME_PREFERENCES, useThemePreference, type ThemePreference } from '../theme';
import { Toolbar } from './Toolbar';
import { Select, focusRing } from './ui';

/** Each language named in itself: the switch must be readable by someone who does not read the current one. */
const LOCALE_NAME: Record<Locale, string> = { en: 'English', ar: 'العربية' };
const THEME_LABEL = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;

/**
 * The one bar: app title, the plan controls, then device-level preferences
 * (language, theme). Everything sits on a single 8-unit control height so the
 * row reads as one line rather than a stack of bands. From sm up it stays
 * pinned while the grid scrolls, with the canvas showing through; on a phone
 * it wraps to three rows, so it scrolls away instead of eating the viewport.
 */
export function AppBar() {
  const t = useT();
  const locale = useLocale();
  const setLocale = useUiStore((s) => s.setLocale);
  const [theme, setTheme] = useThemePreference();
  const other: Locale = LOCALES.find((l) => l !== locale) ?? 'en';

  return (
    <header className="z-20 sm:sticky sm:top-0 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <h1 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-ink">
          {/* Wordmark: three rising bars in the accent, the shape of a balance climbing. */}
          <span aria-hidden="true" className="flex items-end gap-0.5">
            <span className="h-2 w-1 rounded-sm bg-accent/50" />
            <span className="h-3 w-1 rounded-sm bg-accent/75" />
            <span className="h-4 w-1 rounded-sm bg-accent" />
          </span>
          {t('appTitle')}
        </h1>

        <Toolbar />

        {/* One tap: the button names the language you would switch to. */}
        <button
          type="button"
          lang={other}
          onClick={() => setLocale(other)}
          className={`h-8 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent active:translate-y-px ${focusRing}`}
        >
          {LOCALE_NAME[other]}
        </button>

        <Select aria-label={t('theme')} value={theme} onChange={(e) => setTheme(e.target.value as ThemePreference)}>
          {THEME_PREFERENCES.map((p) => <option key={p} value={p}>{t(THEME_LABEL[p])}</option>)}
        </Select>
      </div>
    </header>
  );
}
