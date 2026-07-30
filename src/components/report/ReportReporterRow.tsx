import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { UserAvatar } from '@/components/common/UserAvatar';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { formatRelativeTime } from '@/utils/formatters';

const SPRING = { damping: 18, stiffness: 260 };

interface ReportReporterRowProps {
  reporterId: string | null;
  reporterName?: string | null;
  reporterAvatarUrl?: string | null;
  createdAt: string;
  onPress: (userId: string) => void;
}

/**
 * Hàng thông tin người gửi báo cáo — bấm vào để xem hồ sơ công khai.
 * Báo cáo ẩn danh (BR-REP-012) hoặc người gửi đã xóa tài khoản → không bấm được.
 */
export function ReportReporterRow({
  reporterId,
  reporterName,
  reporterAvatarUrl,
  createdAt,
  onPress,
}: ReportReporterRowProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isAnonymous = !reporterId || !reporterName;
  const displayName = isAnonymous ? 'Người dùng ẩn danh' : reporterName!;

  const content = (
    <View className="flex-row items-center gap-3">
      <UserAvatar
        name={displayName}
        avatarUrl={reporterAvatarUrl}
        size={40}
        isAnonymous={isAnonymous}
      />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="text-sm font-semibold text-textPrimary" numberOfLines={1}>
            {displayName}
          </Text>
          {!isAnonymous ? (
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs text-textSecondary">
          Đã gửi {formatRelativeTime(createdAt)}
        </Text>
      </View>
    </View>
  );

  if (isAnonymous) {
    return <View className="py-1">{content}</View>;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(reporterId!);
        }}
        onPressIn={() => {
          scale.value = withSpring(0.97, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        className="py-1"
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
