import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const { handleCallback, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // On web, Trakt redirects to http://localhost:8081/auth/callback?code=...
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.replace('/(auth)/login');
      return;
    }

    if (code) {
      handleCallback(code)
        .then(() => {
          router.replace('/(tabs)');
        })
        .catch((err) => {
          console.error('Auth callback failed:', err);
          router.replace('/(auth)/login');
        });
    } else {
      // No code — redirect back to login
      router.replace('/(auth)/login');
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
