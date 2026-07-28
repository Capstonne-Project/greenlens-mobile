import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import type { TeamProfile } from '@/types/cleanup-assignment.types';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

/** Màu ổn định theo userId — không đổi khi list re-sort giữa leader/member */
function avatarColorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? colors.primary;
}

// ─── Member row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  userId: string;
  fullName: string;
  email: string;
  isLeader: boolean;
}

function MemberRow({ userId, fullName, email, isLeader }: MemberRowProps) {
  const initial = fullName.trim()[0]?.toUpperCase() ?? '?';
  const avatarBg = avatarColorFor(userId);

  return (
    <View className="flex-row items-center px-4 py-3.5">
      <View
        className="mr-3 h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: avatarBg,
          borderWidth: isLeader ? 2 : 0,
          borderColor: '#FDE047',
        }}
      >
        <Text className="text-base font-bold text-white">{initial}</Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-semibold text-textPrimary">{fullName}</Text>
          {isLeader && (
            <View
              className="flex-row items-center gap-0.5 rounded-full px-2 py-0.5"
              style={{ backgroundColor: '#FEF3E2' }}
            >
              <Ionicons name="star" size={10} color={colors.warning} />
              <Text className="text-[10px] font-bold" style={{ color: '#92400E' }}>
                Trưởng nhóm
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-textSecondary" numberOfLines={1}>
          {email}
        </Text>
      </View>
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

// ─── Reusable state card (error / empty) ───────────────────────────────────────

function InfoStateCard({
  icon,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-full items-center rounded-[28px] bg-white px-6 py-9"
        style={{
          shadowColor: '#0F172A',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        }}
      >
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.surface }}
        >
          <Ionicons name={icon} size={30} color={iconColor} />
        </View>
        <Text className="text-center text-base font-semibold text-textPrimary">{title}</Text>
        <Text className="mt-1.5 text-center text-sm leading-5 text-textSecondary">{message}</Text>

        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            className="mt-5 rounded-xl px-6 py-2.5"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="font-semibold text-white">{actionLabel}</Text>
          </Pressable>
        ) : null}
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
  const [hasNoTeam, setHasNoTeam] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasNoTeam(false);
    try {
      const res = await cleanupAssignmentService.getTeamProfile();
      setProfile(res.data.data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setHasNoTeam(true);
      } else {
        setError('Không thể tải thông tin nhóm.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile().catch(() => undefined); }, [loadProfile]);

  const leaders = profile?.members.filter((m) => m.isLeader) ?? [];
  const members = profile?.members.filter((m) => !m.isLeader) ?? [];

  return (
    <View className="flex-1 bg-white">
      <View
        className="border-b border-border px-5"
        style={{ paddingTop: insets.top + 16, paddingBottom: 18 }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="people" size={22} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text
              className="text-[11px] font-bold uppercase text-textSecondary"
              style={{ letterSpacing: 1.5 }}
            >
              Đội của tôi
            </Text>
            <Text className="mt-0.5 text-xl font-bold text-textPrimary" numberOfLines={1}>
              {profile ? profile.name : 'Nhóm của tôi'}
            </Text>
          </View>
        </View>

        {profile ? (
          <View className="mt-3 flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: profile.isActive ? colors.primary : colors.textDisabled }}
              />
              <Text className="text-xs font-semibold text-textSecondary">
                {profile.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
              </Text>
            </View>
            <View className="rounded-full bg-surface px-3 py-1.5">
              <Text className="text-xs font-semibold text-textSecondary">{profile.teamType}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="mx-4 mb-4 mt-4 rounded-2xl bg-white p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }}>
            <View className="h-4 w-40 rounded bg-border" />
            <View className="mt-2 h-3 w-24 rounded bg-surface" />
          </View>
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
        <InfoStateCard
          icon="alert-circle-outline"
          iconColor={colors.error}
          title="Đã xảy ra lỗi"
          message={error}
          actionLabel="Thử lại"
          onAction={() => void loadProfile()}
        />
      ) : hasNoTeam ? (
        <InfoStateCard
          icon="people-outline"
          iconColor={colors.textSecondary}
          title="Chưa có nhóm"
          message="Bạn chưa được thêm vào đội nào. Khi LEO mời bạn tham gia và bạn chấp nhận, thông tin đội sẽ hiển thị ở đây."
        />
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          style={{ backgroundColor: colors.surface }}
        >
          {/* Stats card */}
          <View
            className="mx-4 mb-4 mt-4 flex-row overflow-hidden rounded-2xl bg-white"
            style={{ elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16 }}
          >
            <View className="flex-1 items-center gap-1 py-4">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.surface }}
              >
                <Ionicons name="people" size={17} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold text-textPrimary">{profile.members.length}</Text>
              <Text className="text-[11px] text-textSecondary">Thành viên</Text>
            </View>
            <View className="w-px bg-border" />
            <View className="flex-1 items-center gap-1 py-4">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: '#FEF3E2' }}
              >
                <Ionicons name="star" size={17} color={colors.warning} />
              </View>
              <Text className="text-lg font-bold text-textPrimary">{leaders.length}</Text>
              <Text className="text-[11px] text-textSecondary">Trưởng nhóm</Text>
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
                  <MemberRow userId={m.userId} fullName={m.fullName} email={m.email} isLeader={m.isLeader} />
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
                  <MemberRow userId={m.userId} fullName={m.fullName} email={m.email} isLeader={m.isLeader} />
                  {i < members.length - 1 && <View className="ml-[76px] h-px bg-border" />}
                </View>
              ))}
            </View>
          )}

          {profile.members.length === 0 && (
            <InfoStateCard
              icon="people-outline"
              iconColor={colors.textDisabled}
              title="Chưa có thành viên"
              message="Đội này hiện chưa có thành viên nào."
            />
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
