import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { TapScale } from '@/components/layout/TapScale';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import { Toast, useToast } from '@/components/common/Toast';
import { CheckInOverrideDialog } from '@/components/community/CheckInOverrideDialog';
import { ParticipantRing } from '@/components/community/ParticipantRing';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isCheckInTooFarError } from '@/utils/community-checkin-error';
import { firstRouteParam } from '@/utils/field-worker-task';
import type { CommunityCleanupEventDetail } from '@/types/community-cleanup.types';

const INK = '#0F1B14';
const PAPER = '#FFFFFF';
const PAPER_RAISED = '#F5F5F3';
const HAIRLINE = 'rgba(15, 27, 20, 0.10)';
const CLAY = '#C2703F';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: colors.primaryDark },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9' },
  Completed: { label: 'Hoàn thành', color: '#374151' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B' },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** 1 dòng dữ kiện trong sổ tay — nhãn mono nhỏ bên trái, giá trị serif/body bên phải. */
function FieldLine({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3 py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: HAIRLINE }}>
      <View className="w-24 flex-row items-center gap-1.5 pt-0.5">
        <Ionicons name={icon} size={13} color="rgba(15,27,20,0.4)" />
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(15,27,20,0.4)', letterSpacing: 0.3 }}>
          {label}
        </Text>
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}

export default function CommunityDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = firstRouteParam(params.id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const [event, setEvent] = useState<CommunityCleanupEventDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [isActing, setActing] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isOverrideSubmitting, setOverrideSubmitting] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

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
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Cần quyền truy cập vị trí để check-in.', 'error');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      await communityCleanupService.checkIn(eventId, coords.latitude, coords.longitude);
      showToast('Check-in thành công!', 'success');
      // Cập nhật ngay để nút check-in bị disable dù refetch chưa kịp phản ánh trạng thái mới.
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              myParticipation: prev.myParticipation
                ? { ...prev.myParticipation, status: 'CheckedIn' }
                : prev.myParticipation,
            }
          : prev,
      );
      await load();
    } catch (err) {
      if (coords && isCheckInTooFarError(err)) {
        setPendingCheckIn(coords);
        return;
      }
      showToast(getApiErrorMessage(err, 'Không thể check-in. Kiểm tra vị trí của bạn.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, load, showToast]);

  const handleOverrideConfirm = useCallback(
    async (reason: string) => {
      if (!eventId || !pendingCheckIn) return;
      setOverrideSubmitting(true);
      try {
        await communityCleanupService.checkIn(
          eventId,
          pendingCheckIn.latitude,
          pendingCheckIn.longitude,
          reason,
        );
        setPendingCheckIn(null);
        showToast('Check-in thành công!', 'success');
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                myParticipation: prev.myParticipation
                  ? { ...prev.myParticipation, status: 'CheckedIn' }
                  : prev.myParticipation,
              }
            : prev,
        );
        await load();
      } catch (err) {
        showToast(getApiErrorMessage(err, 'Không thể check-in. Vui lòng thử lại.'), 'error');
      } finally {
        setOverrideSubmitting(false);
      }
    },
    [eventId, pendingCheckIn, load, showToast],
  );

  const statusCfg = event ? (STATUS_CONFIG[event.status] ?? STATUS_CONFIG.OpenForJoin) : null;

  const targetLocation = event
    ? {
        latitude: event.meetingLatitude ?? event.reportLatitude,
        longitude: event.meetingLongitude ?? event.reportLongitude,
      }
    : null;

  const heroHeight = Math.round(width * 0.92);

  return (
    <View className="flex-1" style={{ backgroundColor: PAPER }}>
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <TapScale onPress={() => router.back()}>
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(15,27,20,0.35)' }}>
            <Ionicons name="chevron-back" size={22} color={PAPER} />
          </View>
        </TapScale>
        {statusCfg ? (
          <View className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2" style={{ backgroundColor: 'rgba(15,27,20,0.35)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusCfg.color }} />
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: PAPER }}>{statusCfg.label}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={{ height: heroHeight, width: '100%', backgroundColor: PAPER_RAISED }} />
        ) : errorMessage ? (
          <View className="items-center justify-center px-6 py-32">
            <Ionicons name="alert-circle-outline" size={48} color={CLAY} />
            <Text style={{ fontFamily: fonts.display, fontSize: 17, color: INK, marginTop: 12, textAlign: 'center' }}>
              {errorMessage}
            </Text>
            <TapScale onPress={load}>
              <View className="mt-4 rounded-full px-6 py-2.5" style={{ backgroundColor: INK }}>
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: PAPER }}>Thử lại</Text>
              </View>
            </TapScale>
          </View>
        ) : event ? (
          <>
            {/* Hero — ảnh full-bleed đè gradient tối + tiêu đề serif lớn ngay trên ảnh, giống
                trang bìa một mục nhật ký hiện trường thay vì ảnh nhỏ tách rời khỏi text. */}
            <TapScale onPress={() => (event.thumbnailUrl ? setViewerVisible(true) : undefined)}>
              <View style={{ width: '100%', height: heroHeight }}>
                {event.thumbnailUrl ? (
                  <Image source={{ uri: event.thumbnailUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center" style={{ backgroundColor: '#DCEEE5' }}>
                    <Ionicons name="leaf-outline" size={52} color={colors.primaryDark} />
                  </View>
                )}
                <LinearGradient
                  colors={['rgba(15,27,20,0)', 'rgba(15,27,20,0.15)', 'rgba(15,27,20,0.82)']}
                  locations={[0, 0.5, 1]}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <View className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(251,248,241,0.75)', letterSpacing: 0.6 }}>
                    {event.reportCode} · {event.categoryName}
                  </Text>
                  <Text style={{ fontFamily: fonts.displayBlack, fontSize: 27, color: PAPER, marginTop: 4, lineHeight: 32 }}>
                    {event.title}
                  </Text>
                </View>
              </View>
            </TapScale>

            <Animated.View entering={FadeInDown.duration(400)} className="px-5 pt-5">
              {/* Ring + leader — khối mở đầu "ai, bao nhiêu người" đặt ngang hàng cân đối */}
              <View className="flex-row items-center gap-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: HAIRLINE }}>
                <ParticipantRing count={event.participantCount} capacity={event.maxParticipants} />
                <View className="flex-1 gap-2">
                  <View>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 9.5, color: 'rgba(15,27,20,0.4)', letterSpacing: 0.4 }}>
                      NGƯỜI DẪN ĐẦU
                    </Text>
                    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: INK, marginTop: 1 }}>
                      {event.leader.fullName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="location-outline" size={13} color="rgba(15,27,20,0.45)" />
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(15,27,20,0.55)', flex: 1 }}
                    >
                      {event.meetingNote ?? event.reportAddress ?? 'Chưa có địa chỉ'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Field lines — thời gian, dữ kiện dạng nhãn mono trái / giá trị phải */}
              <View className="mt-1">
                <FieldLine icon="play-outline" label="BẮT ĐẦU">
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: INK }}>
                    {formatDateTime(event.startsAt)}
                  </Text>
                </FieldLine>
                {event.endsAt ? (
                  <FieldLine icon="stop-outline" label="KẾT THÚC">
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: INK }}>
                      {formatDateTime(event.endsAt)}
                    </Text>
                  </FieldLine>
                ) : null}
                {event.joinClosesAt ? (
                  <FieldLine icon="lock-closed-outline" label="ĐÓNG ĐK">
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(15,27,20,0.55)' }}>
                      {formatDateTime(event.joinClosesAt)}
                    </Text>
                  </FieldLine>
                ) : null}

                {(event.status === 'InProgress' || event.status === 'PendingVerification') && (
                  <FieldLine icon="trending-up-outline" label="TIẾN ĐỘ">
                    <View>
                      <View className="flex-row items-center justify-between">
                        <View className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: PAPER_RAISED }}>
                          <View
                            className="h-full rounded-full"
                            style={{ width: `${event.progressPercent}%` as `${number}%`, backgroundColor: colors.primaryDark }}
                          />
                        </View>
                        <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: 12, color: colors.primaryDark, marginLeft: 8 }}>
                          {event.progressPercent}%
                        </Text>
                      </View>
                      {event.progressNote ? (
                        <Text style={{ fontFamily: fonts.displayItalic, fontSize: 12.5, color: 'rgba(15,27,20,0.55)', marginTop: 6 }}>
                          “{event.progressNote}”
                        </Text>
                      ) : null}
                    </View>
                  </FieldLine>
                )}
              </View>

              {event.description ? (
                <View className="mt-5 rounded-2xl px-4 py-4" style={{ backgroundColor: PAPER_RAISED }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9.5, color: 'rgba(15,27,20,0.4)', letterSpacing: 0.4, marginBottom: 6 }}>
                    GHI CHÚ
                  </Text>
                  <Text style={{ fontFamily: fonts.displayRegular, fontSize: 14.5, color: INK, lineHeight: 21 }}>
                    {event.description}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      {!isLoading && !errorMessage && event ? (
        <SafeAreaView
          edges={['bottom']}
          style={{ backgroundColor: PAPER, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingHorizontal: 20, paddingTop: 14 }}
        >
          {event.isLeader ? (
            <TapScale onPress={() => router.push({ pathname: '/community-lead/[id]', params: { id: event.id } } as never)}>
              <View className="flex-row items-center justify-center gap-2 rounded-2xl" style={{ height: 52, backgroundColor: INK }}>
                <Ionicons name="construct-outline" size={18} color={PAPER} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: PAPER }}>Vào không gian điều phối</Text>
              </View>
            </TapScale>
          ) : event.myParticipation?.status === 'Joined' && (event.status === 'OpenForJoin' || event.status === 'JoinClosed') ? (
            <View className="flex-row gap-3">
              <TapScale onPress={isActing ? () => {} : handleWithdraw}>
                <View className="items-center justify-center rounded-2xl px-6" style={{ height: 52, borderWidth: 1.5, borderColor: CLAY, opacity: isActing ? 0.5 : 1 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: CLAY }}>Rút khỏi</Text>
                </View>
              </TapScale>
              <View style={{ flex: 1 }}>
                <TapScale onPress={isActing ? () => {} : handleCheckIn}>
                  <View className="items-center justify-center rounded-2xl" style={{ height: 52, backgroundColor: INK, opacity: isActing ? 0.7 : 1 }}>
                    {isActing ? <ActivityIndicator size="small" color={PAPER} /> : (
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: PAPER }}>Check-in</Text>
                    )}
                  </View>
                </TapScale>
              </View>
            </View>
          ) : event.myParticipation?.status === 'Joined' && event.status === 'InProgress' ? (
            <TapScale onPress={isActing ? () => {} : handleCheckIn}>
              <View className="items-center justify-center rounded-2xl" style={{ height: 52, backgroundColor: INK, opacity: isActing ? 0.7 : 1 }}>
                {isActing ? <ActivityIndicator size="small" color={PAPER} /> : (
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: PAPER }}>Check-in</Text>
                )}
              </View>
            </TapScale>
          ) : event.myParticipation?.status === 'CheckedIn' ? (
            <View className="flex-row items-center justify-center gap-2 rounded-2xl" style={{ height: 52, backgroundColor: 'rgba(16,185,129,0.14)' }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.primaryDark }}>Đã check-in</Text>
            </View>
          ) : event.myParticipation ? (
            <View className="items-center justify-center rounded-2xl" style={{ height: 52, backgroundColor: PAPER_RAISED }}>
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: 'rgba(15,27,20,0.5)' }}>
                Bạn đã rời chương trình này
              </Text>
            </View>
          ) : event.status === 'OpenForJoin' ? (
            <TapScale onPress={isActing ? () => {} : handleJoin}>
              <View className="flex-row items-center justify-center gap-2 rounded-2xl" style={{ height: 52, backgroundColor: colors.primaryDark, opacity: isActing ? 0.7 : 1 }}>
                {isActing ? <ActivityIndicator size="small" color={PAPER} /> : (
                  <>
                    <Animated.View entering={FadeIn.duration(300)}>
                      <Ionicons name="hand-left" size={19} color={PAPER} />
                    </Animated.View>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: PAPER, letterSpacing: 0.2 }}>
                      Tham gia (Vote)
                    </Text>
                  </>
                )}
              </View>
            </TapScale>
          ) : (
            <View className="items-center justify-center rounded-2xl" style={{ height: 52, backgroundColor: PAPER_RAISED }}>
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: 'rgba(15,27,20,0.5)' }}>
                Chương trình không nhận đăng ký
              </Text>
            </View>
          )}
        </SafeAreaView>
      ) : null}

      <Toast visible={toastState.visible} type={toastState.type} message={toastState.message} onHide={hideToast} />

      <CheckInOverrideDialog
        visible={!!pendingCheckIn}
        isSubmitting={isOverrideSubmitting}
        userLocation={pendingCheckIn}
        targetLocation={targetLocation}
        onCancel={() => setPendingCheckIn(null)}
        onConfirm={handleOverrideConfirm}
      />

      {event?.thumbnailUrl ? (
        <ImageViewerModal
          visible={viewerVisible}
          images={[event.thumbnailUrl]}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </View>
  );
}
