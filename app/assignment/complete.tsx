import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import { getResolveErrorMessage } from '@/utils/cleanup-resolve-error';

export interface LocalImageFile {
  uri: string;
  mimeType: string;
  fileName: string;
}

const MIN_AFTER_IMAGES = 2;
const MAX_AFTER_IMAGES = 5;

interface ImageThumbProps {
  uri: string;
  onRemove: () => void;
}

function ImageThumb({ uri, onRemove }: ImageThumbProps) {
  return (
    <View style={{ width: 80, height: 80, marginRight: 10 }}>
      <Image
        source={{ uri }}
        style={{ width: 80, height: 80, borderRadius: 12 }}
        contentFit="cover"
      />
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.error,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={13} color="#fff" />
      </Pressable>
    </View>
  );
}

function AddPhotoButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 14, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 300 }); }}
        style={{
          width: 80,
          height: 80,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F9FAFB',
        }}
      >
        <Ionicons name="add" size={28} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export default function AssignmentCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { reportId, reportCode, currentPercent: currentPercentParam } = useLocalSearchParams<{
    reportId: string;
    reportCode?: string;
    currentPercent?: string;
  }>();

  const progressPercent = Math.min(
    100,
    Math.max(0, parseInt(currentPercentParam ?? '100', 10) || 0),
  );

  const [images, setImages] = useState<LocalImageFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'resolving'>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  const pickImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      const picked = result.assets
        .slice(0, MAX_AFTER_IMAGES - images.length)
        .map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          fileName: asset.fileName ?? `after_${Date.now()}.jpg`,
        }));
      setImages((prev) => [...prev, ...picked].slice(0, MAX_AFTER_IMAGES));
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !reportId || images.length < MIN_AFTER_IMAGES) return;
    setSubmitting(true);
    setApiError(null);
    setUploadStep('uploading');
    try {
      const afterImageUrls = await cleanupAssignmentService.uploadAfterImagesForResolve(
        reportId,
        images,
        progressPercent,
      );
      if (afterImageUrls.length < MIN_AFTER_IMAGES) {
        throw new Error('Upload không trả về đủ URL ảnh. Vui lòng thử lại.');
      }
      setUploadStep('resolving');
      await cleanupAssignmentService.resolve(reportId, { afterImageUrls });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/assignment/completed',
        params: { reportCode: reportCode ?? '' },
      } as never);
    } catch (error) {
      setApiError(getResolveErrorMessage(error));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitting(false);
      setUploadStep('idle');
    }
  }, [submitting, reportId, images, reportCode, progressPercent]);

  const canSubmit = images.length >= MIN_AFTER_IMAGES && !submitting;
  const submitLabel =
    uploadStep === 'uploading'
      ? 'Đang tải ảnh lên...'
      : uploadStep === 'resolving'
        ? 'Đang hoàn thành...'
        : 'Xác nhận hoàn thành';

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 pb-3 pt-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text className="text-[17px] font-bold text-textPrimary">Hoàn thành nhiệm vụ</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View className="mx-4 mb-4 flex-row items-start gap-2 rounded-2xl bg-surface px-4 py-3">
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5 text-textSecondary">
              Tải lên ít nhất {MIN_AFTER_IMAGES} ảnh hiện trường sau khi dọn xong. Ảnh sẽ được upload qua API tiến độ trước khi xác nhận hoàn thành.
            </Text>
          </View>

          <View className="px-4">
            <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
              Ảnh after · {images.length}/{MIN_AFTER_IMAGES} tối thiểu
            </Text>
            <View className="mb-4 flex-row flex-wrap">
              {images.map((img, index) => (
                <ImageThumb key={`${img.uri}-${index}`} uri={img.uri} onRemove={() => removeImage(index)} />
              ))}
              {images.length < MAX_AFTER_IMAGES && <AddPhotoButton onPress={pickImages} />}
            </View>

            {images.length > 0 && images.length < MIN_AFTER_IMAGES && (
              <Text className="mb-4 text-sm text-textSecondary">
                Cần thêm {MIN_AFTER_IMAGES - images.length} ảnh nữa để hoàn thành.
              </Text>
            )}

            {apiError && (
              <Text className="text-sm" style={{ color: colors.error }}>
                {apiError}
              </Text>
            )}
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className="h-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: canSubmit ? colors.primary : colors.border }}
          >
            {submitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-base font-bold text-white">{submitLabel}</Text>
              </View>
            ) : (
              <Text
                className="text-base font-bold"
                style={{ color: canSubmit ? '#fff' : colors.textDisabled }}
              >
                {submitLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
