export const THEME_STORAGE_KEY = 'theme';
const LEGACY_THEME_STORAGE_KEY = 'orthozox-theme';

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const legacyStored = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyStored === 'light' || legacyStored === 'dark') {
    return legacyStored;
  }

  return null;
}

export function resolveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyThemeToDocument(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function initTheme() {
  const theme = resolveTheme();
  applyThemeToDocument(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
