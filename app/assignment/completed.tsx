import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export default function AssignmentCompletedScreen() {
  const insets = useSafeAreaInsets();
  const { reportCode } = useLocalSearchParams<{ reportCode?: string }>();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View
      className="flex-1 items-center justify-center bg-background px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <View
        className="mb-6 h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: '#D1FAE5' }}
      >
        <Ionicons name="checkmark-done" size={48} color={colors.primary} />
      </View>

      <Text className="mb-2 text-center text-2xl font-bold text-textPrimary">
        Phần việc đã hoàn thành
      </Text>

      {reportCode ? (
        <Text className="mb-2 text-center text-sm text-textSecondary">
          Mã báo cáo: {reportCode}
        </Text>
      ) : null}

      <Text className="mb-10 max-w-xs text-center text-sm leading-5 text-textSecondary">
        Đội của bạn đã xác nhận hoàn thành. Báo cáo sẽ chuyển sang Resolved khi tất cả đội được giao đều hoàn thành.
      </Text>

      <Animated.View style={[animStyle, { width: '100%' }]}>
        <Pressable
          onPress={() => router.replace('/(staff)/home' as never)}
          onPressIn={() => { scale.value = withSpring(0.96); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          className="h-14 w-full items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-base font-bold text-white">Về trang chủ</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
