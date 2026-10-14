import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  localeFor,
  translate,
  type Language,
  type TranslationKey,
} from '../i18n/translations';
import { THEME_COLOR } from '../pwa/manifest';
import { loadSettings, saveSetting, type KeyValueStore } from '../services/storage/storage';

export type Theme = 'light' | 'dark';

export interface Preferences {
  language: Language;
  /** BCP 47 locale for number and date formatting, e.g. `lo-LA`. */
  locale: string;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const PreferencesContext = createContext<Preferences | null>(null);

function systemTheme(): Theme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function PreferencesProvider({ store, children }: { store: KeyValueStore | null; children: ReactNode }) {
  const [initial] = useState(() => loadSettings(store));
  const [language, setLanguageState] = useState<Language>(() =>
    isLanguage(initial.language) ? initial.language : DEFAULT_LANGUAGE,
  );
  const [theme, setThemeState] = useState<Theme>(() =>
    initial.theme === 'light' || initial.theme === 'dark' ? initial.theme : systemTheme(),
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    // Match the browser / installed-app title bar to the chosen theme.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#172029' : THEME_COLOR);
  }, [theme]);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      saveSetting(store, 'language', next);
    },
    [store],
  );

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      saveSetting(store, 'theme', next);
    },
    [store],
  );

  const value = useMemo<Preferences>(
    () => ({
      language,
      locale: localeFor(language),
      setLanguage,
      theme,
      setTheme,
      t: (key, vars) => translate(language, key, vars),
    }),
    [language, setLanguage, theme, setTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
