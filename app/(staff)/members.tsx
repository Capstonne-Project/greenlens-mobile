import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import type { TeamProfile } from '@/types/cleanup-assignment.types';

// ─── Member row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  fullName: string;
  email: string;
  isLeader: boolean;
  index: number;
}

function MemberRow({ fullName, email, isLeader, index }: MemberRowProps) {
  const initial = fullName.trim()[0]?.toUpperCase() ?? '?';
  const avatarColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
  const avatarBg = avatarColors[index % avatarColors.length] ?? colors.primary;

  return (
    <View className="flex-row items-center px-4 py-3.5">
      {/* Avatar */}
      <View
        className="mr-3 h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: avatarBg }}
      >
        <Text className="text-base font-bold text-white">{initial}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-semibold text-textPrimary">{fullName}</Text>
          {isLeader && (
            <View className="flex-row items-center gap-0.5 rounded-full px-2 py-0.5" style={{ backgroundColor: '#ECFDF5' }}>
              <Ionicons name="star" size={10} color={colors.primary} />
              <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>Trưởng nhóm</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-textSecondary" numberOfLines={1}>{email}</Text>
      </View>

      {/* Status dot — online placeholder */}
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.border }} />
    </View>
  );
}

function MemberRowSkeleton() {
  return (
    <View className="flex-row items-center px-4 py-3.5">
      <View className="mr-3 h-11 w-11 rounded-full bg-surface" />
      <View className="flex-1 gap-1.5">
        <View className="h-4 w-32 rounded bg-border" />
        <View className="h-3 w-44 rounded bg-surface" />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StaffMembersScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile]   = useState<TeamProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cleanupAssignmentService.getTeamProfile();
      setProfile(res.data.data);
    } catch {
      setError('Không thể tải thông tin nhóm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile().catch(() => undefined); }, [loadProfile]);

  const leaders = profile?.members.filter((m) => m.isLeader) ?? [];
  const members = profile?.members.filter((m) => !m.isLeader) ?? [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pb-3 pt-3">
        <Text className="text-2xl font-bold text-textPrimary">Nhóm của tôi</Text>
        {profile && (
          <View className="mt-1 flex-row items-center gap-1.5">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: profile.isActive ? colors.primary : colors.border }}
            />
            <Text className="text-sm text-textSecondary">
              {profile.name} · {profile.teamType}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Team info skeleton */}
          <View className="mx-4 mb-4 rounded-2xl bg-white p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}>
            <View className="h-4 w-40 rounded bg-border" />
            <View className="mt-2 h-3 w-24 rounded bg-surface" />
          </View>
          {/* Members skeleton */}
          <View className="mx-4 rounded-2xl bg-white" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}>
            {[0, 1, 2, 3].map((n, i) => (
              <View key={n}>
                <MemberRowSkeleton />
                {i < 3 && <View className="ml-[76px] h-px bg-border" />}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
          <Text className="mt-3 text-base font-semibold text-textPrimary">{error}</Text>
          <Pressable
            onPress={loadProfile}
            className="mt-4 rounded-xl px-6 py-2.5"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Team info card */}
          <View
            className="mx-4 mb-4 rounded-2xl bg-white p-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-bold text-textPrimary">{profile.name}</Text>
                <Text className="mt-0.5 text-sm text-textSecondary">{profile.teamType} team</Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: profile.isActive ? '#ECFDF5' : '#F3F4F6' }}
              >
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: profile.isActive ? colors.primary : colors.textDisabled }}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: profile.isActive ? colors.primary : colors.textSecondary }}
                >
                  {profile.isActive ? 'Hoạt động' : 'Tạm dừng'}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View className="mt-3 flex-row gap-4">
              <View className="items-center">
                <Text className="text-xl font-bold text-textPrimary">{profile.members.length}</Text>
                <Text className="text-[11px] text-textSecondary">Thành viên</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center">
                <Text className="text-xl font-bold text-textPrimary">{leaders.length}</Text>
                <Text className="text-[11px] text-textSecondary">Trưởng nhóm</Text>
              </View>
            </View>
          </View>

          {/* Leaders section */}
          {leaders.length > 0 && (
            <View
              className="mx-4 mb-4 rounded-2xl bg-white"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}
            >
              <View className="px-4 pb-1 pt-3">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                  Trưởng nhóm
                </Text>
              </View>
              {leaders.map((m, i) => (
                <View key={m.userId}>
                  <MemberRow fullName={m.fullName} email={m.email} isLeader={m.isLeader} index={i} />
                  {i < leaders.length - 1 && <View className="ml-[76px] h-px bg-border" />}
                </View>
              ))}
            </View>
          )}

          {/* Members section */}
          {members.length > 0 && (
            <View
              className="mx-4 rounded-2xl bg-white"
              style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}
            >
              <View className="px-4 pb-1 pt-3">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                  Thành viên ({members.length})
                </Text>
              </View>
              {members.map((m, i) => (
                <View key={m.userId}>
                  <MemberRow fullName={m.fullName} email={m.email} isLeader={m.isLeader} index={i + leaders.length} />
                  {i < members.length - 1 && <View className="ml-[76px] h-px bg-border" />}
                </View>
              ))}
            </View>
          )}

          {profile.members.length === 0 && (
            <View className="flex-1 items-center justify-center py-16 px-6">
              <Ionicons name="people-outline" size={56} color={colors.textDisabled} />
              <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có thành viên</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
