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
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, useToast } from '@/components/common/Toast';
import { Text } from '@/components/ui/text';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { useAssignmentProgressImagesStore } from '@/stores/assignmentProgressImages.store';
import { colors } from '@/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  time: string;
  note: string;
  percent: number;
}

interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

// ─── Quick percent chip ───────────────────────────────────────────────────────

interface PercentChipProps {
  value: number;
  isActive: boolean;
  onPress: () => void;
}

function PercentChip({ value, isActive, onPress }: PercentChipProps) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 14, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 300 }); }}
        className="min-w-[52px] items-center justify-center rounded-full px-3 py-1.5"
        style={{
          backgroundColor: isActive ? colors.primary : '#F3F4F6',
        }}
      >
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? '#fff' : colors.textSecondary }}
        >
          {value}%
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

interface ThumbProps {
  uri: string;
  onRemove: () => void;
}

function ImageThumb({ uri, onRemove }: ThumbProps) {
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

// ─── Add photo button ─────────────────────────────────────────────────────────

function AddPhotoButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <View className="flex-row items-start py-3">
      <Text className="w-12 text-sm font-semibold text-textSecondary">{entry.time}</Text>
      <Text className="flex-1 text-sm text-textPrimary leading-5 px-2" numberOfLines={2}>
        {entry.note}
      </Text>
      <View
        className="items-center justify-center rounded-full px-2 py-0.5 ml-2"
        style={{ backgroundColor: '#ECFDF5' }}
      >
        <Text className="text-xs font-bold" style={{ color: colors.primary }}>
          {entry.percent}%
        </Text>
      </View>
    </View>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {text}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const QUICK_PERCENTS = [25, 50, 75, 100];

export default function ProgressUpdateScreen() {
  const insets = useSafeAreaInsets();
  const {
    reportId,
    currentPercent: currentPercentParam,
    lastUpdatedHoursAgo: hoursParam,
    historyJson,
  } = useLocalSearchParams<{
    reportId: string;
    currentPercent: string;
    lastUpdatedHoursAgo: string;
    historyJson: string;
  }>();

  const initPercent     = parseInt(currentPercentParam ?? '0', 10);
  const hoursAgo        = hoursParam ? parseInt(hoursParam, 10) : null;
  const todayHistory: HistoryEntry[] = historyJson
    ? (JSON.parse(historyJson) as HistoryEntry[])
    : [];

  const [percent, setPercent]     = useState(initPercent);
  const [inputText, setInputText] = useState(String(initPercent));
  const [note, setNote]           = useState('');
  const [images, setImages]       = useState<PickedImage[]>([]);
  const [submitting, setSubmit]   = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const showWarning = hoursAgo !== null && hoursAgo >= 2;

  // Sync input text → percent value
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    const n = parseInt(text, 10);
    if (!isNaN(n) && n >= 0 && n <= 100) setPercent(n);
  }, []);

  const handleChipPress = useCallback((val: number) => {
    setPercent(val);
    setInputText(String(val));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const pickImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      const picked = result.assets
        .slice(0, 5 - images.length)
        .map((a) => ({
          uri: a.uri,
          mimeType: a.mimeType ?? 'image/jpeg',
          fileName: a.fileName ?? 'progress.jpg',
        }));
      setImages((prev) => [...prev, ...picked].slice(0, 5));
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !reportId) return;
    setSubmit(true);
    setApiError(null);
    try {
      const response = await cleanupAssignmentService.updateProgress(reportId, {
        progressPercent: percent,
        progressNote: note.trim() || undefined,
        images,
      });
      const uploadedImageUrls = response.data.data.uploadedImageUrls ?? [];
      if (uploadedImageUrls.length > 0) {
        useAssignmentProgressImagesStore.getState().appendUrls(reportId, uploadedImageUrls);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        uploadedImageUrls.length > 0
          ? `Đã cập nhật tiến độ (${uploadedImageUrls.length} ảnh)!`
          : 'Đã cập nhật tiến độ thành công!',
      );
      setTimeout(() => router.back(), 1400);
    } catch {
      setApiError('Không thể gửi cập nhật. Vui lòng thử lại.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmit(false);
    }
  }, [submitting, reportId, percent, note, images, showToast]);

  const validPercent = percent >= 0 && percent <= 100;
  const canSubmit    = validPercent && !submitting;

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 pb-3 pt-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="mr-3 h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-[17px] font-bold text-textPrimary">Cập nhật tiến độ</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Warning banner ── */}
        {showWarning && (
          <View
            className="mx-4 mb-4 flex-row items-start gap-2 rounded-2xl px-4 py-3"
            style={{ backgroundColor: '#FFFBEB' }}
          >
            <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5" style={{ color: '#92400E' }}>
              <Text className="font-semibold" style={{ color: '#92400E' }}>
                Chưa cập nhật trong {hoursAgo} giờ qua.
              </Text>
              {' '}Vui lòng cập nhật để tránh cảnh báo SLA.
            </Text>
          </View>
        )}

        <View className="px-4">
          {/* ── Percent section ── */}
          <SectionLabel text="Tỷ lệ hoàn thành" />

          {/* Big number + input */}
          <View className="mb-3 flex-row items-end gap-1">
            <TextInput
              value={inputText}
              onChangeText={handleInputChange}
              keyboardType="number-pad"
              maxLength={3}
              style={{
                fontSize: 52,
                fontWeight: '800',
                color: colors.textPrimary,
                lineHeight: 60,
                minWidth: 80,
                includeFontPadding: false,
              }}
            />
            <Text
              className="mb-2 text-2xl font-bold"
              style={{ color: colors.textSecondary }}
            >
              %
            </Text>
          </View>

          {/* Quick chips */}
          <View className="mb-3 flex-row gap-2">
            {QUICK_PERCENTS.map((v) => (
              <PercentChip
                key={v}
                value={v}
                isActive={percent === v}
                onPress={() => handleChipPress(v)}
              />
            ))}
          </View>

          {/* Progress bar */}
          <View
            className="mb-6 h-2 overflow-hidden rounded-full"
            style={{ backgroundColor: '#E5E7EB' }}
          >
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(Math.max(percent, 0), 100)}%` as `${number}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>

          {/* ── Note section ── */}
          <SectionLabel text="Nội dung cập nhật" />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Mô tả tiến độ hiện tại..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{
              fontSize: 14,
              color: colors.textPrimary,
              minHeight: 88,
              lineHeight: 22,
              paddingBottom: 8,
              borderBottomWidth: 2,
              borderBottomColor: colors.primary,
              marginBottom: 24,
            }}
          />

          {/* ── Images section ── */}
          <SectionLabel text={`Đính kèm · ${images.length} ảnh`} />
          <View className="mb-6 flex-row flex-wrap gap-0">
            {images.map((img, i) => (
              <ImageThumb key={i} uri={img.uri} onRemove={() => removeImage(i)} />
            ))}
            {images.length < 5 && (
              <AddPhotoButton onPress={pickImages} />
            )}
          </View>

          {/* ── Today's history ── */}
          {todayHistory.length > 0 && (
            <>
              <SectionLabel text="Lịch sử cập nhật hôm nay" />
              <View>
                {todayHistory.map((entry, i) => (
                  <View key={i}>
                    <HistoryRow entry={entry} />
                    {i < todayHistory.length - 1 && (
                      <View className="h-px bg-border" />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* API error */}
          {apiError && (
            <Text className="mt-3 text-sm" style={{ color: colors.error }}>
              {apiError}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ── Submit button ── */}
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              className="text-base font-bold"
              style={{ color: canSubmit ? '#fff' : colors.textDisabled }}
            >
              Gửi cập nhật
            </Text>
          )}
        </Pressable>
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
