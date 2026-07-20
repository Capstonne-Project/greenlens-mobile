import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface AssignmentScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function AssignmentScreenHeader({
  title,
  subtitle,
  onBack = () => router.back(),
}: AssignmentScreenHeaderProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="border-b border-border bg-white px-4 pb-3 pt-2">
      <View className="flex-row items-center gap-3">
        <Animated.View style={animatedStyle}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            onPressIn={() => {
              scale.value = withSpring(0.92, { damping: 18, stiffness: 320 });
            }}
            onPressOut={() => {
              scale.value = withSpring(1, { damping: 18, stiffness: 320 });
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        </Animated.View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-textPrimary">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
