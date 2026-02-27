import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import { useAuthStore } from '../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
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

// OTA update banner: checks for updates on mount, prompts user if one is available
function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          setUpdateReady(true);
        }
      } catch {
        // silently ignore — no update or no network
      }
    })();
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <View style={bannerStyles.banner}>
      <Ionicons name="cloud-download-outline" size={18} color="#fff" />
      <Text style={bannerStyles.text}>A new update is ready!</Text>
      <TouchableOpacity
        style={bannerStyles.installBtn}
        onPress={async () => {
          setLoading(true);
          await Updates.reloadAsync();
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={bannerStyles.installText}>Restart</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </View>
  );
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
          <UpdateBanner />
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

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#2563eb',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  installBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  installText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: '700',
  },
});
