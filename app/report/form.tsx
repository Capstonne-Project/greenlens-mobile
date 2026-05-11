import { CategoryOptionGrid } from '@/components/report-create/CategoryOptionGrid';
import { ReportDraftImageStrip } from '@/components/report-create/ReportDraftImageStrip';
import { ReportFlowHeader } from '@/components/report-create/ReportFlowHeader';
import { ReportSectionCard } from '@/components/report-create/ReportSectionCard';
import { SeverityPillGroup } from '@/components/report-create/SeverityPillGroup';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useSubmitPollutionReport } from '@/hooks/useSubmitPollutionReport';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportFormScreen() {
  const insets = useSafeAreaInsets();
  const images = useCreateReportDraftStore((state) => state.images);
  const location = useCreateReportDraftStore((state) => state.location);
  const source = useCreateReportDraftStore((state) => state.source);
  const categoryId = useCreateReportDraftStore((state) => state.categoryId);
  const severity = useCreateReportDraftStore((state) => state.severity);
  const description = useCreateReportDraftStore((state) => state.description);
  const isAnonymous = useCreateReportDraftStore((state) => state.isAnonymous);
  const setCategoryId = useCreateReportDraftStore((state) => state.setCategoryId);
  const setSeverity = useCreateReportDraftStore((state) => state.setSeverity);
  const setDescription = useCreateReportDraftStore((state) => state.setDescription);
  const setIsAnonymous = useCreateReportDraftStore((state) => state.setIsAnonymous);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isUploading, isSubmitting, uploadAllImages, submitReport } = useSubmitPollutionReport();
  const [hasUploadAttempt, setHasUploadAttempt] = useState(false);

  useEffect(() => {
    if (!images.length) {
      router.replace('/(tabs)/create' as Href);
    }
  }, [images.length]);

  useEffect(() => {
    if (!location) {
      router.replace('/(tabs)/create' as Href);
    }
  }, [location]);

  useEffect(() => {
    if (isAuthenticated) {
      setIsAnonymous(false);
    }
  }, [isAuthenticated, setIsAnonymous]);

  const handleSubmit = useCallback(async () => {
    if (!categoryId || !severity) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn loại ô nhiễm và mức độ nghiêm trọng.');
      return;
    }

    setHasUploadAttempt(true);
    const uploaded = await uploadAllImages();
    if (!uploaded) {
      Alert.alert('Tải ảnh thất bại', 'Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }

    const submitted = await submitReport();
    if (!submitted) {
      Alert.alert('Gửi báo cáo thất bại', 'Vui lòng kiểm tra thông tin và thử lại.');
      return;
    }

    router.replace('/report/success' as Href);
  }, [categoryId, severity, submitReport, uploadAllImages]);

  const isBusy = isUploading || isSubmitting;

  return (
    <SafeScreen className="bg-surface" edges={['top']}>
      <ReportFlowHeader
        title="Hoàn tất báo cáo"
        subtitle={source === 'camera' ? 'Ảnh chụp tại hiện trường' : 'Ảnh chọn từ thư viện'}
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 20) + 112,
          gap: 16,
        }}
      >
        <ReportSectionCard title="Vị trí ghi nhận">
          <Text className="text-sm text-textSecondary">
            {location?.address ?? 'Chưa có địa chỉ chi tiết'}
          </Text>
          <Text className="mt-2 text-xs text-textSecondary">
            {location
              ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
              : '—'}
          </Text>
          {location?.provinceCode && location.wardCode ? (
            <Text className="mt-1 text-xs text-textSecondary">
              Mã hành chính: {location.provinceCode} · {location.wardCode}
            </Text>
          ) : null}
        </ReportSectionCard>

        <ReportSectionCard title="Ảnh đính kèm" description="Ảnh sẽ được tải lên trước khi gửi báo cáo.">
          <ReportDraftImageStrip images={images} />
        </ReportSectionCard>

        <ReportSectionCard title="Loại ô nhiễm" description="Chọn một loại phù hợp nhất với hiện trường.">
          <CategoryOptionGrid selectedId={categoryId} onSelect={setCategoryId} />
        </ReportSectionCard>

        <ReportSectionCard title="Mức độ" description="Đánh giá mức độ nghiêm trọng của sự cố.">
          <SeverityPillGroup value={severity} onChange={setSeverity} />
        </ReportSectionCard>

        <ReportSectionCard title="Mô tả thêm">
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả ngắn gọn hiện trường, tác động hoặc mức độ cấp bách"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-[120px] rounded-2xl border-border bg-surface px-4 py-3"
          />
        </ReportSectionCard>

        <View className="flex-row items-center justify-between rounded-3xl border border-border bg-white px-4 py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base font-semibold text-textPrimary">Gửi ẩn danh</Text>
            <Text className="mt-1 text-sm text-textSecondary">
              {isAuthenticated
                ? 'Tắt để gắn tài khoản của bạn với báo cáo.'
                : 'Bật để gửi báo cáo mà không đăng nhập.'}
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#D1D5DB', true: '#6EE7B7' }}
            thumbColor={isAnonymous ? '#10B981' : '#FFFFFF'}
          />
        </View>

        {hasUploadAttempt && images.some((image) => image.uploadStatus === 'error') ? (
          <View className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3">
            <Text className="text-sm text-error">
              Một hoặc nhiều ảnh chưa tải lên được. Hãy thử gửi lại.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          className="h-12 rounded-2xl"
          disabled={isBusy || !categoryId || !severity}
          onPress={() => void handleSubmit()}
        >
          <Text className="font-semibold text-primary-foreground">
            {isBusy ? 'Đang gửi báo cáo...' : 'Gửi báo cáo'}
          </Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
