import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const { handleCallback, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: code arrives as a query param on window.location
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      if (error || !code) { router.replace('/(auth)/login'); return; }
      handleCallback(code)
        .then(() => router.replace('/(tabs)'))
        .catch(() => router.replace('/(auth)/login'));
    } else {
      // Native: on Android the WebBrowser result is handled directly in
      // authStore.login() — if we land here it means the deep link opened
      // the app fresh. Parse the code from the initial URL.
      Linking.getInitialURL().then((url) => {
        if (!url) { router.replace('/(auth)/login'); return; }
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code as string | undefined;
        if (!code) { router.replace('/(auth)/login'); return; }
        handleCallback(code)
          .then(() => router.replace('/(tabs)'))
          .catch(() => router.replace('/(auth)/login'));
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent.primary} />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
});
