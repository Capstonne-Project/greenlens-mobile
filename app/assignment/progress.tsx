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

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { AssignmentScreenHeader } from '@/components/assignment/AssignmentScreenHeader';
import { Toast, useToast } from '@/components/common/Toast';
import { Text } from '@/components/ui/text';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import { compressImage, UPLOAD_COMPRESS_PRESET } from '@/utils/compress-image';

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
  const [processing, setProcessing] = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);
  const { toastState, show: showToast, hide: hideToast } = useToast();
  const { isLeader, isLoading: isAccessLoading, errorMessage: accessError } = useTeamAccess();

  const showWarning = hoursAgo !== null && hoursAgo >= 24;

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
      quality: 1,
    });
    if (result.canceled) return;

    setProcessing(true);
    try {
      const assets = result.assets.slice(0, 5 - images.length);
      const picked = await Promise.all(
        assets.map((a) =>
          compressImage(a.uri, {
            ...UPLOAD_COMPRESS_PRESET,
            baseName: 'progress',
            sourceWidth: a.width,
            sourceHeight: a.height,
          }),
        ),
      );
      setImages((prev) => [...prev, ...picked].slice(0, 5));
    } finally {
      setProcessing(false);
    }
  }, [images.length]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setApiError('Cần quyền camera để chụp ảnh tiến độ.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;

    setProcessing(true);
    try {
      const asset = result.assets[0];
      const picked = await compressImage(asset.uri, {
        ...UPLOAD_COMPRESS_PRESET,
        baseName: 'progress',
        sourceWidth: asset.width,
        sourceHeight: asset.height,
      });
      setImages((current) => [...current, picked].slice(0, 5));
    } catch {
      setApiError('Không thể xử lý ảnh. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !isLeader || !reportId) return;
    setSubmit(true);
    setApiError(null);
    try {
      await cleanupAssignmentService.updateProgress(reportId, {
        progressPercent: percent,
        progressNote: note.trim() || undefined,
        images,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã cập nhật tiến độ thành công!');
      setTimeout(() => router.back(), 1400);
    } catch {
      setApiError('Không thể gửi cập nhật. Vui lòng thử lại.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmit(false);
    }
  }, [submitting, isLeader, reportId, percent, note, images, showToast]);

  const validPercent = percent >= 0 && percent <= 100;
  const canSubmit = isLeader && validPercent && !submitting && !processing;

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      <AssignmentScreenHeader title="Cập nhật tiến độ" subtitle="Bước tùy chọn · 2/3" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {!isAccessLoading && !isLeader ? (
          <View className="mx-4 mb-4 rounded-xl border border-border bg-surface p-4">
            <Text className="font-semibold text-textPrimary">Chỉ trưởng nhóm được cập nhật</Text>
            <Text className="mt-1 text-sm text-textSecondary">
              {accessError ?? 'Bạn có thể quay lại màn chi tiết để theo dõi nhiệm vụ.'}
            </Text>
          </View>
        ) : null}

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

        <View className="mx-4 mb-4 flex-row items-start gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: '#F0FDF4' }}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm leading-5 text-textSecondary">
            Cập nhật 100% không tự hoàn thành nhiệm vụ. Khi dọn xong, dùng nút &quot;Hoàn thành&quot; ở màn chi tiết để tải ảnh after.
          </Text>
        </View>

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
          <View className="mb-3 flex-row gap-2">
            <View className="flex-1">
              <AssignmentActionButton
                label="Chụp ảnh"
                icon="camera"
                onPress={takePhoto}
                variant="secondary"
                compact
                disabled={processing || images.length >= 5 || !isLeader}
              />
            </View>
            <View className="flex-1">
              <AssignmentActionButton
                label="Thư viện"
                icon="images-outline"
                onPress={pickImages}
                variant="quiet"
                compact
                disabled={processing || images.length >= 5 || !isLeader}
              />
            </View>
          </View>
          <View className="mb-6 flex-row flex-wrap gap-0">
            {images.map((img, i) => (
              <ImageThumb key={i} uri={img.uri} onRemove={() => removeImage(i)} />
            ))}
            {processing ? (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
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
        <AssignmentActionButton
          label="Lưu cập nhật"
          loadingLabel="Đang gửi cập nhật"
          icon="checkmark"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
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
