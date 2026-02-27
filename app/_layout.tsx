import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Custom text-based splash shown while auth is initialising
function CustomSplash({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [rendered, setRendered] = useState(true);

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Animated.View style={[splashStyles.container, { opacity }]} pointerEvents="none">
      <Text style={splashStyles.show}>Show</Text>
      <Text style={splashStyles.tivity}>tivity</Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fontsLoaded] = useFonts({});

  useEffect(() => {
    initialize();
  }, []);

  // Hide the native splash (grid icon) as soon as JS is ready — our custom
  // text splash takes over immediately after with the same background colour.
  useEffect(() => {
    if (fontsLoaded !== false) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
            {/* Custom text splash — fades out once auth finishes loading */}
            <CustomSplash visible={isLoading} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
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

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  show: {
    color: Colors.text.primary,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 54,
  },
  tivity: {
    color: Colors.accent.primary,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 54,
  },
});
