import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface AreaFocusChipProps {
  name: string;
  reportCount: number;
  isLoading: boolean;
  /** Vùng chưa có dữ liệu ranh giới trên BE */
  hasNoBoundary: boolean;
  onClear: () => void;
}

/** Chip hiện vùng đang xem trên map, bấm ✕ để bỏ focus. */
export function AreaFocusChip({
  name,
  reportCount,
  isLoading,
  hasNoBoundary,
  onClear,
}: AreaFocusChipProps) {
  return (
    <Animated.View entering={FadeInDown.duration(220)} className="self-start">
      <View
        className="flex-row items-center gap-2 rounded-full bg-white py-2 pl-3 pr-1.5"
        style={{
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Ionicons name="location" size={14} color={colors.primary} />

        <Text className="max-w-[180px] text-[13px] font-bold text-textPrimary" numberOfLines={1}>
          {name}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text className="text-[12px] text-textSecondary">
            · {hasNoBoundary ? 'chưa có ranh giới' : `${reportCount} báo cáo`}
          </Text>
        )}

        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center"
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
