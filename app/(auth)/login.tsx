import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { TRAKT_CONFIG } from '../../config/trakt';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, handleCallback, isLoading } = useAuthStore();
  const router = useRouter();

  // Handle OAuth redirect on native
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      if (code) {
        await handleCallback(code);
      }
    });
    return () => sub.remove();
  }, []);

  // Handle OAuth redirect on web (check URL params on mount)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleCallback(code).catch(console.error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.bgAccent} />

      {/* Logo / Brand */}
      <View style={styles.brandSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="tv" size={52} color={Colors.accent.primary} />
        </View>
        <Text style={styles.appName}>Showtivity</Text>
        <Text style={styles.tagline}>
          Track your shows. Never miss an episode.
        </Text>
      </View>

      {/* Features list */}
      <View style={styles.featuresSection}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: feature.color + '22' },
              ]}
            >
              <Ionicons
                name={feature.icon as any}
                size={18}
                color={feature.color}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.accent.primary} />
        ) : (
          <>
            <TouchableOpacity style={styles.loginBtn} onPress={login}>
              <View style={styles.traktLogo}>
                <Text style={styles.traktLogoText}>T</Text>
              </View>
              <Text style={styles.loginBtnText}>Connect with Trakt</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              You'll be redirected to trakt.tv to authorize Showtivity.{'\n'}
              Your credentials are never stored by this app.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://trakt.tv/join')}
              style={styles.signupLink}
            >
              <Text style={styles.signupLinkText}>
                Don't have a Trakt account? Sign up for free →
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    title: 'Track everything',
    desc: 'Currently watching, watchlist, and history synced with Trakt',
    icon: 'checkmark-circle',
    color: Colors.status.watching,
  },
  {
    title: 'Never miss an episode',
    desc: 'Countdown timers for all your running shows',
    icon: 'time',
    color: Colors.status.running,
  },
  {
    title: 'Discover new shows',
    desc: 'Search and add shows directly to your Trakt watchlist',
    icon: 'search',
    color: Colors.status.watchlist,
  },
  {
    title: 'Stay organised',
    desc: 'Shows sorted by status: running, waiting, ended',
    icon: 'albums',
    color: Colors.status.waiting,
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    paddingHorizontal: Spacing['2xl'],
  },
  bgAccent: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.accent.primary,
    opacity: 0.07,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: Colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent.primary + '40',
  },
  appName: {
    color: Colors.text.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  tagline: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    flex: 1,
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  ctaSection: {
    paddingBottom: 40,
    gap: Spacing.md,
    alignItems: 'center',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['3xl'],
    width: '100%',
    gap: Spacing.sm,
  },
  traktLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  traktLogoText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  disclaimer: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  signupLink: {
    padding: Spacing.sm,
  },
  signupLinkText: {
    color: Colors.accent.primary,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
});
