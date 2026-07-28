import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Toast, useToast } from '@/components/common/Toast';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { firstRouteParam } from '@/utils/field-worker-task';
import type { CommunityCleanupEventDetail } from '@/types/community-cleanup.types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#065F46', bg: '#D1FAE5' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E', bg: '#FEF3C7' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF', bg: '#DBEAFE' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9', bg: '#EDE9FE' },
  Completed: { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B', bg: '#FEE2E2' },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CommunityDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = firstRouteParam(params.id);
  const insets = useSafeAreaInsets();
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const [event, setEvent] = useState<CommunityCleanupEventDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [isActing, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getById(eventId);
      setEvent(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải chi tiết chương trình.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleJoin = useCallback(async () => {
    if (!eventId || isActing) return;
    setActing(true);
    try {
      await communityCleanupService.join(eventId);
      showToast('Đã tham gia chương trình!', 'success');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể tham gia.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, load, showToast]);

  const handleWithdraw = useCallback(async () => {
    if (!eventId || isActing) return;
    setActing(true);
    try {
      await communityCleanupService.withdraw(eventId);
      showToast('Đã rút khỏi chương trình.', 'success');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể rút khỏi chương trình.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, load, showToast]);

  const handleCheckIn = useCallback(async () => {
    if (!eventId || isActing) return;
    setActing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Cần quyền truy cập vị trí để check-in.', 'error');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      await communityCleanupService.checkIn(
        eventId,
        position.coords.latitude,
        position.coords.longitude,
      );
      showToast('Check-in thành công!', 'success');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể check-in. Kiểm tra vị trí của bạn.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, load, showToast]);

  const statusCfg = event ? (STATUS_CONFIG[event.status] ?? STATUS_CONFIG.OpenForJoin) : null;

  return (
    <View className="flex-1 bg-background">
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        {statusCfg ? (
          <View className="rounded-full bg-white px-3 py-1.5" style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 }}>
            <Text className="text-xs font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View className="h-56 w-full bg-surface" />
        ) : errorMessage ? (
          <View className="items-center justify-center px-6 py-32">
            <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
            <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
            <Pressable onPress={load} className="mt-4 rounded-xl px-6 py-2.5" style={{ backgroundColor: colors.primary }}>
              <Text className="font-semibold text-white">Thử lại</Text>
            </Pressable>
          </View>
        ) : event ? (
          <>
            {event.thumbnailUrl ? (
              <Image source={{ uri: event.thumbnailUrl }} style={{ width: '100%', height: 220 }} contentFit="cover" />
            ) : (
              <View className="w-full items-center justify-center" style={{ height: 180, backgroundColor: '#ECFDF5' }}>
                <Ionicons name="leaf-outline" size={48} color={colors.primary} />
              </View>
            )}

            <View className="px-4 pt-4">
              <Text className="mb-1 text-xs text-textSecondary">{event.reportCode} · {event.categoryName}</Text>
              <Text className="mb-2 text-xl font-bold text-textPrimary">{event.title}</Text>

              <View className="mb-3 flex-row items-start gap-1">
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm text-textSecondary">
                  {event.meetingNote ?? event.reportAddress ?? 'Chưa có địa chỉ'}
                </Text>
              </View>

              <View className="mb-4 flex-row flex-wrap gap-4">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                  <Text className="text-sm text-textPrimary">Leader: {event.leader.fullName}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text className="text-sm text-textPrimary">
                    {event.participantCount}/{event.maxParticipants} · còn {event.spotsLeft} chỗ
                  </Text>
                </View>
              </View>

              <View className="mb-4 h-px bg-border" />

              {event.description ? (
                <View className="mb-4">
                  <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">Mô tả</Text>
                  <Text className="text-sm leading-5 text-textPrimary">{event.description}</Text>
                </View>
              ) : null}

              <View className="mb-4">
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">Lịch trình</Text>
                <View className="gap-1">
                  <Text className="text-sm text-textPrimary">Bắt đầu: {formatDateTime(event.startsAt)}</Text>
                  {event.endsAt ? <Text className="text-sm text-textPrimary">Kết thúc: {formatDateTime(event.endsAt)}</Text> : null}
                  {event.joinClosesAt ? <Text className="text-sm text-textSecondary">Đóng đăng ký: {formatDateTime(event.joinClosesAt)}</Text> : null}
                </View>
              </View>

              {(event.status === 'InProgress' || event.status === 'PendingVerification') && (
                <View className="mb-4">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">Tiến độ</Text>
                    <Text className="text-sm font-bold" style={{ color: colors.primary }}>{event.progressPercent}%</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface">
                    <View className="h-full rounded-full" style={{ width: `${event.progressPercent}%` as `${number}%`, backgroundColor: colors.primary }} />
                  </View>
                  {event.progressNote ? <Text className="mt-1 text-xs text-textSecondary">{event.progressNote}</Text> : null}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {!isLoading && !errorMessage && event ? (
        <SafeAreaView edges={['bottom']} className="border-t border-border bg-white px-4 pt-3" style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } }}>
          {event.isLeader ? (
            <Pressable
              onPress={() => router.push({ pathname: '/community-lead/[id]', params: { id: event.id } } as never)}
              className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="construct-outline" size={18} color="#fff" />
              <Text className="font-bold text-white">Vào không gian điều phối</Text>
            </Pressable>
          ) : event.myParticipation?.status === 'Joined' && (event.status === 'OpenForJoin' || event.status === 'JoinClosed') ? (
            <View className="flex-row gap-3">
              <Pressable onPress={handleWithdraw} disabled={isActing} className="flex-1 h-12 items-center justify-center rounded-xl border-2" style={{ borderColor: colors.error }}>
                <Text className="font-bold" style={{ color: colors.error }}>Rút khỏi</Text>
              </Pressable>
              <Pressable onPress={handleCheckIn} disabled={isActing} className="flex-1 h-12 items-center justify-center rounded-xl" style={{ backgroundColor: colors.primary }}>
                {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-bold text-white">Check-in</Text>}
              </Pressable>
            </View>
          ) : event.myParticipation?.status === 'Joined' && event.status === 'InProgress' ? (
            <Pressable onPress={handleCheckIn} disabled={isActing} className="h-12 items-center justify-center rounded-xl" style={{ backgroundColor: colors.primary }}>
              {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-bold text-white">Check-in</Text>}
            </Pressable>
          ) : event.myParticipation?.status === 'CheckedIn' ? (
            <View className="h-12 flex-row items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: '#ECFDF5' }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text className="font-bold" style={{ color: colors.primary }}>Đã check-in</Text>
            </View>
          ) : event.myParticipation ? (
            <View className="h-12 items-center justify-center rounded-xl bg-surface">
              <Text className="font-semibold text-textSecondary">Bạn đã rời chương trình này</Text>
            </View>
          ) : event.status === 'OpenForJoin' ? (
            <Pressable onPress={handleJoin} disabled={isActing} className="h-12 flex-row items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: colors.primary }}>
              {isActing ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="hand-left-outline" size={18} color="#fff" />
                  <Text className="font-bold text-white">Tham gia (Vote)</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View className="h-12 items-center justify-center rounded-xl bg-surface">
              <Text className="font-semibold text-textSecondary">Chương trình không nhận đăng ký</Text>
            </View>
          )}
        </SafeAreaView>
      ) : null}

      <Toast visible={toastState.visible} type={toastState.type} message={toastState.message} onHide={hideToast} />
    </View>
  );
}
