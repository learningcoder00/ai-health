import { MD3LightTheme } from 'react-native-paper';

/**
 * 设计系统（轻量版）
 * - 目标：统一全局色板/圆角/间距/阴影，让各页面视觉一致且更现代
 * - 注意：在 Paper MD3 主题基础上扩展了一些自定义字段（spacing/borderRadius/shadow）
 */
export const theme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,

    // Brand
    primary: '#2563EB',
    secondary: '#10B981',
    accent: '#A855F7',

    // Surfaces
    background: '#F6F7FB',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',

    // Text
    text: '#0F172A',
    textSecondary: '#64748B',

    // Semantic
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#22C55E',

    // Borders
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',

    // 确保 elevation 配置完整（部分组件依赖）
    elevation: {
      level0: 'transparent',
      level1: 'rgb(247, 243, 249)',
      level2: 'rgb(243, 237, 247)',
      level3: 'rgb(238, 232, 244)',
      level4: 'rgb(236, 230, 242)',
      level5: 'rgb(233, 227, 240)',
    },
  },

  // 自定义布局 token（业务侧 StyleSheet 直接复用）
  spacing: {
    xxs: 2,
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
  },
  shadow: {
    // iOS shadow + Android elevation（按需在各 Screen 使用）
    color: 'rgba(15, 23, 42, 0.12)',
    colorStrong: 'rgba(15, 23, 42, 0.18)',
  },
};

