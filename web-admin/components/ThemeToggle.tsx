'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/60 dark:border-slate-700" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="cursor-pointer w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md hover:-translate-y-0.5 transition-all group relative focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      aria-label="Toggle Theme"
    >
      <div className="relative w-5 h-5">
        <Sun className="absolute inset-0 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
      </div>
    </button>
  );
}
