import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  notification: string;
  error: string;
  success: string;
  warning: string;
  secondary: string;
}

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  dark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const lightColors: ThemeColors = {
  primary: '#FF2D55',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  border: '#E9ECEF',
  notification: '#FF3B30',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  secondary: '#6C757D',
};

const darkColors: ThemeColors = {
  primary: '#FF2D55',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#ADB5BD',
  border: '#2D2D2D',
  notification: '#FF453A',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  secondary: '#6C757D',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Load saved theme from AsyncStorage on initial render
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, []);

  // Update isDark based on theme and system color scheme
  useEffect(() => {
    if (theme === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme, systemColorScheme]);

  // Save theme to AsyncStorage when it changes
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('@theme', theme);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    };

    saveTheme();
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(currentTheme => {
      if (currentTheme === 'light') return 'dark';
      if (currentTheme === 'dark') return 'system';
      return 'light';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        dark: isDark,
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
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
