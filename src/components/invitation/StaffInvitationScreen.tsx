import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useToast, Toast } from '@/components/common/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useStaffInvitation } from '@/hooks/useStaffInvitation';
import { colors } from '@/theme/colors';
import type { InvitationDto, InvitationTargetRole } from '@/types/invitation.types';

interface StaffInvitationScreenProps {
  invitationId: string;
}

const ROLE_META: Record<InvitationTargetRole, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Cleaner: { label: 'Cleaner · Đội vệ sinh', icon: 'trash-outline' },
  Inspector: { label: 'Inspector · Thanh tra viên', icon: 'shield-checkmark-outline' },
};

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function ActionButton({
  label,
  variant,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  variant: 'accept' | 'decline';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isAccept = variant === 'accept';

  return (
    <Animated.View style={[style, { flex: isAccept ? 1.4 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className="h-14 flex-row items-center justify-center gap-2 rounded-2xl"
        style={{
          backgroundColor: isAccept ? colors.primary : 'transparent',
          borderWidth: isAccept ? 0 : 1.5,
          borderColor: colors.border,
          opacity: disabled || loading ? 0.55 : 1,
          shadowColor: isAccept ? colors.primary : 'transparent',
          shadowOpacity: isAccept ? 0.35 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: isAccept ? 4 : 0,
        }}
      >
        {loading ? (
          <ActivityIndicator color={isAccept ? colors.white : colors.textPrimary} />
        ) : (
          <>
            <Ionicons
              name={isAccept ? 'checkmark-circle' : 'close'}
              size={18}
              color={isAccept ? colors.textOnPrimary : colors.textSecondary}
            />
            <Text
              className="text-[15px] font-bold"
              style={{ color: isAccept ? colors.textOnPrimary : colors.textPrimary }}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Chấm cắt hai bên tạo hiệu ứng vé mời — màu trùng nền screen (surface) */
function TicketNotch() {
  return (
    <View className="flex-row items-center">
      <View
        className="h-6 w-3 rounded-r-full"
        style={{ backgroundColor: colors.surface, marginLeft: -12 }}
      />
      <View className="mx-2 flex-1 border-t border-dashed" style={{ borderColor: colors.border }} />
      <View
        className="h-6 w-3 rounded-l-full"
        style={{ backgroundColor: colors.surface, marginRight: -12 }}
      />
    </View>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 flex-row items-start gap-2.5">
      <View
        className="mt-0.5 h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name={icon} size={15} color={colors.primaryDark} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] uppercase tracking-wide text-textSecondary">{label}</Text>
        <Text className="mt-0.5 text-[14px] font-semibold text-textPrimary" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusBanner({ invitation }: { invitation: InvitationDto }) {
  const resolved = invitation.status === 'Accepted';
  const declined = invitation.status === 'Declined';

  const tint = resolved ? colors.primary : declined ? colors.textSecondary : colors.warning;
  const bg = resolved ? colors.primaryLight : declined ? colors.surface : '#FEF3E2';
  const message = resolved
    ? 'Bạn đã tham gia đội — chúc bạn hoàn thành tốt nhiệm vụ!'
    : declined
      ? 'Bạn đã từ chối lời mời này.'
      : 'Lời mời đã hết hạn hoặc không còn hiệu lực.';
  const icon = resolved ? 'checkmark-circle' : declined ? 'close-circle' : 'time-outline';

  return (
    <View className="mt-5 flex-row items-center gap-2.5 rounded-2xl px-4 py-3.5" style={{ backgroundColor: bg }}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text className="flex-1 text-[13px] font-medium leading-5" style={{ color: colors.textPrimary }}>
        {message}
      </Text>
    </View>
  );
}

/** Bắt buộc đăng nhập lại sau khi accept — token/role cũ không còn hợp lệ cho shell mới (Cleaner/Inspector) */
function ReloginRequiredModal({
  visible,
  isLoggingOut,
  onAcknowledge,
}: {
  visible: boolean;
  isLoggingOut: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Chặn back button Android — chỉ được thoát qua nút "Đã rõ"
      }}
    >
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}
      >
        <View
          className="w-full items-center rounded-[28px] bg-white px-6 py-8"
          style={{
            shadowColor: '#0F172A',
            shadowOpacity: 0.2,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 16 },
            elevation: 6,
          }}
        >
          <View
            className="mb-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="checkmark-done" size={30} color={colors.primary} />
          </View>
          <Text className="text-center text-lg font-bold text-textPrimary">
            Bạn đã tham gia đội thành công!
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
            Vai trò của bạn vừa được cập nhật. Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isLoggingOut}
            onPress={onAcknowledge}
            className="mt-6 h-12 w-full items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.primary, opacity: isLoggingOut ? 0.7 : 1 }}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.textOnPrimary }}>
                Đã rõ
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function StaffInvitationScreen({ invitationId }: StaffInvitationScreenProps) {
  const insets = useSafeAreaInsets();
  const { toastState, show, hide } = useToast();
  const { logout } = useAuth();
  const {
    invitation,
    loadState,
    isExpired,
    isAccepting,
    isDeclining,
    actionError,
    accept,
    decline,
  } = useStaffInvitation(invitationId);

  const [showRelogin, setShowRelogin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const close = useCallback(() => {
    router.back();
  }, []);

  const handleAccept = useCallback(async () => {
    const ok = await accept();
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRelogin(true);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [accept]);

  const handleAcknowledgeRelogin = useCallback(async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);

  const handleDecline = useCallback(async () => {
    const ok = await decline();
    if (ok) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      show('Bạn đã từ chối lời mời.', 'info');
      setTimeout(() => router.back(), 900);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [decline, show]);

  const isPending = invitation?.status === 'Pending' && !isExpired;
  const isResolved = !!invitation && invitation.status !== 'Pending';
  const remainingDays = useMemo(
    () => (invitation ? daysLeft(invitation.expiresAt) : 0),
    [invitation],
  );
  const isUrgent = remainingDays <= 2;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface }}>
      <Toast {...toastState} onHide={hide} />
      <ReloginRequiredModal
        visible={showRelogin}
        isLoggingOut={isLoggingOut}
        onAcknowledge={() => void handleAcknowledgeRelogin()}
      />

      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 56,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={close}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Ionicons name="close" size={20} color={colors.white} />
        </Pressable>

        <View className="mt-4 items-center">
          <View
            className="mb-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
          >
            <Ionicons name="mail-open" size={28} color={colors.white} />
          </View>
          <Text
            className="text-[11px] font-bold uppercase"
            style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 2 }}
          >
            Lời mời chính thức
          </Text>
          <Text className="mt-1.5 text-center text-[22px] font-bold text-white">
            Gia nhập đội môi trường
          </Text>
        </View>
      </LinearGradient>

      {loadState === 'loading' ? (
        <View className="flex-1 items-center justify-center px-8" style={{ marginTop: -40 }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadState === 'not-found' || !invitation ? (
        <View className="flex-1 items-center justify-center px-8" style={{ marginTop: -40 }}>
          <View
            className="mx-4 w-full items-center rounded-[28px] bg-white px-6 py-10"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.08,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }}
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface">
              <Ionicons name="alert-circle-outline" size={30} color={colors.textSecondary} />
            </View>
            <Text className="text-center text-base font-semibold text-textPrimary">
              Không tìm thấy lời mời
            </Text>
            <Text className="mt-1.5 text-center text-sm leading-5 text-textSecondary">
              Lời mời không tồn tại, đã hết hạn hoặc đã được xử lý trước đó.
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-1 px-5" style={{ marginTop: -40 }}>
          {/* Ticket card */}
          <View
            className="overflow-hidden rounded-[28px] bg-white"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.1,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 4,
            }}
          >
            <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Text className="text-[16px] font-bold" style={{ color: colors.primaryDark }}>
                  {initials(invitation.invitedByName)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-textSecondary">Người mời bạn</Text>
                <Text className="text-[15px] font-bold text-textPrimary" numberOfLines={1}>
                  {invitation.invitedByName}
                </Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Ionicons name={ROLE_META[invitation.targetRole].icon} size={13} color={colors.primaryDark} />
                <Text className="text-[11px] font-bold" style={{ color: colors.primaryDark }}>
                  {ROLE_META[invitation.targetRole].label}
                </Text>
              </View>
            </View>

            <View className="px-3">
              <TicketNotch />
            </View>

            <View className="gap-4 px-5 py-5">
              <View className="flex-row gap-4">
                <MetaItem icon="business-outline" label="Đơn vị" value={invitation.officeName} />
                {invitation.teamName ? (
                  <MetaItem icon="people-outline" label="Đội" value={invitation.teamName} />
                ) : null}
              </View>

              <View
                className="flex-row items-center justify-between rounded-2xl px-4 py-3"
                style={{ backgroundColor: isUrgent ? '#FEF3E2' : colors.surface }}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="hourglass-outline"
                    size={16}
                    color={isUrgent ? colors.warning : colors.textSecondary}
                  />
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: isUrgent ? colors.warning : colors.textSecondary }}
                  >
                    {isPending
                      ? remainingDays > 0
                        ? `Còn ${remainingDays} ngày để phản hồi`
                        : 'Hết hạn hôm nay'
                      : 'Hạn phản hồi'}
                  </Text>
                </View>
                <Text className="text-[12px] text-textSecondary">
                  {new Date(invitation.expiresAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {isExpired || isResolved ? <StatusBanner invitation={invitation} /> : null}

          {actionError ? (
            <Text className="mt-4 text-center text-sm text-error">{actionError}</Text>
          ) : null}

          {isPending ? (
            <View className="mt-auto flex-row gap-3 pb-8 pt-6">
              <ActionButton
                label="Từ chối"
                variant="decline"
                loading={isDeclining}
                disabled={isAccepting}
                onPress={() => void handleDecline()}
              />
              <ActionButton
                label="Chấp nhận lời mời"
                variant="accept"
                loading={isAccepting}
                disabled={isDeclining}
                onPress={() => void handleAccept()}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
