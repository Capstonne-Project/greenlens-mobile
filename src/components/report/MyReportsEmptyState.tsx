import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { MyReportsFilterKey } from '@/types/my-reports.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

interface MyReportsEmptyStateProps {
  filterKey: MyReportsFilterKey;
  onSwitchTab: (key: MyReportsFilterKey) => void;
  isSearchEmpty?: boolean;
}

interface EmptyConfig {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  primaryLabel: string;
  primaryIcon: keyof typeof Ionicons.glyphMap;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function MyReportsEmptyState({
  filterKey,
  onSwitchTab,
  isSearchEmpty = false,
}: MyReportsEmptyStateProps) {
  if (isSearchEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-10 py-20">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
          <Ionicons name="search-outline" size={28} color={colors.textSecondary} />
        </View>
        <Text className="mt-5 text-center text-lg font-semibold text-textPrimary">
          Không tìm thấy báo cáo
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
          Thử từ khóa khác — mã báo cáo, loại rác hoặc địa chỉ.
        </Text>
      </View>
    );
  }

  const config: EmptyConfig = (() => {
    switch (filterKey) {
      case 'InProgress':
        return {
          icon: 'sync-outline',
          title: 'Không có báo cáo đang xử lý',
          description: 'Báo cáo có thể đang chờ bạn xác nhận, hoặc đã hoàn thành.',
          primaryLabel: 'Xem tất cả',
          primaryIcon: 'list-outline',
          onPrimary: () => onSwitchTab('ALL'),
        };
      case 'NEEDS_CONFIRM':
        return {
          icon: 'hand-left-outline',
          title: 'Chưa có việc cần xác nhận',
          description: 'Khi đội xử lý xong, báo cáo sẽ hiện ở đây để bạn xác nhận.',
          primaryLabel: 'Xem đang xử lý',
          primaryIcon: 'sync-outline',
          onPrimary: () => onSwitchTab('InProgress'),
        };
      case 'REOPENED':
        return {
          icon: 'refresh-outline',
          title: 'Không có báo cáo mở lại',
          description: 'Báo cáo được mở lại hoặc đang chờ duyệt yêu cầu mở lại sẽ hiện ở đây.',
          primaryLabel: 'Xem tất cả',
          primaryIcon: 'list-outline',
          onPrimary: () => onSwitchTab('ALL'),
        };
      case 'DONE':
        return {
          icon: 'checkmark-done-outline',
          title: 'Chưa có báo cáo đã xong',
          description: 'Sau khi bạn xác nhận và đóng, báo cáo sẽ chuyển vào đây.',
          primaryLabel: 'Xem cần xác nhận',
          primaryIcon: 'hand-left-outline',
          onPrimary: () => onSwitchTab('NEEDS_CONFIRM'),
          secondaryLabel: 'Xem đang xử lý',
          onSecondary: () => onSwitchTab('InProgress'),
        };
      case 'Rejected':
        return {
          icon: 'close-circle-outline',
          title: 'Không có báo cáo bị từ chối',
          description: 'Các báo cáo bị từ chối hoặc trùng lặp sẽ hiển thị tại đây.',
          primaryLabel: 'Xem tất cả',
          primaryIcon: 'list-outline',
          onPrimary: () => onSwitchTab('ALL'),
        };
      default:
        return {
          icon: 'leaf-outline',
          title: 'Chưa có báo cáo nào',
          description: 'Gửi báo cáo đầu tiên để theo dõi tiến độ xử lý tại đây.',
          primaryLabel: 'Tạo báo cáo',
          primaryIcon: 'add',
          onPrimary: () => router.push('/report/create'),
        };
    }
  })();

  return (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
        <Ionicons name={config.icon} size={28} color={colors.textSecondary} />
      </View>
      <Text className="mt-5 text-center text-lg font-semibold text-textPrimary">{config.title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">{config.description}</Text>
      <Button className="mt-6 h-11 w-full max-w-[260px] rounded-full" onPress={config.onPrimary}>
        <Ionicons name={config.primaryIcon} size={17} color={colors.white} />
        <Text>{config.primaryLabel}</Text>
      </Button>
      {config.secondaryLabel && config.onSecondary ? (
        <Button
          className="mt-2.5 h-10 w-full max-w-[260px] rounded-full"
          variant="outline"
          onPress={config.onSecondary}
        >
          <Text className="text-primary">{config.secondaryLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}
