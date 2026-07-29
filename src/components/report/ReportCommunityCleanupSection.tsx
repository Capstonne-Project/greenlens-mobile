import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useReportCommunityCleanup } from '@/hooks/useReportCommunityCleanup';
import { colors } from '@/theme/colors';
import type { CommunityCleanupEventDetail } from '@/types/community-cleanup.types';

const STATUS_LABEL: Record<CommunityCleanupEventDetail['status'], string> = {
  OpenForJoin: 'Đang mở đăng ký',
  JoinClosed: 'Đã đóng đăng ký',
  InProgress: 'Đang dọn dẹp',
  PendingVerification: 'Chờ LEO duyệt',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
};

interface ReportCommunityCleanupSectionProps {
  reportId: string;
}

function JoinButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{ backgroundColor: disabled ? colors.border : colors.primary }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="hand-left-outline" size={18} color="#fff" />
            <Text className="font-bold text-white">{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Card "chương trình dọn cộng đồng" trên report detail — đọc note của leader rồi vote (= tham gia). */
export function ReportCommunityCleanupSection({ reportId }: ReportCommunityCleanupSectionProps) {
  const { event, isLoading, isJoining, joinError, join } = useReportCommunityCleanup(reportId);
  const [showNotes, setShowNotes] = useState(false);
  const insets = useSafeAreaInsets();

  if (isLoading || !event) return null;

  const alreadyJoined = event.myParticipation?.status === 'Joined' || event.myParticipation?.status === 'CheckedIn';
  const canJoin = event.status === 'OpenForJoin' && !event.myParticipation && !event.isLeader;

  const handleConfirmJoin = async () => {
    const ok = await join();
    if (ok) setShowNotes(false);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        Chương trình dọn cộng đồng
      </Text>

      <View className="rounded-2xl border border-border px-4 py-4">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#ECFDF5' }}>
            <Text className="text-[11px] font-bold" style={{ color: '#065F46' }}>
              {STATUS_LABEL[event.status]}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
            <Text className="text-xs font-semibold text-textSecondary">
              {event.participantCount}/{event.maxParticipants} người tham gia
            </Text>
          </View>
        </View>

        <Text className="mb-1 text-base font-bold text-textPrimary">{event.title}</Text>

        <View className="mb-3 flex-row items-center gap-1.5">
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <Text className="text-sm text-textPrimary">Người hỗ trợ: {event.leader.fullName}</Text>
        </View>

        {event.isLeader ? (
          <JoinButton
            label="Vào không gian điều phối"
            onPress={() => router.push({ pathname: '/community-lead/[id]', params: { id: event.id } } as never)}
          />
        ) : alreadyJoined ? (
          <Pressable
            onPress={() => router.push({ pathname: '/community/[id]', params: { id: event.id } } as never)}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
            style={{ backgroundColor: '#ECFDF5' }}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text className="font-bold" style={{ color: colors.primary }}>
              Bạn đã tham gia · Xem chi tiết
            </Text>
          </Pressable>
        ) : canJoin ? (
          <JoinButton label="Tham gia dọn dẹp" onPress={() => setShowNotes(true)} />
        ) : (
          <View className="h-12 items-center justify-center rounded-xl bg-surface">
            <Text className="font-semibold text-textSecondary">Chương trình không nhận đăng ký</Text>
          </View>
        )}
      </View>

      <Modal visible={showNotes} animationType="slide" transparent onRequestClose={() => setShowNotes(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-[28px] bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
          >
            <View className="mb-3 items-center">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <Text className="mb-3 text-lg font-bold text-textPrimary">{event.title}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View className="mb-3 flex-row flex-wrap gap-4">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                  <Text className="text-sm text-textPrimary">Người hỗ trợ: {event.leader.fullName}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text className="text-sm text-textPrimary">
                    {event.participantCount}/{event.maxParticipants} · còn {event.spotsLeft} chỗ
                  </Text>
                </View>
              </View>

              {event.description ? (
                <View className="mb-3">
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                    Mô tả chương trình
                  </Text>
                  <Text className="text-sm leading-5 text-textPrimary">{event.description}</Text>
                </View>
              ) : null}

              {event.meetingNote ? (
                <View className="mb-3">
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                    Ghi chú điểm tập trung
                  </Text>
                  <Text className="text-sm leading-5 text-textPrimary">{event.meetingNote}</Text>
                </View>
              ) : null}

              <Text className="mb-1 text-sm text-textSecondary">
                Bắt đầu: {new Date(event.startsAt).toLocaleString('vi-VN')}
              </Text>
              {event.joinClosesAt ? (
                <Text className="mb-3 text-xs text-textSecondary">
                  Đóng đăng ký: {new Date(event.joinClosesAt).toLocaleString('vi-VN')}
                </Text>
              ) : null}

              {joinError ? (
                <View className="mb-3 rounded-xl bg-error/10 px-3 py-2.5">
                  <Text className="text-sm text-error">{joinError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="mt-3 flex-row gap-3">
              <Pressable
                onPress={() => setShowNotes(false)}
                className="flex-1 h-12 items-center justify-center rounded-xl border-2 border-border"
              >
                <Text className="font-bold text-textSecondary">Để sau</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl"
                style={{ backgroundColor: colors.primary }}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Xác nhận tham gia</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
