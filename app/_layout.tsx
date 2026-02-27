import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Navigation guard: redirect to login if not authenticated
function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Allow both (auth) route group and the auth/callback page
    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && segments[1] !== 'callback') {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

const showtivityTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg.primary,
    card: Colors.bg.secondary,
    text: Colors.text.primary,
    border: Colors.border,
    primary: Colors.accent.primary,
  },
};

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fontsLoaded] = useFonts({});

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading && fontsLoaded !== false) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={showtivityTheme}>
          <StatusBar style="light" backgroundColor={Colors.bg.primary} />
          <AuthGuard />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg.primary },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen
              name="show/[id]"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: Colors.bg.secondary },
                headerTintColor: Colors.text.primary,
                headerTitle: '',
                headerBackTitle: '',
                presentation: 'card',
              }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
