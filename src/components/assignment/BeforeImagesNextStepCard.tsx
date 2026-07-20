import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface BeforeImagesNextStepCardProps {
  onPressPrimary: () => void;
}

function PressScale({
  onPress,
  children,
  className,
  style,
}: {
  onPress: () => void;
  children: ReactNode;
  className?: string;
  style?: object;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function BeforeImagesNextStepCard({ onPressPrimary }: BeforeImagesNextStepCardProps) {
  return (
    <View className="mb-5 border-l-2 border-primary bg-surface px-4 py-4">
      <View className="mb-4 flex-row items-start gap-3">
        <Ionicons name="camera-outline" size={22} color={colors.primary} />
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Việc cần làm tiếp theo
          </Text>
          <Text className="mt-1 text-lg font-bold text-textPrimary">Chụp ảnh trước khi xử lý</Text>
          <Text className="mt-1 text-sm leading-5 text-textSecondary">
            Ghi nhận ít nhất 1 ảnh hiện trạng trước khi bắt đầu dọn.
          </Text>
        </View>
      </View>

      <PressScale
        onPress={onPressPrimary}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{ backgroundColor: colors.primary }}
      >
        <Ionicons name="camera" size={18} color={colors.white} />
        <Text className="text-base font-bold text-white">Mở camera</Text>
      </PressScale>
    </View>
  );
}
