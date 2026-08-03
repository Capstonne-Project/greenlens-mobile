import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type {
  CommunityCleanupParticipant,
  CommunityCleanupParticipantStatus,
} from '@/types/community-cleanup.types';

const STATUS_CONFIG: Record<CommunityCleanupParticipantStatus, { label: string; color: string; bg: string }> = {
  Joined: { label: 'Đã đăng ký', color: '#1E40AF', bg: '#DBEAFE' },
  CheckedIn: { label: 'Đã check-in', color: '#065F46', bg: '#D1FAE5' },
  Withdrawn: { label: 'Đã rút', color: '#6B7280', bg: '#F3F4F6' },
  NoShow: { label: 'Vắng mặt', color: '#991B1B', bg: '#FEE2E2' },
};

const STATUS_SORT_ORDER: Record<CommunityCleanupParticipantStatus, number> = {
  CheckedIn: 0,
  Joined: 1,
  NoShow: 2,
  Withdrawn: 3,
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${time} ${date}`;
}

function ParticipantRow({ participant }: { participant: CommunityCleanupParticipant }) {
  const statusCfg = STATUS_CONFIG[participant.status];
  const isCheckedIn = participant.status === 'CheckedIn';
  return (
    <View className="flex-row items-center gap-3 border-b border-border py-3">
      <View>
        {participant.avatarUrl ? (
          <Image
            source={{ uri: participant.avatarUrl }}
            className="h-10 w-10 rounded-full bg-surface"
            contentFit="cover"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Text className="text-sm font-bold text-textSecondary">
              {participant.fullName.trim().charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        {isCheckedIn ? (
          <View
            className="absolute -bottom-0.5 -right-0.5 items-center justify-center rounded-full border-2 border-white"
            style={{ width: 16, height: 16, backgroundColor: colors.primary }}
          >
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        ) : null}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
            {participant.fullName}
          </Text>
          {participant.role === 'Leader' ? (
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: '#111827' }}>
              <Text className="text-[9px] font-bold text-white">Trưởng nhóm</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs text-textSecondary">
          {participant.checkedInAt
            ? `Check-in lúc ${formatDateTime(participant.checkedInAt)}`
            : `Tham gia lúc ${formatDateTime(participant.joinedAt)}`}
        </Text>
      </View>
      <View className="rounded-full px-2 py-1" style={{ backgroundColor: statusCfg.bg }}>
        <Text className="text-[10px] font-bold" style={{ color: statusCfg.color }}>
          {statusCfg.label}
        </Text>
      </View>
    </View>
  );
}

interface ParticipantsListModalProps {
  visible: boolean;
  onClose: () => void;
  participants: CommunityCleanupParticipant[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

export function ParticipantsListModal({
  visible,
  onClose,
  participants,
  isLoading,
  errorMessage,
  onRetry,
}: ParticipantsListModalProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && !isLoading && participants.length === 0 && !errorMessage) {
      onRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]),
    [participants],
  );

  const checkedInCount = useMemo(
    () => participants.filter((p) => p.status === 'CheckedIn').length,
    [participants],
  );
  const activeCount = useMemo(
    () => participants.filter((p) => p.status === 'Joined' || p.status === 'CheckedIn').length,
    [participants],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="rounded-t-2xl bg-white"
        style={{ maxHeight: '75%', paddingBottom: insets.bottom + 16 }}
      >
        <View className="border-b border-border px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-textPrimary">
              Người tham gia ({participants.length})
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          {activeCount > 0 ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                {checkedInCount}/{activeCount} đã check-in
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : errorMessage ? (
          <View className="items-center justify-center px-6 py-10">
            <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
            <Text className="mt-2 text-center text-sm text-textSecondary">{errorMessage}</Text>
            <Pressable
              onPress={onRetry}
              className="mt-3 rounded-xl px-5 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-sm font-semibold text-white">Thử lại</Text>
            </Pressable>
          </View>
        ) : participants.length === 0 ? (
          <View className="items-center justify-center px-6 py-10">
            <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
            <Text className="mt-2 text-sm text-textSecondary">Chưa có ai tham gia.</Text>
          </View>
        ) : (
          <FlatList
            data={sortedParticipants}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => <ParticipantRow participant={item} />}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        )}
      </View>
    </Modal>
  );
}
