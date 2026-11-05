import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Locale = 'en' | 'zh';
type Theme = 'light' | 'dark';
function read<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try { const value = localStorage.getItem(key) as T; return values.includes(value) ? value : fallback; } catch { return fallback; }
}
const Context = createContext({
  locale: 'en' as Locale, theme: 'light' as Theme,
  setLocale: (_: Locale) => {}, setTheme: (_: Theme) => {},
  origin: { x: 90, y: 5 }, setOrigin: (_: { x: number; y: number }) => {},
});
export const useLandingPreferences = () => useContext(Context);
export function LandingPreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => read('landing-locale', ['en', 'zh'], 'en'));
  const [theme, setTheme] = useState<Theme>(() => read('landing-theme', ['light', 'dark'], 'light'));
  const [origin, setOrigin] = useState({ x: 90, y: 5 });
  useEffect(() => { try { localStorage.setItem('landing-locale', locale); localStorage.setItem('landing-theme', theme); } catch { /* Storage can be unavailable in private contexts. */ } }, [locale, theme]);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return <Context.Provider value={{ locale, theme, setLocale, setTheme, origin, setOrigin }}>{children}</Context.Provider>;
}
