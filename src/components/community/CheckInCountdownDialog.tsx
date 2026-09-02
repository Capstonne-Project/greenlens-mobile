import { Ionicons } from '@expo/vector-icons';
import { Modal, Platform, KeyboardAvoidingView, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { useDeadlineCountdown } from '@/utils/countdown';

interface CheckInCountdownDialogProps {
  visible: boolean;
  startsAt: string | null;
  onClose: () => void;
}

function formatStartsAtFull(iso: string): string {
  const d = new Date(iso);
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${time} ngày ${date}`;
}

/** Hiện khi cleaner bấm check-in/bắt đầu trước giờ StartsAt của chương trình — đếm ngược tới lúc mở nút. */
export function CheckInCountdownDialog({ visible, startsAt, onClose }: CheckInCountdownDialogProps) {
  const insets = useSafeAreaInsets();
  const countdown = useDeadlineCountdown(visible ? startsAt : null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="rounded-t-2xl bg-white px-4 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-4 flex-row items-start gap-3">
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">Chưa đến giờ bắt đầu</Text>
              <Text className="mt-1 text-sm leading-5 text-textSecondary">
                {startsAt
                  ? `Chương trình dự kiến bắt đầu lúc ${formatStartsAtFull(startsAt)}. Bạn có thể check-in khi đến giờ.`
                  : 'Chưa đến giờ bắt đầu chương trình.'}
              </Text>
            </View>
          </View>

          <View className="mb-4 items-center rounded-xl bg-surface py-6">
            <Text className="text-3xl font-bold text-primary">
              {countdown && !countdown.overdue ? countdown.label : '00:00'}
            </Text>
            <Text className="mt-1 text-xs text-textSecondary">còn lại</Text>
          </View>

          <Pressable
            onPress={onClose}
            className="mb-1 items-center justify-center rounded-xl"
            style={{ height: 48, backgroundColor: colors.primary }}
          >
            <Text className="font-bold text-white">Đã hiểu</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
