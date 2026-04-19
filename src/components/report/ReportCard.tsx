import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeverityBadge, StatusBadge } from '@/components/common/Badge';
import { formatRelativeTime } from '@/utils/formatters';
import type { ReportItem } from '@/types/report.types';

interface ReportCardProps {
  report: ReportItem;
  onPress: () => void;
}

export function ReportCard({ report, onPress }: ReportCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-border p-4 gap-3 active:opacity-80"
    >
      {report.imageUrls[0] && (
        <Image
          source={{ uri: report.imageUrls[0] }}
          className="w-full h-40 rounded-xl"
          resizeMode="cover"
        />
      )}

      <View className="gap-2">
        <View className="flex-row gap-2 flex-wrap">
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} />
        </View>

        <Text className="text-base font-semibold text-textPrimary" numberOfLines={2}>
          {report.title}
        </Text>

        <Text className="text-sm text-textSecondary" numberOfLines={2}>
          {report.description}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text className="text-xs text-textSecondary" numberOfLines={1}>
            {report.location.address}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="arrow-up-outline" size={14} color="#6B7280" />
            <Text className="text-xs text-textSecondary">{report.upvoteCount}</Text>
          </View>
          <Text className="text-xs text-textSecondary">{formatRelativeTime(report.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
