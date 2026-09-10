import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_VARIABLES = {
  light: {
    '--color-primary': '#4f46e5',
    '--color-primary-dark': '#4338ca',
    '--color-primary-light': '#eef2ff',
    '--color-bg-base': '#f8fafc',
    '--color-surface': '#ffffff',
    '--color-surface-elevated': '#f1f5f9',
    '--color-border': '#e2e8f0',
    '--color-border-subtle': '#f1f5f9',
    '--color-text-main': '#0f172a',
    '--color-text-muted': '#64748b',
    '--color-card-bg': '#ffffff',
    '--color-card-border': '#e2e8f0',
    '--color-navbar-bg': 'rgba(255, 255, 255, 0.9)',
    '--color-input-bg': '#f8fafc',
  },
  dark: {
    '--color-primary': '#6366f1',
    '--color-primary-dark': '#818cf8',
    '--color-primary-light': '#1e1b4b',
    '--color-bg-base': '#090d16',
    '--color-surface': '#0f172a',
    '--color-surface-elevated': '#1e293b',
    '--color-border': '#1e293b',
    '--color-border-subtle': 'rgba(30, 41, 59, 0.5)',
    '--color-text-main': '#f8fafc',
    '--color-text-muted': '#94a3b8',
    '--color-card-bg': '#0f172a',
    '--color-card-border': '#1e293b',
    '--color-navbar-bg': 'rgba(15, 23, 42, 0.9)',
    '--color-input-bg': '#1e293b',
  },
} as const;

export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const applyThemeCssVariables = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';

  // Update classes and data attributes
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  // Update CSS custom properties on document root
  const variables = THEME_VARIABLES[theme];
  Object.entries(variables).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  // Update theme-color meta tag for mobile browsers
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', isDark ? '#090d16' : '#f8fafc');

  // Dispatch custom event for WebGL backgrounds and canvas
  window.dispatchEvent(new CustomEvent('toolver-theme-change', { detail: { theme, isDark } }));
};

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('toolver_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('toolver_theme', newTheme);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage:', e);
    }
    applyThemeCssVariables(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Initial application of CSS variables
    applyThemeCssVariables(theme);

    // Watch for OS preference change if user hasn't explicitly set a preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('toolver_theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
