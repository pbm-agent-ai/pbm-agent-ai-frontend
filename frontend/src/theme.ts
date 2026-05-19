export type ThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-preference';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  return theme;
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return getSystemTheme();
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
  root.dataset.theme = resolvedTheme;
}

export function persistThemePreference(theme: ThemePreference): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  applyTheme(theme);
}

export function initializeTheme(): void {
  applyTheme(getStoredThemePreference());
}
