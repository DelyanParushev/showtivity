import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useCategorizedShows, useAllShows } from '../../hooks/useShows';
import { useRouter } from 'expo-router';
import { formatAirDate } from '../../utils/dateUtils';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { watching, watchlist, running, waiting, ended, refetch } = useCategorizedShows();
  const { data: allShows = [] } = useAllShows();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out and disconnect from Trakt?')) {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to disconnect from Trakt?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const handleSync = async () => {
    await refetch();
  };

  const handleCheckForUpdates = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Updates', 'OTA updates are only available on the mobile app.');
      return;
    }
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          '🚀 Update Ready',
          'A new version has been downloaded. Restart now to apply it.',
          [
            { text: 'Remind Me Later', style: 'cancel' },
            { text: 'Restart Now', style: 'default', onPress: () => Updates.reloadAsync() },
          ]
        );
      } else {
        Alert.alert('✓ Up to Date', 'You are already on the latest version.');
      }
    } catch {
      Alert.alert('Error', 'Could not check for updates. Please try again later.');
    }
  };

  const totalShows = allShows.length;
  const totalWatching = watching.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.images?.avatar?.full ? (
              <Image
                source={{ uri: user.images.avatar.full }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={32} color={Colors.text.muted} />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || user?.username}</Text>
            <Text style={styles.userHandle}>@{user?.username}</Text>
            {user?.joined_at && (
              <Text style={styles.joinedDate}>
                Trakt member since {formatAirDate(user.joined_at)}
              </Text>
            )}
            {user?.vip && (
              <View style={styles.vipBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Shows"
              value={totalShows}
              icon="albums"
              color={Colors.accent.primary}
            />
            <StatCard
              label="Watching"
              value={totalWatching}
              icon="play-circle"
              color={Colors.status.watching}
            />
            <StatCard
              label="Watchlist"
              value={watchlist.length}
              icon="bookmark"
              color={Colors.status.watchlist}
            />
            <StatCard
              label="Running"
              value={running.length}
              icon="tv"
              color={Colors.status.running}
            />
            <StatCard
              label="Waiting"
              value={waiting.length}
              icon="hourglass"
              color={Colors.status.waiting}
            />
            <StatCard
              label="Ended"
              value={ended.length}
              icon="archive"
              color={Colors.status.ended}
            />
          </View>
        </View>

        {/* Settings / Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuList}>
            <MenuItem
              icon="refresh"
              label="Sync with Trakt"
              onPress={handleSync}
              color={Colors.status.watching}
            />
            {Platform.OS !== 'web' && (
              <MenuItem
                icon="cloud-download-outline"
                label="Check for Updates"
                onPress={handleCheckForUpdates}
                color={Colors.status.running}
              />
            )}
            <MenuItem
              icon="open-outline"
              label="Open Trakt Profile"
              onPress={() => {
                const { Linking } = require('react-native');
                Linking.openURL(`https://trakt.tv/users/${user?.username}`);
              }}
              color={Colors.text.secondary}
            />
            <MenuItem
              icon="bug-outline"
              label="Report an Issue"
              onPress={() => {
                const { Linking } = require('react-native');
                Linking.openURL('https://github.com/your-repo/issues');
              }}
              color={Colors.text.secondary}
            />
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.accent.primary} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Showtivity v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.text.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.text.primary,
    fontSize: Typography['2xl'],
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bg.elevated,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    color: Colors.text.primary,
    fontSize: Typography.xl,
    fontWeight: '700',
  },
  userHandle: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  joinedDate: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f59e0b22',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  vipText: {
    color: '#f59e0b',
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '31%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  menuList: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.base,
  },
  setupCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.status.waiting,
    gap: Spacing.sm,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  setupTitle: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  setupText: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  setupLink: {
    alignSelf: 'flex-start',
  },
  setupLinkText: {
    color: Colors.status.waiting,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent.muted,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent.primary + '40',
  },
  signOutText: {
    color: Colors.accent.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  version: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
