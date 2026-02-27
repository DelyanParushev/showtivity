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
  Modal,
  ScrollView,
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

// OTA update modal: checks for updates on mount, shows a centered dialog if one is available
function UpdateModal() {
  const [updateReady, setUpdateReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [changelog, setChangelog] = useState<string[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          setUpdateReady(true);
          // Fetch latest release notes from GitHub
          try {
            const res = await fetch('https://api.github.com/repos/DelyanParushev/showtivity/releases/latest');
            const json = await res.json();
            const body: string = json.body ?? '';
            // Only keep real bullet-point lines; skip headers (##), blank lines,
            // and the Install instructions block.
            const items = body
              .split('\n')
              .filter((l: string) => /^[-*]\s+/.test(l.trim()))
              .map((l: string) => l.replace(/^[-*]\s*/, '').trim())
              .filter((l: string) => l.length > 0)
              .slice(0, 8);
            setChangelog(items.length > 0 ? items : ['Bug fixes and improvements.']);
          } catch {
            setChangelog(['Bug fixes and improvements.']);
          }
        }
      } catch {
        // silently ignore — no update or no network
      }
    })();
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.iconWrap}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors.accent.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.title}>Update Available</Text>
              <Text style={modalStyles.subtitle}>A new version of Showtivity is ready</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={modalStyles.divider} />

          {/* Changelog */}
          <Text style={modalStyles.changelogTitle}>What's new</Text>
          <ScrollView style={modalStyles.changelogScroll} showsVerticalScrollIndicator={false}>
            {changelog.map((item, i) => (
              <View key={i} style={modalStyles.changelogRow}>
                <View style={modalStyles.changelogDot} />
                <Text style={modalStyles.changelogText}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Divider */}
          <View style={modalStyles.divider} />

          {/* Actions */}
          <TouchableOpacity
            style={modalStyles.primaryBtn}
            onPress={async () => {
              setLoading(true);
              await Updates.reloadAsync();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={modalStyles.primaryBtnText}>Restart & Update</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.secondaryBtn} onPress={() => setDismissed(true)}>
            <Text style={modalStyles.secondaryBtnText}>Remind Me Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
            <UpdateModal />
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

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  changelogTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  changelogScroll: {
    maxHeight: 180,
  },
  changelogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  changelogDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent.primary,
    marginTop: 6,
  },
  changelogText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
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
