import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      id="global-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode (CSS variables update)' : 'Switch to dark mode (CSS variables update)'}
      className={`relative inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs border select-none group ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700 hover:border-slate-600'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transform transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transform transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {showLabel && (
        <span className="hidden sm:inline font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
