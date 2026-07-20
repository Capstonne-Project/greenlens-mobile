import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { firstRouteParam } from '@/utils/field-worker-task';

export default function AssignmentCompletedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    reportCode?: string | string[];
  }>();
  const reportId = firstRouteParam(params.reportId);
  const reportCode = firstRouteParam(params.reportCode);

  const openDetail = () => {
    if (!reportId) return;
    router.replace({
      pathname: '/assignment/[id]',
      params: { id: reportId },
    } as never);
  };

  return (
    <View
      className="flex-1 bg-white px-5"
      style={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }}
    >
      <View className="flex-1">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Ionicons name="checkmark" size={25} color={colors.white} />
        </View>

        <Text className="mt-6 text-3xl font-bold leading-10 text-textPrimary">
          Phần việc của đội đã hoàn thành
        </Text>
        <Text className="mt-3 text-base leading-6 text-textSecondary">
          Ảnh sau xử lý đã được lưu và trạng thái nhiệm vụ đã chuyển sang hoàn thành.
        </Text>

        <View className="mt-8 border-y border-border py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-textSecondary">Mã báo cáo</Text>
            <Text className="text-sm font-semibold text-textPrimary">
              {reportCode || '—'}
            </Text>
          </View>
          <View className="mt-3 flex-row items-start justify-between gap-4">
            <Text className="text-sm text-textSecondary">Kết quả</Text>
            <Text className="flex-1 text-right text-sm font-medium text-textPrimary">
              Đã ghi nhận phần việc của đội
            </Text>
          </View>
        </View>

        <View className="mt-5 flex-row items-start gap-2">
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text className="flex-1 text-xs leading-5 text-textSecondary">
            Báo cáo toàn hệ thống chỉ chuyển sang Resolved khi mọi đội đang được giao đều hoàn thành.
          </Text>
        </View>
      </View>

      <View className="gap-3">
        {reportId ? (
          <AssignmentActionButton
            label="Xem nhiệm vụ vừa hoàn thành"
            icon="document-text-outline"
            onPress={openDetail}
            variant="secondary"
          />
        ) : null}
        <AssignmentActionButton
          label="Về danh sách nhiệm vụ"
          icon="list"
          onPress={() => router.replace('/(staff)/assignments' as never)}
        />
      </View>
    </View>
  );
}
