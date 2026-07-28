import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface ParticipantsSummaryCardProps {
  participantCount: number;
  maxParticipants: number;
  onPress: () => void;
}

export function ParticipantsSummaryCard({
  participantCount,
  maxParticipants,
  onPress,
}: ParticipantsSummaryCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const ratio = maxParticipants > 0 ? Math.min(1, participantCount / maxParticipants) : 0;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="mb-4 rounded-2xl border border-border bg-white p-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="people" size={20} color={colors.primary} />
            <View>
              <Text className="text-sm font-bold text-textPrimary">Người tham gia</Text>
              <Text className="text-xs text-textSecondary">Chạm để xem danh sách</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-lg font-extrabold" style={{ color: colors.primary }}>
              {participantCount}
            </Text>
            <Text className="text-sm font-semibold text-textSecondary">/{maxParticipants}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <View
            className="h-full rounded-full"
            style={{ width: `${ratio * 100}%` as `${number}%`, backgroundColor: colors.primary }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
