import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#e0e8ff',
      100: '#b8c7ff',
      200: '#8da6ff',
      300: '#6285ff',
      400: '#3b64ff',
      500: '#1a45e6',
      600: '#0c36b4',
      700: '#002782',
      800: '#001852',
      900: '#000a24',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#0F172A',
        color: 'white',
      },
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: '#1E293B',
          borderRadius: 'xl',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    Button: {
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'rgba(26, 69, 230, 0.1)',
          },
        },
      },
    },
  },
});

export default theme;
