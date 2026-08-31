import { CategoryOptionGrid } from '@/components/report-create/CategoryOptionGrid';
import { ReportDraftImageStrip } from '@/components/report-create/ReportDraftImageStrip';
import { ReportFlowHeader } from '@/components/report-create/ReportFlowHeader';
import { ReportSectionCard } from '@/components/report-create/ReportSectionCard';
import { SeverityPillGroup } from '@/components/report-create/SeverityPillGroup';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { usePollutionCategories } from '@/hooks/usePollutionCategories';
import { useSubmitPollutionReport } from '@/hooks/useSubmitPollutionReport';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_DESCRIPTION_MIN_LENGTH,
  validateReportDescription,
} from '@/utils/report-validation';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
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
  const {
    isUploading,
    isSubmitting,
    uploadAllImages,
    submitReport,
    fieldErrors,
    clearFieldError,
  } = useSubmitPollutionReport();
  const {
    categories: pollutionCategories,
    isLoading: isLoadingCategories,
    errorMessage: categoryErrorMessage,
    refetch: refetchCategories,
  } = usePollutionCategories();
  const [hasUploadAttempt, setHasUploadAttempt] = useState(false);
  const descriptionError = useMemo(
    () => validateReportDescription(description),
    [description],
  );
  const visibleDescriptionError =
    hasUploadAttempt || description.trim().length > 0
      ? (fieldErrors.description ?? descriptionError)
      : null;
  const descriptionLength = description.trim().length;

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
    if (descriptionError) {
      return;
    }
    const uploadResult = await uploadAllImages();
    if (!uploadResult.ok) {
      if (uploadResult.reason === 'session-expired') {
        router.replace('/(auth)/login' as Href);
        return;
      }
      if (uploadResult.reason === 'timeout') {
        Alert.alert(
          'Tải ảnh quá lâu',
          'Máy chủ chưa phản hồi kịp (thường do upload lên cloud chậm). Thử lại với ảnh nhỏ hơn hoặc kiểm tra BE/R2.',
        );
        return;
      }
      if (uploadResult.reason === 'network') {
        Alert.alert(
          'Không kết nối được máy chủ',
          'Kiểm tra EXPO_PUBLIC_API_URL và máy chạy BE cùng Wi‑Fi với điện thoại.',
        );
        return;
      }
      Alert.alert('Tải ảnh thất bại', 'Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }

    const submitResult = await submitReport();
    if (!submitResult.ok) {
      if (submitResult.reason === 'session-expired') {
        router.replace('/(auth)/login' as Href);
        return;
      }
      if (submitResult.reason === 'validation') {
        return;
      }
      if (submitResult.reason === 'timeout' || submitResult.reason === 'network') {
        Alert.alert(
          'Không nhận được phản hồi',
          'Máy chủ có thể đã tạo báo cáo rồi (check mục Báo cáo của tôi trước khi gửi lại). Nếu chưa có thì thử lại.',
        );
        return;
      }
      // BR-REP-010: đã bị khóa gửi — thử lại ngay chỉ tốn công, hướng người dùng chờ.
      if (submitResult.reason === 'rate-limited') {
        Alert.alert(
          'Đã đạt giới hạn gửi báo cáo',
          submitResult.apiErrorMessage ??
            'Bạn đã gửi quá nhiều báo cáo trong thời gian ngắn. Vui lòng thử lại sau.',
          [{ text: 'Đã hiểu' }],
        );
        return;
      }
      if (submitResult.reason === 'content-rejected') {
        Alert.alert(
          'Nội dung không phù hợp',
          submitResult.apiErrorMessage ?? 'Mô tả chứa nội dung không phù hợp. Vui lòng chỉnh sửa lại.',
          [{ text: 'Đã hiểu' }],
        );
        return;
      }
      Alert.alert('Gửi báo cáo thất bại', 'Vui lòng kiểm tra thông tin và thử lại.');
      return;
    }

    router.replace('/report/success' as Href);
  }, [categoryId, descriptionError, severity, submitReport, uploadAllImages]);

  const isBusy = isUploading || isSubmitting;

  return (
    <SafeScreen className="bg-surface" edges={['top']}>
      <ReportFlowHeader
        title="Hoàn tất báo cáo"
        subtitle={source === 'camera' ? 'Ảnh chụp tại hiện trường' : 'Ảnh chọn từ thư viện'}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <CategoryOptionGrid
            categories={pollutionCategories}
            selectedId={categoryId}
            isLoading={isLoadingCategories}
            errorMessage={categoryErrorMessage}
            onSelect={setCategoryId}
            onRetry={() => void refetchCategories()}
          />
        </ReportSectionCard>

        <ReportSectionCard title="Mức độ" description="Đánh giá mức độ nghiêm trọng của sự cố.">
          <SeverityPillGroup value={severity} onChange={setSeverity} />
        </ReportSectionCard>

        <ReportSectionCard title="Mô tả thêm">
          <Input
            value={description}
            onChangeText={(value) => {
              clearFieldError('description');
              setDescription(value);
            }}
            placeholder="Mô tả ngắn gọn hiện trường, tác động hoặc mức độ cấp bách"
            multiline
            numberOfLines={4}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            textAlignVertical="top"
            className={`min-h-[120px] rounded-2xl bg-surface px-4 py-3 ${
              visibleDescriptionError ? 'border-error' : 'border-border'
            }`}
          />
          <View className="mt-2 flex-row items-start justify-between gap-3">
            <Text className={`flex-1 text-xs leading-5 ${visibleDescriptionError ? 'text-error' : 'text-textSecondary'}`}>
              {visibleDescriptionError ??
                `Nhập từ ${REPORT_DESCRIPTION_MIN_LENGTH}-${REPORT_DESCRIPTION_MAX_LENGTH} ký tự.`}
            </Text>
            <Text
              className={`text-xs font-semibold ${
                descriptionLength < REPORT_DESCRIPTION_MIN_LENGTH ||
                descriptionLength > REPORT_DESCRIPTION_MAX_LENGTH
                  ? 'text-error'
                  : 'text-textSecondary'
              }`}
            >
              {descriptionLength}/{REPORT_DESCRIPTION_MAX_LENGTH}
            </Text>
          </View>
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
          disabled={isBusy || !categoryId || !severity || Boolean(descriptionError)}
          onPress={() => void handleSubmit()}
        >
          <Text className="font-semibold text-primary-foreground">
            {isBusy ? 'Đang gửi báo cáo...' : 'Gửi báo cáo'}
          </Text>
        </Button>
      </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
