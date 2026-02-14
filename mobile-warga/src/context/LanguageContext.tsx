import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { id } from '../i18n/id';
import { en } from '../i18n/en';

type Language = 'id' | 'en';
type Translations = typeof id;

// Helper to get nested object property
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj) || path;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('id');
  const [translations, setTranslations] = useState<Translations>(id);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user_language');
      if (savedLanguage === 'en' || savedLanguage === 'id') {
        setLanguageState(savedLanguage);
        setTranslations(savedLanguage === 'en' ? en : id);
      }
    } catch (error) {
      console.error('Failed to load language', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      setTranslations(lang === 'en' ? en : id);
      await AsyncStorage.setItem('user_language', lang);
    } catch (error) {
      console.error('Failed to save language', error);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations, key);
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
