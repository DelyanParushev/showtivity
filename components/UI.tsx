import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import type { CategoryConfig } from '../constants/theme';

interface SectionHeaderProps {
  title: string;
  count: number;
  color: string;
  icon: string;
  expanded?: boolean;
  onToggle?: () => void;
  filterLabel?: string;
  onFilter?: () => void;
}

export function SectionHeader({
  title,
  count,
  color,
  icon,
  filterLabel,
  onFilter,
}: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconContainer, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.badgeText, { color }]}>{count}</Text>
      </View>
      {onFilter && (
        <TouchableOpacity
          onPress={onFilter}
          style={[styles.filterBtn, filterLabel !== 'All' && { backgroundColor: color + '22', borderColor: color + '55' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={13} color={filterLabel !== 'All' ? color : Colors.text.muted} />
          <Text style={[styles.filterBtnText, { color: filterLabel !== 'All' ? color : Colors.text.muted }]}>
            {filterLabel ?? 'All'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface EmptyStateProps {
  icon: string;
  message: string;
  subMessage?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, message, subMessage, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={40} color={Colors.text.muted} />
      <Text style={styles.emptyMessage}>{message}</Text>
      {subMessage && (
        <Text style={styles.emptySubMessage}>{subMessage}</Text>
      )}
      {action && (
        <TouchableOpacity style={styles.emptyAction} onPress={action.onPress}>
          <Text style={styles.emptyActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.accent.primary} />
      {label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    marginLeft: Spacing.xs,
  },
  filterBtnText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyMessage: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubMessage: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyAction: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing['3xl'],
  },
  loadingLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
  },
});
