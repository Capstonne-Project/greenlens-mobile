import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { ReportSatisfaction } from '@/types/report-detail.types';
import { formatDate } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

interface ReportSatisfactionCardProps {
  satisfaction: ReportSatisfaction;
  /** Citizen xem đánh giá của chính mình */
  title?: string;
}

function StarRow({ value }: { value: number }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= value ? 'star' : 'star-outline'}
          size={16}
          color={star <= value ? '#F59E0B' : colors.border}
        />
      ))}
    </View>
  );
}

export function ReportSatisfactionCard({
  satisfaction,
  title = 'Đánh giá từ người báo cáo',
}: ReportSatisfactionCardProps) {
  const unsatisfied = satisfaction.isSatisfied === false;

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        {title}
      </Text>
      <View
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: unsatisfied ? '#FEF2F2' : '#ECFDF5' }}
      >
        <View className="mb-1 flex-row items-center gap-2">
          <Ionicons
            name={unsatisfied ? 'thumbs-down' : 'thumbs-up'}
            size={16}
            color={unsatisfied ? '#991B1B' : '#065F46'}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: unsatisfied ? '#991B1B' : '#065F46' }}
          >
            {unsatisfied ? 'Chưa hài lòng' : 'Hài lòng với kết quả'}
          </Text>
        </View>
        {satisfaction.rating ? <StarRow value={satisfaction.rating} /> : null}
        {satisfaction.comment ? (
          <Text
            className="mt-2 text-sm leading-5"
            style={{ color: unsatisfied ? '#7F1D1D' : '#065F46' }}
          >
            {satisfaction.comment}
          </Text>
        ) : null}
        {satisfaction.ratedAt ? (
          <Text className="mt-2 text-xs text-textSecondary">
            {formatDate(satisfaction.ratedAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
