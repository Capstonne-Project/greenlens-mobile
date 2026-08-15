import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { PlaceSuggestion } from '@/types/place-search.types';

const SPRING = { damping: 18, stiffness: 280 };

interface PlaceSuggestionRowProps {
  suggestion: PlaceSuggestion;
  onPress: (suggestion: PlaceSuggestion) => void;
}

export function PlaceSuggestionRow({ suggestion, onPress }: PlaceSuggestionRowProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isProvince = suggestion.kind === 'province';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(suggestion)}
        onPressIn={() => {
          scale.value = withSpring(0.98, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        className="flex-row items-center gap-3 px-4 py-3"
      >
        <Ionicons
          name={isProvince ? 'business-outline' : 'location-outline'}
          size={19}
          color={colors.textSecondary}
        />

        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-textPrimary" numberOfLines={1}>
            {suggestion.name}
          </Text>
          {suggestion.subtitle ? (
            <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
              {suggestion.subtitle}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      </Pressable>
    </Animated.View>
  );
}
