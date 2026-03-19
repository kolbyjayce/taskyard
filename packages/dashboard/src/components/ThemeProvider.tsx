import React from 'react';
import { ThemeContext, useThemeLogic } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeProps = useThemeLogic();

  return (
    <ThemeContext.Provider value={themeProps}>
      {children}
    </ThemeContext.Provider>
  );
}