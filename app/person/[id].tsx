import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getTmdbPersonDetails, getTmdbPersonCredits } from '../../services/traktApi';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { TMDB_CONFIG } from '../../config/trakt';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const birth = new Date(birthday);
  const age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    return age - 1;
  }
  return age;
}

function formatBirthday(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

const GENDER_MAP: Record<number, string> = { 1: 'Female', 2: 'Male', 3: 'Non-binary' };

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PersonScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const [bioExpanded, setBioExpanded] = useState(false);

  const personId = id ? parseInt(id, 10) : undefined;

  const { data: person, isLoading } = useQuery({
    queryKey: ['tmdbPerson', personId],
    queryFn: () => getTmdbPersonDetails(personId!, TMDB_CONFIG.API_KEY),
    enabled: !!personId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ['tmdbPersonCredits', personId],
    queryFn: () => getTmdbPersonCredits(personId!, TMDB_CONFIG.API_KEY),
    enabled: !!personId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  React.useEffect(() => {
    navigation.setOptions({ headerTitle: person?.name ?? name ?? 'Actor' });
  }, [person, name]);

  if (isLoading || !person) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const age = calcAge(person.birthday, person.deathday);
  const genderLabel = person.gender ? GENDER_MAP[person.gender] ?? null : null;
  const profileUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : null;

  const details: { label: string; value: string }[] = [
    age !== null
      ? {
          label: person.deathday ? 'Age at death' : 'Age',
          value: `${age}`,
        }
      : null,
    genderLabel ? { label: 'Gender', value: genderLabel } : null,
    person.birthday
      ? {
          label: 'Birthday',
          value: formatBirthday(person.birthday),
        }
      : null,
    person.deathday ? { label: 'Died', value: formatBirthday(person.deathday) } : null,
    person.place_of_birth ? { label: 'Birthplace', value: person.place_of_birth } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const bioLines = person.biography ? person.biography.split('\n\n') : [];
  const bioPreview = bioLines.slice(0, 2).join('\n\n');
  const hasBioMore = bioLines.length > 2 || person.biography.length > 600;
  const bioText = bioExpanded || !hasBioMore ? person.biography : bioPreview;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ─────────────────────────────────── */}
        <View style={styles.hero}>
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={styles.profilePhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.profilePhoto, styles.profileFallback]}>
              <Ionicons name="person" size={52} color={Colors.text.muted} />
            </View>
          )}
          <View style={styles.heroInfo}>
            <Text style={styles.personName}>{person.name}</Text>
            {person.known_for_department ? (
              <View style={styles.deptBadge}>
                <Ionicons name="film-outline" size={12} color={Colors.accent.primary} />
                <Text style={styles.deptText}>{person.known_for_department}</Text>
              </View>
            ) : null}
            {age !== null && (
              <Text style={styles.ageLine}>
                {person.deathday
                  ? `${formatBirthday(person.birthday)} – ${formatBirthday(person.deathday)} · Aged ${age}`
                  : `Age ${age}`}
              </Text>
            )}
          </View>
        </View>

        {/* ── Quick Facts ────────────────────────────────────── */}
        {details.length > 0 && (
          <View style={styles.section}>
            <View style={styles.detailsCard}>
              {details.map((d, i) => (
                <View
                  key={d.label}
                  style={[styles.detailRow, i < details.length - 1 && styles.detailRowBorder]}
                >
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Biography ─────────────────────────────────────── */}
        {person.biography ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.bioText}>{bioText}</Text>
            {hasBioMore && (
              <TouchableOpacity
                onPress={() => setBioExpanded((v) => !v)}
                style={styles.readMoreBtn}
              >
                <Text style={styles.readMoreText}>
                  {bioExpanded ? 'Show less' : 'Read more'}
                </Text>
                <Ionicons
                  name={bioExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.accent.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* ── TV Credits ────────────────────────────────────── */}
        {(credits.length > 0 || creditsLoading) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {creditsLoading ? 'Shows' : `Shows (${credits.length})`}
            </Text>
            {creditsLoading ? (
              <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: 12 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.creditsList}
              >
                {credits.map((credit) => (
                  <View key={`${credit.id}-${credit.character}`} style={styles.creditCard}>
                    {credit.posterUrl ? (
                      <Image
                        source={{ uri: credit.posterUrl }}
                        style={styles.creditPoster}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.creditPoster, styles.creditPosterFallback]}>
                        <Ionicons name="tv-outline" size={22} color={Colors.text.muted} />
                      </View>
                    )}
                    <Text style={styles.creditTitle} numberOfLines={2}>
                      {credit.name}
                    </Text>
                    {credit.character ? (
                      <Text style={styles.creditCharacter} numberOfLines={1}>
                        {credit.character}
                      </Text>
                    ) : null}
                    <View style={styles.creditMeta}>
                      {credit.first_air_date ? (
                        <Text style={styles.creditMetaText}>
                          {credit.first_air_date.slice(0, 4)}
                        </Text>
                      ) : null}
                      {credit.episode_count > 0 ? (
                        <Text style={styles.creditMetaText}>
                          {credit.first_air_date ? ' · ' : ''}{credit.episode_count} ep{credit.episode_count !== 1 ? 's' : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 48,
  },
  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  profilePhoto: {
    width: 110,
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  profileFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    paddingTop: 4,
    gap: Spacing.sm,
  },
  personName: {
    color: Colors.text.primary,
    fontSize: Typography['2xl'],
    fontWeight: '800',
    lineHeight: 28,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.muted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  deptText: {
    color: Colors.accent.primary,
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  ageLine: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  // Section
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
  // Details grid
  detailsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    minWidth: 80,
  },
  detailValue: {
    color: Colors.text.primary,
    fontSize: Typography.sm,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  // Bio
  bioText: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    lineHeight: 24,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: Colors.accent.primary,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  // Credits
  creditsList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  creditCard: {
    width: 100,
    alignItems: 'center',
    gap: 5,
  },
  creditPoster: {
    width: 90,
    height: 134,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  creditPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditInfo: {
    flex: 1,
    gap: 3,
  },
  creditTitle: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  creditCharacter: {
    color: Colors.text.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
  creditMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  creditMetaText: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  creditMetaDot: {
    color: Colors.text.muted,
    fontSize: 10,
  },
});
