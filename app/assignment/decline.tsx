import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, useToast } from '@/components/common/Toast';
import { Text } from '@/components/ui/text';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { firstRouteParam } from '@/utils/field-worker-task';
import { colors } from '@/theme/colors';
import type { DeclineAssignmentDto } from '@/types/cleanup-assignment.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const DECLINE_WINDOW_SEC = 24 * 60 * 60; // 24 giờ (khớp BE BR-CLN-007)

const DECLINE_REASONS = [
  'Ngoài khu vực phụ trách',
  'Đội đã đủ tải hôm nay',
  'Không đủ phương tiện phù hợp',
  'Lý do khác',
];

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(Math.max(0, initialSeconds));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialSeconds <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [initialSeconds]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return { remaining, total: Math.max(1, initialSeconds), expired: remaining <= 0, display };
}

// ─── Blinking timer text ──────────────────────────────────────────────────────

function CountdownText({ display, expired }: { display: string; expired: boolean }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (expired) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.25, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
      );
    } else {
      opacity.value = 1;
    }
  }, [expired, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text
      style={[
        style,
        {
          fontSize: 54,
          fontWeight: '800',
          letterSpacing: 3,
          color: expired ? colors.error : '#F97316',
          // tabular nums so digits don't jump
          fontVariant: ['tabular-nums'],
        },
      ]}
    >
      {display}
    </Animated.Text>
  );
}

// ─── Radio row ────────────────────────────────────────────────────────────────

interface RadioRowProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function RadioRow({ label, selected, onSelect }: RadioRowProps) {
  return (
    <Pressable onPress={onSelect} className="flex-row items-center gap-3 py-3.5">
      {/* outer ring */}
      <View
        className="h-[22px] w-[22px] items-center justify-center rounded-full border-2"
        style={{ borderColor: selected ? '#F97316' : colors.border }}
      >
        {selected && (
          <View className="h-[11px] w-[11px] rounded-full" style={{ backgroundColor: '#F97316' }} />
        )}
      </View>
      <Text
        className="flex-1 text-[15px]"
        style={{
          color: selected ? colors.textPrimary : colors.textSecondary,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DeclineScreen() {
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    assignedAt: string | string[];
    declineDeadlineAt?: string | string[];
  }>();
  const reportId = firstRouteParam(params.reportId);
  const assignedAt = firstRouteParam(params.assignedAt);
  const declineDeadlineAt = firstRouteParam(params.declineDeadlineAt);
  const insets = useSafeAreaInsets();
  const { teamId, isLeader, isLoading: isAccessLoading } = useTeamAccess();

  // Ưu tiên deadline BE trả về; fallback assignedAt + 24h cho dữ liệu cũ.
  const initialSeconds = (() => {
    const deadline = declineDeadlineAt
      ? new Date(declineDeadlineAt).getTime()
      : assignedAt
        ? new Date(assignedAt).getTime() + DECLINE_WINDOW_SEC * 1000
        : Date.now() + DECLINE_WINDOW_SEC * 1000;
    return Math.floor((deadline - Date.now()) / 1000);
  })();

  const { remaining, total, expired, display } = useCountdown(initialSeconds);

  const assignedTimeLabel = assignedAt
    ? new Date(assignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const [selectedReason, setReason] = useState(DECLINE_REASONS[0]);
  const [note, setNote]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState<string | null>(null);
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const isOther      = selectedReason === 'Lý do khác';
  const noteValid    = !isOther || note.trim().length >= 20;
  const canSubmit =
    isLeader &&
    !!teamId &&
    !isAccessLoading &&
    !expired &&
    !submitting &&
    noteValid;

  const handleSubmit = useCallback(async () => {
    if (!reportId || !teamId || !canSubmit) return;
    const reason = isOther ? note.trim() : selectedReason;
    setSubmitting(true);
    setApiError(null);
    try {
      await cleanupAssignmentService.decline(reportId, {
        teamId,
        reason,
      } as DeclineAssignmentDto);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Đã từ chối nhiệm vụ thành công.', 'warning');
      setTimeout(() => { router.back(); router.back(); }, 1400);
    } catch {
      setApiError('Không thể gửi từ chối. Vui lòng thử lại.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitting(false);
    }
  }, [reportId, teamId, canSubmit, isOther, note, selectedReason, showToast]);

  const progressPct = Math.round((remaining / total) * 100);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Back arrow only */}
      <View className="px-4 pb-2 pt-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* ── Countdown block ── */}
        <View className="items-center px-6 pb-6 pt-2">
          {/* Label */}
          <Text
            className="mb-3 text-[13px] font-semibold tracking-wide"
            style={{ color: expired ? colors.error : colors.textSecondary }}
          >
            {expired ? 'HẾT THỜI GIAN TỪ CHỐI' : 'CỬA SỔ TỪ CHỐI CÒN'}
          </Text>

          {/* Big timer */}
          <CountdownText display={display} expired={expired} />

          {/* Sub-label: clock + assigned time */}
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text className="text-[13px] text-textSecondary">
              Giao lúc {assignedTimeLabel} · cửa sổ 24 giờ
            </Text>
          </View>

          {/* Progress bar */}
          <View
            className="mt-4 h-[5px] w-full overflow-hidden rounded-full"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <View
              className="h-full rounded-full"
              style={{
                width: `${progressPct}%` as `${number}%`,
                backgroundColor: expired ? colors.error : '#F97316',
              }}
            />
          </View>
        </View>

        {/* ── Expired banner ── */}
        {expired && (
          <View className="mx-6 mb-4 flex-row items-start gap-2 rounded-2xl bg-red-50 px-4 py-3">
            <Ionicons name="alert-circle" size={17} color={colors.error} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5" style={{ color: '#991B1B' }}>
              Task này đã hết cửa sổ từ chối.{'\n'}Bạn phải xử lý hoặc escalate.
            </Text>
          </View>
        )}

        {/* ── Reasons ── */}
        <View className="px-6">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Lý do từ chối
          </Text>

          <View>
            {DECLINE_REASONS.map((r, i) => (
              <View key={r}>
                <RadioRow
                  label={r}
                  selected={selectedReason === r}
                  onSelect={() => {
                    setReason(r);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
                {i < DECLINE_REASONS.length - 1 && <View className="h-px bg-border" />}
              </View>
            ))}
          </View>

          {/* ── Note ── */}
          <Text className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Ghi chú bổ sung
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Điểm này thuộc khu vực Q3, đề nghị chuyển cho đội Cleanup Q3-002."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            style={{
              fontSize: 14,
              color: colors.textPrimary,
              minHeight: 72,
              textAlignVertical: 'top',
              paddingTop: 2,
            }}
          />
          {isOther && note.trim().length > 0 && note.trim().length < 20 && (
            <Text className="mt-1 text-xs" style={{ color: colors.error }}>
              Tối thiểu 20 ký tự ({note.trim().length}/20)
            </Text>
          )}

          {/* ── Warning note ── */}
          <View className="mt-5 flex-row items-start gap-2">
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={colors.textSecondary}
              style={{ marginTop: 1 }}
            />
            <Text className="flex-1 text-[12px] leading-[18px] text-textSecondary">
              Sau khi hết cửa sổ 24 giờ, task sẽ{' '}
              <Text className="font-semibold text-textSecondary">không thể từ chối</Text>
              {' '}và bạn phải xử lý hoặc escalate.
            </Text>
          </View>

          {apiError && (
            <Text className="mt-3 text-sm" style={{ color: colors.error }}>{apiError}</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom buttons ── */}
      <View
        className="border-t border-border bg-white px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            className="flex-1 items-center justify-center rounded-2xl border border-border"
            style={{ height: 52 }}
          >
            <Text className="text-[15px] font-semibold text-textSecondary">Hủy</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 items-center justify-center rounded-2xl"
            style={{ height: 52, backgroundColor: canSubmit ? '#EF4444' : colors.border }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                className="text-[15px] font-bold"
                style={{ color: canSubmit ? '#fff' : colors.textDisabled }}
              >
                Xác nhận từ chối
              </Text>
            )}
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>

      <Toast
        visible={toastState.visible}
        type={toastState.type}
        message={toastState.message}
        onHide={hideToast}
      />
    </View>
  );
}
