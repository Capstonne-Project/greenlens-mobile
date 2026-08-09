import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export type EvidenceMediaKind = 'video' | 'audio';

interface EvidencePlayerModalProps {
  visible: boolean;
  kind: EvidenceMediaKind;
  /** Public URL trên R2. */
  uri: string | null;
  title: string;
  onClose: () => void;
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function AudioBody({ uri }: { uri: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const position = status.currentTime;
  const duration = status.duration;
  const percent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <View className="w-full rounded-2xl bg-white p-5">
      <View className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </View>

      <View className="mb-4 flex-row justify-between">
        <Text className="text-xs text-textSecondary">{formatClock(position)}</Text>
        <Text className="text-xs text-textSecondary">{formatClock(duration)}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (status.playing) {
            player.pause();
            return;
          }
          // Phát lại từ đầu khi bản ghi đã chạy hết.
          if (duration > 0 && position >= duration - 0.25) {
            player.seekTo(0);
          }
          player.play();
        }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{ backgroundColor: colors.primary }}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.white} />
        <Text className="text-sm font-bold text-white">
          {status.playing ? 'Tạm dừng' : 'Phát'}
        </Text>
      </Pressable>
    </View>
  );
}

function VideoBody({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.play();
  });

  // Lấp đầy vùng còn lại; `contain` giữ nguyên tỉ lệ gốc, không cắt hình.
  return (
    <VideoView
      player={player}
      style={{ flex: 1, width: '100%' }}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

/**
 * Xem lại bằng chứng đã upload — video dùng expo-video, ghi âm dùng expo-audio.
 * Body chỉ mount khi `visible` để player không giữ tài nguyên lúc đóng.
 */
export function EvidencePlayerModal({
  visible,
  kind,
  uri,
  title,
  onClose,
}: EvidencePlayerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible && Boolean(uri)}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      {/* Nền đen đặc đặt bằng inline style — class opacity không phủ kín trên native. */}
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <View
          className="flex-1 items-center justify-center"
          style={{
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: kind === 'audio' ? 20 : 0,
          }}
        >
          {visible && uri ? (
            kind === 'video' ? (
              <VideoBody uri={uri} />
            ) : (
              <AudioBody uri={uri} />
            )
          ) : null}
        </View>

        {/* Header nổi trên video — absolute để video vẫn dùng trọn chiều cao. */}
        <View
          className="absolute left-0 right-0 flex-row items-center px-4"
          style={{ top: insets.top + 6 }}
          pointerEvents="box-none"
        >
          <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onClose}
            hitSlop={16}
            className="ml-3 h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
