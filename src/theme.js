import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4A90E2',
    secondary: '#50C878',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#2C3E50',
    error: '#E74C3C',
    warning: '#F39C12',
    success: '#27AE60',
    accent: '#9B59B6',
    // 确保 elevation 配置完整
    elevation: {
      level0: 'transparent',
      level1: 'rgb(247, 243, 249)',
      level2: 'rgb(243, 237, 247)',
      level3: 'rgb(238, 232, 244)',
      level4: 'rgb(236, 230, 242)',
      level5: 'rgb(233, 227, 240)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

