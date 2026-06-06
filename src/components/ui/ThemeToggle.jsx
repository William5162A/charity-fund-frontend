import React from 'react';
import { useThemeContext } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb">
          <span className="theme-toggle__icon theme-toggle__icon--sun">☀️</span>
          <span className="theme-toggle__icon theme-toggle__icon--moon">🌙</span>
        </span>
      </span>
      <span className="theme-toggle__label sr-only">
        {isDark ? 'الوضع الداكن' : 'الوضع الفاتح'}
      </span>
    </button>
  );
}
