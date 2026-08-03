import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface AudioEvidenceRecorderProps {
  isRecording: boolean;
  durationSeconds: number;
  maxDurationSeconds: number;
  reachedLimit: boolean;
  uploading: boolean;
  onStart: () => void;
  onStop: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Nút thu âm bằng chứng — pulse khi đang ghi, tự cảnh báo khi gần hết thời lượng. */
export function AudioEvidenceRecorder({
  isRecording,
  durationSeconds,
  maxDurationSeconds,
  reachedLimit,
  uploading,
  onStart,
  onStop,
}: AudioEvidenceRecorderProps) {
  // Tự dừng khi chạm giới hạn để không vượt 10MB của BE.
  useEffect(() => {
    if (isRecording && reachedLimit) onStop();
  }, [isRecording, reachedLimit, onStop]);

  return (
    <View className="rounded-xl border border-border bg-surface p-3.5">
      <View className="mb-3 flex-row items-center gap-2.5">
        <Ionicons
          name={isRecording ? 'radio-button-on' : 'mic-outline'}
          size={20}
          color={isRecording ? colors.error : colors.textSecondary}
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-textPrimary">
            {isRecording ? 'Đang ghi âm…' : 'Ghi âm hiện trường'}
          </Text>
          <Text className="mt-0.5 text-xs text-textSecondary">
            {isRecording
              ? `${formatDuration(durationSeconds)} / ${formatDuration(maxDurationSeconds)}`
              : `Tối đa ${formatDuration(maxDurationSeconds)} · tùy chọn`}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        disabled={uploading}
        onPress={() => {
          if (isRecording) onStop();
          else onStart();
        }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{
          backgroundColor: uploading
            ? colors.textDisabled
            : isRecording
              ? colors.error
              : colors.primary,
        }}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={18} color={colors.white} />
        )}
        <Text className="text-sm font-bold text-white">
          {uploading ? 'Đang tải lên' : isRecording ? 'Dừng và lưu' : 'Bắt đầu ghi âm'}
        </Text>
      </Pressable>
    </View>
  );
}
