import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import { formatDate } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function ReportSuccessScreen() {
  const submittedReportCode = useCreateReportDraftStore((state) => state.submittedReportCode);
  const slaVerifyDueAt = useCreateReportDraftStore((state) => state.slaVerifyDueAt);
  const reset = useCreateReportDraftStore((state) => state.reset);

  useEffect(() => {
    if (!submittedReportCode) {
      router.replace('/(tabs)/create' as Href);
    }
  }, [submittedReportCode]);

  const handleGoHome = () => {
    reset();
    router.replace('/(tabs)/index' as Href);
  };

  return (
    <SafeScreen className="justify-center bg-surface px-6">
      <View className="items-center rounded-[32px] border border-border bg-white px-6 py-8 shadow-lg shadow-black/5">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="checkmark-circle" size={54} color="#10B981" />
        </View>
        <Text className="mt-5 text-center text-2xl font-bold text-textPrimary">
          Đã gửi báo cáo
        </Text>
        <Text className="mt-3 text-center text-base text-textSecondary">
          Mã báo cáo của bạn là
        </Text>
        <Text className="mt-2 text-center text-xl font-bold text-primary">
          {submittedReportCode}
        </Text>
        {slaVerifyDueAt ? (
          <Text className="mt-4 text-center text-sm text-textSecondary">
            Hạn xác minh dự kiến: {formatDate(slaVerifyDueAt)}
          </Text>
        ) : null}
      </View>

      <View className="mt-8">
        <Button className="h-12 rounded-2xl" onPress={handleGoHome}>
          <Text className="font-semibold text-primary-foreground">Về trang chủ</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
