import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { colors } from '@/theme/colors';
import type { AssignmentStats } from '@/types/cleanup-assignment.types';

// --- StatCard ---
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const StatCard = React.memo(function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <View className="flex-1 items-center justify-center rounded-2xl py-4" style={{ backgroundColor: bgColor }}>
      <Text className="text-2xl font-bold" style={{ color }}>{value}</Text>
      <Text className="mt-0.5 text-center text-xs text-textSecondary" numberOfLines={2}>{label}</Text>
    </View>
  );
});

// --- Urgent Banner ---
function UrgentBanner({ count, deadline, onPress }: { count: number; deadline: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={onPress}
        className="mx-4 mb-4 flex-row items-center rounded-2xl px-4 py-3"
        style={{ backgroundColor: '#FEF3C7' }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#F59E0B' }}>
          <Ionicons name="time-outline" size={20} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: '#92400E' }}>
            {count} task cần phản hồi trong 2 giờ
          </Text>
          <Text className="text-xs" style={{ color: '#B45309' }}>
            Nhận hoặc từ chối trước {deadline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B45309" />
      </Pressable>
    </Animated.View>
  );
}

// --- Officer Message ---
interface OfficerMessageProps {
  name: string;
  message: string;
  time: string;
  isOnline?: boolean;
}

function OfficerMessage({ name, message, time, isOnline = false }: OfficerMessageProps) {
  return (
    <View className="flex-row items-start py-3">
      <View className="relative mr-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Text className="text-xs font-bold text-white">{name[0]}</Text>
        </View>
        {isOnline && (
          <View className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-success" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-baseline gap-1">
          <Text className="text-sm font-semibold text-textPrimary">{name}</Text>
          <Text className="text-[11px] text-textSecondary">{time}</Text>
        </View>
        <Text className="mt-0.5 text-sm text-textSecondary" numberOfLines={2}>{message}</Text>
      </View>
    </View>
  );
}

// --- Skeleton ---
function StatCardSkeleton() {
  return (
    <View className="flex-1 items-center justify-center rounded-2xl bg-surface py-4">
      <View className="h-7 w-10 rounded-lg bg-border" />
      <View className="mt-1.5 h-3 w-14 rounded bg-border" />
    </View>
  );
}

// --- Main Screen ---
export default function StaffHomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { items, isLoading } = useMyAssignments({ pageSize: 100 });

  const stats: AssignmentStats = useMemo(() => {
    if (!items.length) return { newlyAssigned: 0, today: 0, inProgress: 0, nearSla: 0, escalated: 0, pendingUpload: 0 };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return {
      newlyAssigned: items.filter((item) => item.assignmentStatus === 'Assigned').length,
      today:         items.filter((item) => item.assignedAt?.startsWith(todayStr)).length,
      inProgress:    items.filter((item) => item.assignmentStatus === 'InProgress').length,
      nearSla: items.filter((item) => {
        if (!item.slaResolveDueAt) return false;
        const diff = new Date(item.slaResolveDueAt).getTime() - now.getTime();
        return diff > 0 && diff < 24 * 60 * 60 * 1000;
      }).length,
      escalated:     0,
      pendingUpload: items.filter((item) => item.assignmentStatus === 'InProgress' && !item.completedAt).length,
    };
  }, [items]);

  const now = new Date();
  const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const deadlineStr = `${deadline.getHours().toString().padStart(2, '0')}:${deadline.getMinutes().toString().padStart(2, '0')}`;

  const handleGoToAssignments = useCallback(() => {
    router.push('/assignments' as never);
  }, []);

  type StatRowItem = { label: string; value: number; color: string; bgColor: string };
  const statRows: StatRowItem[][] = [
    [
      { label: 'Mới giao',    value: stats.newlyAssigned, color: colors.primary, bgColor: '#D1FAE5' },
      { label: 'Hôm nay',     value: stats.today,         color: '#3B82F6',      bgColor: '#DBEAFE' },
      { label: 'Đang xử lý', value: stats.inProgress,    color: '#0D9488',      bgColor: '#CCFBF1' },
    ],
    [
      { label: 'Sắp quá SLA', value: stats.nearSla,       color: '#F97316',      bgColor: '#FFEDD5' },
      { label: 'Leo thang',   value: stats.escalated,     color: colors.error,   bgColor: '#FEE2E2' },
      { label: 'Chờ upload',  value: stats.pendingUpload, color: '#7C3AED',      bgColor: '#EDE9FE' },
    ],
  ];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-primary">GreenLens</Text>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push('/notifications' as never)}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="h-9 w-9" />
            ) : (
              <Text className="text-sm font-bold text-white">{user?.fullName?.[0] ?? 'C'}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Urgent banner */}
        {stats.newlyAssigned > 0 && (
          <UrgentBanner count={stats.newlyAssigned} deadline={deadlineStr} onPress={handleGoToAssignments} />
        )}

        {/* Stats grid */}
        <View className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm" style={{ elevation: 2 }}>
          {isLoading ? (
            <>
              <View className="mb-2 flex-row gap-2">
                {[0, 1, 2].map((n) => <StatCardSkeleton key={n} />)}
              </View>
              <View className="flex-row gap-2">
                {[0, 1, 2].map((n) => <StatCardSkeleton key={n} />)}
              </View>
            </>
          ) : (
            statRows.map((row, ri) => (
              <View key={ri} className={`flex-row gap-2${ri > 0 ? ' mt-2' : ''}`}>
                {row.map((s) => (
                  <StatCard key={s.label} label={s.label} value={s.value} color={s.color} bgColor={s.bgColor} />
                ))}
              </View>
            ))
          )}
        </View>

        {/* Mini map section */}
        <View className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-sm" style={{ elevation: 2 }}>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-textSecondary">Bản đồ khu vực</Text>
            <Pressable onPress={() => router.push('/map' as never)}>
              <Text className="text-sm font-semibold text-primary">Mở bản đồ</Text>
            </Pressable>
          </View>
          <View className="mx-4 mb-4 h-36 items-center justify-center overflow-hidden rounded-xl bg-surface">
            <Ionicons name="map-outline" size={40} color={colors.textDisabled} />
            <Text className="mt-2 text-xs text-textSecondary">{items.length} task · bán kính 3km</Text>
            <View className="mt-2 flex-row gap-3">
              {[
                { label: 'Assigned',   color: colors.error },
                { label: 'InProgress', color: '#F97316' },
                { label: 'Completed',  color: colors.primary },
              ].map((dot) => (
                <View key={dot.label} className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot.color }} />
                  <Text className="text-[11px] text-textSecondary">{dot.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Officer messages */}
        <View className="mx-4 rounded-2xl bg-white shadow-sm" style={{ elevation: 2 }}>
          <View className="flex-row items-center justify-between px-4 pb-1 pt-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-textSecondary">Từ Officer</Text>
            <Pressable onPress={() => router.push('/notifications' as never)}>
              <Text className="text-sm font-semibold text-primary">Xem hết</Text>
            </Pressable>
          </View>
          <View className="px-4 pb-2">
            <OfficerMessage name="Officer Minh" message="Ưu tiên xử lý hotspot Nguyễn Huệ" time="09:12" isOnline />
            <View className="h-px bg-border" />
            <OfficerMessage name="Officer Lan" message="Đã duyệt báo cáo RPT-2098" time="08:40" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
