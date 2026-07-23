import { TextStyle } from 'react-native';

export const theme = {
  colors: {
    primary: '#06C26F',
    primaryDark: '#00AC62',
    dark: '#3E3E3E',
    darkLight: '#E1E1E1',
    gray: '#e3e3e3',

    text: '#494949',
    textLight: '#7C7C7C',
    textDark: '#1D1D1D',

    rose: '#ef4444',
    roseLight: '#f87171',
  },

  fonts: {
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
  },

  radius: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
  },
};