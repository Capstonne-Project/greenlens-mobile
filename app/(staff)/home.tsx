import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { UserLocation } from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GoongMapView } from '@/components/map/GoongMapView';
import { StaffMapPinMarker } from '@/components/map/StaffMapPinMarker';
import { Text } from '@/components/ui/text';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import { useAuth } from '@/hooks/useAuth';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { useStaffMapPins } from '@/hooks/useStaffMapPins';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { useNotificationStore } from '@/stores/notification.store';
import { colors } from '@/theme/colors';
import type { AssignmentStats } from '@/types/cleanup-assignment.types';
import type { CommunityCleanupListItem, CommunityCleanupStatus } from '@/types/community-cleanup.types';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

const StatCard = React.memo(function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View className="flex-1 items-center justify-center py-3">
      <Text className="text-[26px] font-bold leading-tight" style={{ color }}>{value}</Text>
      <Text className="mt-0.5 text-center text-[11px] text-textSecondary" numberOfLines={2}>{label}</Text>
    </View>
  );
});

function StatCardSkeleton() {
  return (
    <View className="flex-1 items-center justify-center py-3">
      <View className="h-7 w-8 rounded-md bg-border" />
      <View className="mt-1.5 h-3 w-12 rounded bg-surface" />
    </View>
  );
}

// ─── Urgent Banner ────────────────────────────────────────────────────────────

interface UrgentBannerProps {
  count: number;
  deadline: string;
  onPress: () => void;
}

function UrgentBanner({ count, deadline, onPress }: UrgentBannerProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, { marginHorizontal: 16, marginBottom: 16 }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={onPress}
        className="flex-row items-center rounded-2xl px-4 py-3.5"
        style={{ backgroundColor: '#FEF3C7' }}
      >
        {/* Icon vòng tròn cam */}
        <View
          className="mr-3.5 h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <Ionicons name="time" size={20} color="#fff" />
        </View>

        {/* Text */}
        <View className="flex-1">
          <Text className="text-[13px] font-bold" style={{ color: '#78350F' }}>
            {count} task cần phản hồi trong 2 giờ
          </Text>
          <Text className="mt-0.5 text-[12px]" style={{ color: '#92400E' }}>
            Nhận hoặc từ chối trước {deadline}
          </Text>
        </View>

        {/* Arrow */}
        <View className="ml-2 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FDE68A' }}>
          <Ionicons name="chevron-forward" size={16} color="#92400E" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Mini Map ─────────────────────────────────────────────────────────────────

interface MiniMapSectionProps {
  pins: ReturnType<typeof useStaffMapPins>['pins'];
  totalCount: number;
}

function MiniMapSection({ pins, totalCount }: MiniMapSectionProps) {
  const assigned   = pins.filter((p) => p.assignmentStatus === 'Assigned').length;
  const inProgress = pins.filter((p) => p.assignmentStatus === 'InProgress').length;
  const completed  = pins.filter((p) => p.assignmentStatus === 'Completed').length;

  return (
    <View
      className="mx-4 mb-1 overflow-hidden rounded-2xl bg-white"
      style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          Bản đồ khu vực
        </Text>
        <Pressable onPress={() => router.push('/map' as never)}>
          <Text className="text-[13px] font-semibold text-primary">Mở bản đồ</Text>
        </Pressable>
      </View>

      {/* MapView thật */}
      <View className="mx-4 overflow-hidden rounded-xl" style={{ height: 220 }}>
        <GoongMapView
          style={{ flex: 1 }}
          initialRegion={{
            ...HCM_INITIAL_REGION,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
        >
          <UserLocation />
          {pins.map((pin) => (
            <StaffMapPinMarker key={pin.id} pin={pin} />
          ))}
        </GoongMapView>

        {/* Nút "Xem toàn bộ" góc dưới phải — không chặn gesture map */}
        <Pressable
          onPress={() => router.push('/map' as never)}
          style={{ position: 'absolute', bottom: 8, right: 8 }}
          className="flex-row items-center gap-1 rounded-full bg-white px-2.5 py-1.5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="expand-outline" size={13} color={colors.textSecondary} />
          <Text className="text-[11px] font-semibold text-textSecondary">Xem toàn bộ</Text>
        </Pressable>
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-[12px] text-textSecondary">{totalCount} task · bán kính 3km</Text>
        <View className="flex-row items-center gap-3">
          {[
            { color: '#EF4444', count: assigned },
            { color: '#F97316', count: inProgress },
            { color: colors.primary, count: completed },
          ].map((dot) => (
            <View key={dot.color} className="flex-row items-center gap-1">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot.color }} />
              <Text className="text-[11px] font-semibold text-textSecondary">{dot.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Community-led row (thay thế "Officer Feed") ──────────────────────────────

const COMMUNITY_STATUS_LABEL: Record<CommunityCleanupStatus, { label: string; color: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#065F46' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9' },
  Completed: { label: 'Hoàn thành', color: '#374151' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B' },
};

function CommunityLedRow({ item, onPress }: { item: CommunityCleanupListItem; onPress: () => void }) {
  const statusCfg = COMMUNITY_STATUS_LABEL[item.status] ?? COMMUNITY_STATUS_LABEL.OpenForJoin;

  return (
    <Pressable onPress={onPress} className="flex-row items-start py-3">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#111827' }}>
        <Ionicons name="people" size={16} color="#fff" />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="flex-1 text-[13px] font-bold text-textPrimary" numberOfLines={1}>{item.title}</Text>
          <Text className="text-[11px] font-semibold" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
        </View>
        <Text className="mt-0.5 text-[13px] text-textSecondary" numberOfLines={1}>
          {item.reportCode} · {item.participantCount}/{item.maxParticipants} người · {item.progressPercent}%
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginTop: 8, marginLeft: 4 }} />
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
      <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text className="text-[13px] font-semibold text-primary">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StaffHomeScreen() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const { items, isLoading } = useMyAssignments({ pageSize: 100 });
  const { pins } = useStaffMapPins();

  // Chương trình dọn cộng đồng mà user hiện tại là Leader — thay thế feed "Từ Officer".
  const [ledItems, setLedItems] = useState<CommunityCleanupListItem[]>([]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const res = await communityCleanupService.getLedByMe({ page: 1, pageSize: 5 });
          if (!cancelled) setLedItems(res.data.data.items.filter((i) => i.status !== 'Cancelled'));
        } catch {
          if (!cancelled) setLedItems([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const stats: AssignmentStats = useMemo(() => {
    if (!items.length) {
      return { newlyAssigned: 0, today: 0, inProgress: 0, nearSla: 0, escalated: 0, pendingUpload: 0 };
    }
    const now      = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return {
      newlyAssigned: items.filter((i) => i.assignmentStatus === 'Assigned').length,
      today:         items.filter((i) => i.assignedAt?.startsWith(todayStr)).length,
      inProgress:    items.filter((i) => i.assignmentStatus === 'InProgress').length,
      nearSla: items.filter((i) => {
        if (!i.slaResolveDueAt) return false;
        const diff = new Date(i.slaResolveDueAt).getTime() - now.getTime();
        return diff > 0 && diff < 24 * 60 * 60 * 1000;
      }).length,
      escalated:     0,
      pendingUpload: items.filter((i) => i.assignmentStatus === 'InProgress' && !i.completedAt).length,
    };
  }, [items]);

  // Deadline = hiện tại + 2 giờ
  const deadlineStr = useMemo(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const handleGoToAssignments = useCallback(() => {
    router.push('/assignments' as never);
  }, []);

  type StatDef = { label: string; value: number; color: string };
  const statRows: StatDef[][] = [
    [
      { label: 'Mới giao',    value: stats.newlyAssigned, color: colors.primary },
      { label: 'Hôm nay',     value: stats.today,         color: '#3B82F6' },
      { label: 'Đang xử lý', value: stats.inProgress,    color: '#0D9488' },
    ],
    [
      { label: 'Sắp quá SLA', value: stats.nearSla,       color: '#F97316' },
      { label: 'Leo thang',   value: stats.escalated,     color: '#EF4444' },
      { label: 'Chờ upload',  value: stats.pendingUpload, color: '#7C3AED' },
    ],
  ];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Image
          source={require('../../assets/images/logo.png')}
          style={{ width: 200, height: 200, marginLeft: -40, marginTop: -80, marginBottom: -80 }}
          resizeMode="contain"
        />
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push('/notifications' as never)}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.textPrimary} />
            {unreadCount > 0 ? (
              <View
                className="absolute -right-0.5 -top-0.5 min-w-[16px] items-center rounded-full px-1"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* Avatar */}
          <Pressable
            onPress={() => router.push('/settings' as never)}
            className="h-9 w-9 items-center justify-center overflow-hidden rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: 36, height: 36 }} />
            ) : (
              <Text className="text-sm font-bold text-white">{user?.fullName?.[0] ?? 'C'}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

        {/* ── Urgent Banner ── */}
        {stats.newlyAssigned > 0 && (
          <UrgentBanner count={stats.newlyAssigned} deadline={deadlineStr} onPress={handleGoToAssignments} />
        )}

        {/* ── Stats Grid ── */}
        <View
          className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        >
          {isLoading ? (
            <>
              <View className="flex-row px-2 pt-2">
                {[0, 1, 2].map((n) => (
                  <React.Fragment key={n}>
                    <StatCardSkeleton />
                    {n < 2 && <View className="w-px bg-border" />}
                  </React.Fragment>
                ))}
              </View>
              <View className="mx-3 h-px bg-border" />
              <View className="flex-row px-2 pb-2">
                {[0, 1, 2].map((n) => (
                  <React.Fragment key={n}>
                    <StatCardSkeleton />
                    {n < 2 && <View className="w-px bg-border" />}
                  </React.Fragment>
                ))}
              </View>
            </>
          ) : (
            statRows.map((row, ri) => (
              <React.Fragment key={ri}>
                {ri > 0 && <View className="mx-3 h-px bg-border" />}
                <View className="flex-row">
                  {row.map((s, ci) => (
                    <React.Fragment key={s.label}>
                      {ci > 0 && <View className="w-px bg-border" />}
                      <StatCard label={s.label} value={s.value} color={s.color} />
                    </React.Fragment>
                  ))}
                </View>
              </React.Fragment>
            ))
          )}
        </View>

        {/* ── Map ── */}
        <MiniMapSection pins={pins} totalCount={items.length} />

        {/* ── Quick links ── */}
        <View className="mx-4 mb-4 flex-row gap-3">
          <Pressable
            onPress={() => router.push('/assignment/history' as never)}
            className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3"
            style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text className="text-sm font-semibold text-textPrimary">Lịch sử tiến độ</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/assignments' as never)}
            className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3"
            style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
          >
            <Ionicons name="list-outline" size={20} color={colors.primary} />
            <Text className="text-sm font-semibold text-textPrimary">Nhiệm vụ</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>

        {/* ── Cộng đồng của bạn ── */}
        <View
          className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        >
          <SectionHeader
            title="Cộng đồng của bạn"
            actionLabel="Xem hết"
            onAction={() => router.push('/community-lead' as never)}
          />
          <View className="px-4 pb-2">
            {ledItems.length > 0 ? (
              ledItems.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 && <View className="h-px bg-border" />}
                  <CommunityLedRow
                    item={item}
                    onPress={() => router.push({ pathname: '/community-lead/[id]', params: { id: item.id } } as never)}
                  />
                </React.Fragment>
              ))
            ) : (
              <View className="items-center py-6">
                <Ionicons name="people-outline" size={28} color={colors.textDisabled} />
                <Text className="mt-2 text-center text-xs text-textSecondary">
                  Bạn chưa dẫn dắt chương trình dọn cộng đồng nào. LEO sẽ chỉ định khi mở chương trình mới.
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
