import { View } from 'react-native';

import { colors } from '@/theme/colors';

function Block({ height, width }: { height: number; width?: number | `${number}%` }) {
  return (
    <View style={{ height, width: width ?? '100%', borderRadius: 8, backgroundColor: colors.surface }} />
  );
}

/** Skeleton dashboard tĩnh — khớp hình dạng nội dung thật. */
export function DashboardSkeleton() {
  return (
    <View className="px-4 pt-4">
      <Block height={14} width="60%" />
      <View className="mt-4 flex-row items-center">
        <Block height={104} width={104} />
        <View className="ml-5 flex-1 gap-2">
          <Block height={12} width="80%" />
          <Block height={12} width="95%" />
          <Block height={12} width="70%" />
        </View>
      </View>

      <View className="mt-6 flex-row gap-2">
        <View className="flex-1"><Block height={48} /></View>
        <View className="flex-1"><Block height={48} /></View>
        <View className="flex-1"><Block height={48} /></View>
      </View>

      <View className="mt-6">
        <Block height={14} width="50%" />
        <View className="mt-4 gap-3">
          <Block height={8} />
          <Block height={8} />
          <Block height={8} />
        </View>
      </View>
    </View>
  );
}
