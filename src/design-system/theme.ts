import { Platform } from 'react-native';

const fontFamily = Platform.select({ android: 'sans-serif', ios: 'System' });
const colors = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF0F8',
  text: '#1B1B2F',
  muted: '#55566B',
  primary: '#4338CA',
  primaryContainer: '#E8E5FF',
  onPrimaryContainer: '#302477',
  border: '#C5C5D5',
  outline: '#767589',
  error: '#A32632',
  errorContainer: '#FFF0F1',
  success: '#196438',
  successContainer: '#EAF7EE',
  disabled: '#E3E3EA',
  onDisabled: '#5F6070',
} as const;
export const theme = {
  colors,
  spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
  typography: { title: 28, body: 16 },
  text: {
    title: {
      fontFamily,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      color: colors.text,
    },
    heading: {
      fontFamily,
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '700',
      color: colors.text,
    },
    body: { fontFamily, fontSize: 16, lineHeight: 24, color: colors.text },
    label: {
      fontFamily,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.muted,
    },
    button: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  },
  maxContentWidth: 720,
} as const;
