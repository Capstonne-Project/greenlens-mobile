import { Text } from '@/components/ui/text';
import { useReopenEvidence } from '@/hooks/useReopenEvidence';
import { colors } from '@/theme/colors';
import {
  REOPEN_EVIDENCE_MAX_IMAGES,
  REOPEN_REASON_MAX_LENGTH,
  REOPEN_REASON_MIN_LENGTH,
  type RequestReopenDto,
} from '@/types/report-detail.types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReopenRequestModalProps {
  visible: boolean;
  reportId: string | undefined;
  isSubmitting: boolean;
  /** Lỗi trả về từ BE sau khi submit (đã map sang tiếng Việt) */
  submitError?: string | null;
  onDismiss: () => void;
  onSubmit: (dto: RequestReopenDto) => Promise<void>;
}

/** Damping cao để nút co lại rồi dừng hẳn, không dao động qua lại. */
const PRESS_SPRING = { damping: 18, stiffness: 280 };

interface PressableScaleProps {
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  style?: object;
  children: ReactNode;
}

function PressableScale({ onPress, disabled, className, style, children }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * BR-REP-015: gửi yêu cầu mở lại kèm lý do (≥ 20 ký tự) và 1–5 ảnh minh chứng.
 * Báo cáo vẫn ở trạng thái Resolved cho tới khi cán bộ duyệt yêu cầu.
 */
export function ReopenRequestModal({
  visible,
  reportId,
  isSubmitting,
  submitError,
  onDismiss,
  onSubmit,
}: ReopenRequestModalProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const { images, isUploading, evidenceError, pickImages, removeImage, reset } =
    useReopenEvidence(reportId);

  useEffect(() => {
    if (!visible) {
      setReason('');
      setReasonTouched(false);
      reset();
    }
  }, [visible, reset]);

  const trimmedReason = reason.trim();
  const reasonTooShort = trimmedReason.length < REOPEN_REASON_MIN_LENGTH;
  const showReasonError = reasonTouched && reasonTooShort;
  const hasEvidence = images.length > 0;
  const canSubmit = !reasonTooShort && hasEvidence && !isUploading && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setReasonTouched(true);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSubmit({
      reason: trimmedReason,
      imageUrls: images.map((image) => image.url),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          >
            <Pressable className="flex-1" onPress={onDismiss} />
          </Animated.View>

          <Animated.View
            // Timing thay vì springify: sheet trượt thẳng lên rồi dừng, không nảy lại.
            entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(220).easing(Easing.in(Easing.cubic))}
            className="rounded-t-2xl bg-white"
            style={{ paddingBottom: insets.bottom + 16, maxHeight: '88%' }}
          >
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            <View className="flex-row items-start justify-between px-4 pt-3">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-textPrimary">Yêu cầu mở lại báo cáo</Text>
                <Text className="mt-1 text-sm text-textSecondary">
                  Yêu cầu sẽ được gửi tới cán bộ xem xét. Báo cáo giữ nguyên trạng thái cho tới khi
                  được duyệt.
                </Text>
              </View>
              <Pressable onPress={onDismiss} hitSlop={10} className="p-1">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              className="px-4"
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text className="mb-2 text-sm font-semibold text-textPrimary">
                Lý do chưa hài lòng
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                onBlur={() => setReasonTouched(true)}
                multiline
                maxLength={REOPEN_REASON_MAX_LENGTH}
                textAlignVertical="top"
                placeholder="Mô tả cụ thể vấn đề còn tồn tại tại hiện trường…"
                placeholderTextColor={colors.textDisabled}
                className="min-h-[110px] rounded-xl border p-3 text-base text-textPrimary"
                style={{
                  borderColor: showReasonError ? colors.error : colors.border,
                  backgroundColor: colors.surface,
                }}
              />
              <View className="mt-1.5 flex-row items-center justify-between">
                <Text
                  className="text-xs"
                  style={{ color: showReasonError ? colors.error : colors.textSecondary }}
                >
                  {showReasonError
                    ? `Cần ít nhất ${REOPEN_REASON_MIN_LENGTH} ký tự`
                    : `Tối thiểu ${REOPEN_REASON_MIN_LENGTH} ký tự`}
                </Text>
                <Text className="text-xs text-textSecondary">
                  {trimmedReason.length}/{REOPEN_REASON_MAX_LENGTH}
                </Text>
              </View>

              <Text className="mb-2 mt-5 text-sm font-semibold text-textPrimary">
                Ảnh minh chứng ({images.length}/{REOPEN_EVIDENCE_MAX_IMAGES})
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {images.map((image) => (
                  <View key={image.url} className="h-20 w-20 overflow-hidden rounded-xl">
                    <Image
                      source={{ uri: image.previewUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => removeImage(image.url)}
                      hitSlop={6}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5"
                    >
                      <Ionicons name="close" size={13} color="#fff" />
                    </Pressable>
                  </View>
                ))}

                {images.length < REOPEN_EVIDENCE_MAX_IMAGES ? (
                  <>
                    <PressableScale
                      onPress={() => void pickImages('camera')}
                      disabled={isUploading}
                      className="h-20 w-20 items-center justify-center rounded-xl border border-dashed"
                      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                      )}
                    </PressableScale>
                    <PressableScale
                      onPress={() => void pickImages('library')}
                      disabled={isUploading}
                      className="h-20 w-20 items-center justify-center rounded-xl border border-dashed"
                      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                    >
                      <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                    </PressableScale>
                  </>
                ) : null}
              </View>

              {!hasEvidence && reasonTouched ? (
                <Text className="mt-2 text-xs" style={{ color: colors.error }}>
                  Cần ít nhất 1 ảnh minh chứng.
                </Text>
              ) : null}

              {evidenceError ? (
                <Text className="mt-2 text-xs" style={{ color: colors.error }}>
                  {evidenceError}
                </Text>
              ) : null}

              {submitError ? (
                <View className="mt-3 rounded-xl p-3" style={{ backgroundColor: '#FEF2F2' }}>
                  <Text className="text-sm" style={{ color: colors.error }}>
                    {submitError}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="flex-row gap-3 px-4 pt-3">
              <View className="flex-1">
                <PressableScale
                  onPress={onDismiss}
                  disabled={isSubmitting}
                  className="h-12 items-center justify-center rounded-xl border border-border"
                >
                  <Text className="font-bold text-textSecondary">Huỷ</Text>
                </PressableScale>
              </View>
              <View className="flex-1">
                <PressableScale
                  onPress={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="h-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: colors.primary,
                    opacity: canSubmit ? 1 : 0.45,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-bold text-white">Gửi yêu cầu</Text>
                  )}
                </PressableScale>
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
