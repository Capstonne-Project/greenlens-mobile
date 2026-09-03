import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, useToast } from '@/components/common/Toast';
import { Text } from '@/components/ui/text';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import type { EscalateAssignmentDto } from '@/types/cleanup-assignment.types';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { firstRouteParam } from '@/utils/field-worker-task';

const MIN_REASON = 20;

const ESCALATE_TEMPLATES = [
  'Khối lượng vượt quá năng lực xử lý của đội, cần điều phối thêm nguồn lực.',
  'Hiện trường có yếu tố nguy hiểm/độc hại, cần đơn vị chuyên môn hỗ trợ.',
  'Vị trí không thể tiếp cận bằng phương tiện hiện có của đội.',
];

export default function EscalateScreen() {
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    reportCode?: string | string[];
  }>();
  const reportId = firstRouteParam(params.reportId);
  const reportCode = firstRouteParam(params.reportCode);
  const insets = useSafeAreaInsets();
  const { teamId, isLeader, isLoading: isAccessLoading, errorMessage: accessError } = useTeamAccess();

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  // Khoảng đệm dành riêng cho bàn phím — chỉ bật khi có ô đang gõ, để luôn có đủ chỗ
  // trống bên dưới nội dung mà cuộn lên tới, thay vì tự đo/đoán chiều cao bàn phím.
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const KEYBOARD_SPACE = 320;
  // Cuộn ScrollView để ô đang gõ luôn nổi trên bàn phím — KeyboardAvoidingView chỉ co
  // container lại chứ không tự biết cuộn tới đâu. Dùng measureInWindow trên chính input
  // (ổn định trên cả Paper lẫn Fabric/New Architecture).
  const scrollToInput: NonNullable<TextInputProps['onFocus']> = useCallback((event) => {
    const target = event.currentTarget;
    setKeyboardPadding(KEYBOARD_SPACE);
    setTimeout(() => {
      target.measureInWindow((_x, y, _w, height) => {
        const KEYBOARD_ESTIMATE = 300;
        const screenHeight = Dimensions.get('window').height;
        const visibleBottom = screenHeight - KEYBOARD_ESTIMATE;
        const inputBottom = y + height;
        if (inputBottom > visibleBottom) {
          const delta = inputBottom - visibleBottom + 24;
          scrollRef.current?.scrollTo({ y: scrollOffsetRef.current + delta, animated: true });
        }
      });
    }, 200);
  }, []);
  const handleFieldBlur = useCallback(() => setKeyboardPadding(0), []);

  const reasonValid = reason.trim().length >= MIN_REASON;
  const canSubmit = isLeader && !!teamId && !isAccessLoading && !submitting && reasonValid;

  const handleSubmit = useCallback(async () => {
    if (!reportId || !teamId || !canSubmit) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await cleanupAssignmentService.escalate(reportId, {
        teamId,
        reason: reason.trim(),
      } as EscalateAssignmentDto);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Đã gửi yêu cầu chuyển cấp xử lý.', 'warning');
      setTimeout(() => {
        router.back();
        router.back();
      }, 1400);
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitting(false);
    }
  }, [reportId, teamId, canSubmit, reason, showToast]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 + keyboardPadding }}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View className="items-center px-6 pb-4 pt-2">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: '#FFF7ED' }}
          >
            <Ionicons name="arrow-up-circle" size={34} color="#F97316" />
          </View>
          <Text className="mt-3 text-xl font-bold text-textPrimary">Chuyển cấp xử lý</Text>
          <Text className="mt-1 text-center text-sm text-textSecondary">
            {reportCode ? `${reportCode} · ` : ''}Báo cáo vượt khả năng xử lý của đội sẽ được chuyển lên
            LEO điều phối.
          </Text>
        </View>

        <View className="px-6">
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Mẫu lý do nhanh
          </Text>
          <View className="gap-2">
            {ESCALATE_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl}
                onPress={() => {
                  setReason(tpl);
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <Text className="text-sm leading-5 text-textPrimary">{tpl}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Lý do chi tiết
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            onFocus={scrollToInput}
            onBlur={handleFieldBlur}
            placeholder="Mô tả rõ lý do cần chuyển cấp (tối thiểu 20 ký tự)"
            placeholderTextColor={colors.textDisabled}
            multiline
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-textPrimary"
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          {reason.trim().length > 0 && !reasonValid ? (
            <Text className="mt-1 text-xs" style={{ color: colors.error }}>
              Tối thiểu {MIN_REASON} ký tự ({reason.trim().length}/{MIN_REASON})
            </Text>
          ) : null}

          {!isAccessLoading && !isLeader ? (
            <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-surface px-3 py-2.5">
              <Ionicons name="lock-closed-outline" size={15} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs leading-5 text-textSecondary">
                {accessError ?? 'Chỉ trưởng nhóm mới được chuyển cấp xử lý.'}
              </Text>
            </View>
          ) : null}

          {apiError ? (
            <Text className="mt-3 text-sm" style={{ color: colors.error }}>
              {apiError}
            </Text>
          ) : null}
        </View>
      </ScrollView>

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
            style={{ height: 52, backgroundColor: canSubmit ? '#F97316' : colors.border }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                className="text-[15px] font-bold"
                style={{ color: canSubmit ? '#fff' : colors.textDisabled }}
              >
                Gửi chuyển cấp
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
