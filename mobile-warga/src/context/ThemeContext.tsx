import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryLight: string;
  danger: string;
  success: string;
  warning: string;
  inputBackground: string;
  tabBar: string;
  header: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: '#f8f9fa', // Slate-50 - Neutral for Fintech look
  card: '#ffffff',
  text: '#0F172A', // Slate-900
  textSecondary: '#64748B', // Slate-500
  border: '#E2E8F0',
  primary: '#059669', // Emerald-600 (Primary Green)
  primaryLight: '#D1FAE5', // Emerald-100
  danger: '#EF4444',
  success: '#10b981', // Emerald-500
  warning: '#F59E0B',
  inputBackground: '#ffffff',
  tabBar: '#ffffff',
  header: '#ffffff',
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  background: '#020617', // Slate-950 - Deep dark
  card: '#1E293B', // Slate-800
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  primary: '#059669', // Emerald-600 (Brighter for dark mode)
  primaryLight: '#064E3B',
  danger: '#F87171',
  success: '#059669', // Emerald-600
  warning: '#FBBF24',
  inputBackground: '#1E293B',
  tabBar: '#0F172A',
  header: '#0F172A',
  shadow: '#000000',
};

interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDarkMode: false,
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('app_theme');
      if (storedTheme) {
        setThemeState(storedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme', error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, colors: isDarkMode ? darkColors : lightColors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
