import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { ReportCapturePanel } from '@/components/report-create/ReportCapturePanel';
import { ReportDraftImageStrip } from '@/components/report-create/ReportDraftImageStrip';
import { ReportGalleryShelf } from '@/components/report-create/ReportGalleryShelf';
import { WizardFooter } from '@/components/report-create/wizard/WizardFooter';
import { WizardHeader } from '@/components/report-create/wizard/WizardHeader';
import { useCatalogAddress } from '@/hooks/useCatalogAddress';
import { useSubmitPollutionReport } from '@/hooks/useSubmitPollutionReport';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { POLLUTION_CATEGORIES } from '@/constants/pollution-categories';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import type { PollutionSeverity } from '@/types/pollution-report.types';
import { resolveCaptureLocation } from '@/utils/capture-location';
import { enrichLocationWithGoong } from '@/utils/goong-admin-match';
import { guessMimeTypeFromUri } from '@/utils/report-image-file';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Switch, TextInput, View } from 'react-native';
import MapView, { Marker, Polygon, type LatLng } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { colors } from '@/theme/colors';

type WizardStep = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

const SEVERITY_META: Record<PollutionSeverity, { label: string; accent: string }> = {
  Low: { label: 'Thấp', accent: colors.severityLow },
  Medium: { label: 'Trung bình', accent: colors.severityMedium },
  High: { label: 'Cao', accent: colors.severityHigh },
  Critical: { label: 'Khẩn cấp', accent: colors.severityCritical },
};

function toStepTitle(step: WizardStep): { title: string; subtitle: string } {
  switch (step) {
    case 1:
      return { title: 'Hình ảnh', subtitle: 'Chụp hoặc chọn ảnh minh chứng' };
    case 2:
      return { title: 'Vị trí', subtitle: 'Xác nhận nơi ghi nhận sự cố' };
    case 3:
      return { title: 'Phân loại', subtitle: 'Loại ô nhiễm và mức độ nghiêm trọng' };
    case 4:
      return { title: 'Mô tả', subtitle: 'Mô tả, tags và chế độ ẩn danh' };
    case 5:
      return { title: 'Xem lại', subtitle: 'Kiểm tra trước khi gửi' };
  }
}

function clampStep(step: number): WizardStep {
  if (step <= 1) return 1;
  if (step >= 5) return 5;
  return step as WizardStep;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 px-1 text-sm text-textSecondary">{description}</Text>
      ) : null}
      <View className="mt-3 overflow-hidden rounded-3xl border border-border bg-white">
        {children}
      </View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  left,
  right,
  onPress,
  showDivider = true,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  const content = (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      {left ? <View className="h-10 w-10 items-center justify-center">{left}</View> : null}
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-textPrimary">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-sm text-textSecondary">{subtitle}</Text> : null}
      </View>
      {right ? <View className="items-center justify-center">{right}</View> : null}
    </View>
  );

  return (
    <View>
      {onPress ? <TapScale onPress={onPress}>{content}</TapScale> : content}
      {showDivider ? <View className="h-px bg-border" /> : null}
    </View>
  );
}

export default function ReportCreateWizardScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<WizardStep>(1);
  const [isPicking, setIsPicking] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const source = useCreateReportDraftStore((s) => s.source);
  const images = useCreateReportDraftStore((s) => s.images);
  const location = useCreateReportDraftStore((s) => s.location);
  const categoryId = useCreateReportDraftStore((s) => s.categoryId);
  const severity = useCreateReportDraftStore((s) => s.severity);
  const description = useCreateReportDraftStore((s) => s.description);
  const tags = useCreateReportDraftStore((s) => s.tags);
  const isAnonymous = useCreateReportDraftStore((s) => s.isAnonymous);

  const setSource = useCreateReportDraftStore((s) => s.setSource);
  const setImages = useCreateReportDraftStore((s) => s.setImages);
  const removeImage = useCreateReportDraftStore((s) => s.removeImage);
  const setLocation = useCreateReportDraftStore((s) => s.setLocation);
  const patchLocation = useCreateReportDraftStore((s) => s.patchLocation);
  const setCategoryId = useCreateReportDraftStore((s) => s.setCategoryId);
  const setSeverity = useCreateReportDraftStore((s) => s.setSeverity);
  const setDescription = useCreateReportDraftStore((s) => s.setDescription);
  const setIsAnonymous = useCreateReportDraftStore((s) => s.setIsAnonymous);
  const addTag = useCreateReportDraftStore((s) => s.addTag);
  const removeTag = useCreateReportDraftStore((s) => s.removeTag);
  const reset = useCreateReportDraftStore((s) => s.reset);

  const { isUploading, isSubmitting, uploadAllImages, submitReport } = useSubmitPollutionReport();

  const {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    errorMessage,
    provincePolygons,
    wardPolygons,
    loadProvinceBoundary,
    loadWardBoundary,
    refetchWards,
  } = useCatalogAddress();
  const { location: userLocation, refreshLocation } = useUserMapLocation();

  const marker: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null;

  const provinceCode = location?.provinceCode ?? null;
  const wardCode = location?.wardCode ?? null;

  useEffect(() => {
    if (step !== 2 || !location?.provinceCode) {
      return;
    }

    const province = provinces.find((item) => item.code === location.provinceCode);
    void loadProvinceBoundary(province?.boundaryUrl ?? null);
    void refetchWards(location.provinceCode);
  }, [loadProvinceBoundary, location?.provinceCode, provinces, refetchWards, step]);

  useEffect(() => {
    if (step !== 2 || !location?.wardCode || !wards.length) {
      return;
    }

    const ward = wards.find((item) => item.code === location.wardCode);
    void loadWardBoundary(ward?.boundaryUrl ?? null);
  }, [loadWardBoundary, location?.wardCode, step, wards]);

  useEffect(() => {
    if (step !== 2 || !location || !provinces.length) {
      return;
    }
    if (location.provinceCode && location.wardCode) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const enriched = await enrichLocationWithGoong(location, provinces);
      if (cancelled) {
        return;
      }
      if (
        enriched.provinceCode !== location.provinceCode ||
        enriched.wardCode !== location.wardCode ||
        enriched.address !== location.address
      ) {
        patchLocation({
          address: enriched.address,
          provinceCode: enriched.provinceCode,
          wardCode: enriched.wardCode,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, patchLocation, provinces, step]);

  const handleClose = useCallback(() => {
    reset();
    router.back();
  }, [reset]);

  const galleryItems = useMemo(
    () =>
      images.map((image, index) => ({
        id: `${image.localUri}-${index}`,
        uri: image.localUri,
      })),
    [images],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) return images.length > 0;
    if (step === 2) return Boolean(location);
    if (step === 3) return Boolean(categoryId && severity);
    if (step === 4) return true;
    if (step === 5) return Boolean(images.length && location && categoryId && severity);
    return false;
  }, [categoryId, images.length, location, severity, step]);

  const canGoBack = step > 1;

  const goNext = useCallback(async () => {
    if (step < 5) {
      if (step === 2) {
        await refreshLocation();
      }
      setStep((s) => clampStep(s + 1));
      return;
    }

    const ok = await uploadAllImages();
    if (!ok) {
      Alert.alert('Tải ảnh thất bại', 'Vui lòng kiểm tra kết nối và thử lại.');
      return;
    }
    const submitted = await submitReport();
    if (!submitted) {
      Alert.alert('Gửi báo cáo thất bại', 'Vui lòng kiểm tra thông tin và thử lại.');
      return;
    }
    router.replace('/report/success' as Href);
  }, [refreshLocation, step, submitReport, uploadAllImages]);

  const goBack = useCallback(() => {
    if (step === 1) return;
    setStep((s) => clampStep(s - 1));
  }, [step]);

  const handlePickCamera = useCallback(async () => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Thiếu quyền camera', 'Vui lòng cho phép camera để chụp ảnh.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.92,
        exif: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const captured = await resolveCaptureLocation();
      if (!captured) {
        Alert.alert('Thiếu vị trí', 'Vui lòng cho phép vị trí để tiếp tục.');
        return;
      }

      const resolved =
        provinces.length > 0 ? await enrichLocationWithGoong(captured, provinces) : captured;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSource('camera');
      setLocation(resolved);
      setImages([
        {
          localUri: asset.uri,
          mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri),
          sizeBytes: asset.fileSize,
          uploadStatus: 'pending',
        },
      ]);
    } finally {
      setIsPicking(false);
    }
  }, [provinces, setImages, setLocation, setSource]);

  const ensureLocationSeed = useCallback(async () => {
    const existing = useCreateReportDraftStore.getState().location;
    if (existing) return;
    await refreshLocation();
    const seed = await resolveCaptureLocation();
    if (seed) {
      const resolved =
        provinces.length > 0 ? await enrichLocationWithGoong(seed, provinces) : seed;
      setLocation(resolved);
      return;
    }

    if (userLocation) {
      const fallback = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        capturedAt: new Date().toISOString(),
      };
      const resolved =
        provinces.length > 0 ? await enrichLocationWithGoong(fallback, provinces) : fallback;
      setLocation(resolved);
    }
  }, [provinces, refreshLocation, setLocation, userLocation]);

  const handleMapPress = useCallback(
    async (coordinate: LatLng) => {
      const base = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: location?.address,
        provinceCode: location?.provinceCode,
        wardCode: location?.wardCode,
        capturedAt: location?.capturedAt ?? new Date().toISOString(),
      };
      const resolved =
        provinces.length > 0 ? await enrichLocationWithGoong(base, provinces) : base;
      setLocation(resolved);
    },
    [location?.address, location?.capturedAt, location?.provinceCode, location?.wardCode, provinces, setLocation],
  );

  const handlePickLibrary = useCallback(async () => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Thiếu quyền thư viện', 'Vui lòng cho phép truy cập thư viện ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.92,
      });
      if (result.canceled || !result.assets.length) return;

      setSource('library');
      setImages(
        result.assets.map((asset) => ({
          localUri: asset.uri,
          mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri),
          sizeBytes: asset.fileSize,
          uploadStatus: 'pending',
        })),
      );

      await ensureLocationSeed();
    } finally {
      setIsPicking(false);
    }
  }, [ensureLocationSeed, setImages, setSource]);

  const handleProvinceSelect = useCallback(
    async (code: string) => {
      await ensureLocationSeed();
      const selected = provinces.find((item) => item.code === code);
      await loadProvinceBoundary(selected?.boundaryUrl ?? null);
      await refetchWards(code);
      patchLocation({ provinceCode: code, wardCode: undefined });
    },
    [ensureLocationSeed, loadProvinceBoundary, patchLocation, provinces, refetchWards],
  );

  const handleWardSelect = useCallback(
    async (code: string) => {
      const selected = wards.find((item) => item.code === code);
      await loadWardBoundary(selected?.boundaryUrl ?? null);
      patchLocation({ wardCode: code });
    },
    [loadWardBoundary, patchLocation, wards],
  );

  const handleAddTag = useCallback(() => {
    const value = tagDraft.trim();
    if (!value) return;
    addTag(value);
    setTagDraft('');
  }, [addTag, tagDraft]);

  const { title, subtitle } = toStepTitle(step);
  const selectedCategory = categoryId
    ? POLLUTION_CATEGORIES.find((c) => c.id === categoryId) ?? null
    : null;

  return (
    <SafeScreen className="bg-surface" edges={['top']}>
      <WizardHeader title={title} subtitle={subtitle} step={step} totalSteps={TOTAL_STEPS} onClose={handleClose} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 92,
        }}
      >
        {step === 1 ? (
          <View className="gap-6">
            <ReportCapturePanel disabled={isPicking} onCapturePress={() => void handlePickCamera()} />
            <ReportGalleryShelf items={galleryItems} onOpenLibrary={() => void handlePickLibrary()} />
            {images.length ? (
              <View className="pt-2">
                <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
                  Ảnh đã chọn
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {images.map((img) => (
                    <View key={img.localUri} className="w-[31%] overflow-hidden rounded-2xl bg-white">
                      <View className="absolute right-2 top-2 z-10">
                        <TapScale onPress={() => removeImage(img.localUri)}>
                          <View className="h-8 w-8 items-center justify-center rounded-full bg-black/55">
                            <Ionicons name="close" size={16} color={colors.white} />
                          </View>
                        </TapScale>
                      </View>
                      <Image source={{ uri: img.localUri }} className="h-24 w-full bg-border" contentFit="cover" />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View className="gap-14">
            {errorMessage ? (
              <View className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3">
                <Text className="text-sm text-error">{errorMessage}</Text>
              </View>
            ) : null}

            <View className="rounded-3xl border border-border bg-white p-4">
              <Text className="text-sm font-semibold text-textPrimary">Địa chỉ</Text>
              <Text className="mt-1 text-sm text-textSecondary">
                {source === 'camera' ? 'Bạn có thể chỉnh lại vị trí nếu cần.' : 'Chọn vị trí trên bản đồ và địa chỉ hành chính.'}
              </Text>
            </View>

            <View className="overflow-hidden rounded-3xl border border-border bg-white">
              <MapView
                style={{ height: 280, width: '100%' }}
                initialRegion={{
                  latitude: marker?.latitude ?? 10.7769,
                  longitude: marker?.longitude ?? 106.7009,
                  latitudeDelta: 0.06,
                  longitudeDelta: 0.06,
                }}
                onPress={(event) => {
                  void handleMapPress(event.nativeEvent.coordinate);
                }}
              >
                {provincePolygons.map((ring, index) => (
                  <Polygon
                    key={`province-${index}`}
                    coordinates={ring}
                    strokeColor={colors.primary}
                    fillColor="rgba(16, 185, 129, 0.12)"
                    strokeWidth={2}
                  />
                ))}
                {wardPolygons.map((ring, index) => (
                  <Polygon
                    key={`ward-${index}`}
                    coordinates={ring}
                    strokeColor={colors.info}
                    fillColor="rgba(59, 130, 246, 0.12)"
                    strokeWidth={2}
                  />
                ))}
                {marker ? <Marker coordinate={marker} /> : null}
              </MapView>
            </View>

            <View className="rounded-3xl border border-border bg-white p-4">
              <Text className="text-sm font-semibold text-textPrimary">Số nhà, đường</Text>
              <Input
                value={location?.address ?? ''}
                onChangeText={(value) => patchLocation({ address: value })}
                placeholder="Ví dụ: 123 Nguyễn Huệ"
                className="mt-3 rounded-2xl border-border bg-surface px-4"
              />

              <View className="mt-5 gap-4">
                <CatalogPicker
                  label="Tỉnh / Thành phố"
                  placeholder={isLoadingProvinces ? 'Đang tải...' : 'Chọn tỉnh thành'}
                  value={provinceCode}
                  items={provinces.map((p) => ({ code: p.code, label: p.name }))}
                  disabled={isLoadingProvinces}
                  onSelect={(code) => void handleProvinceSelect(code)}
                />
                <CatalogPicker
                  label="Phường / Xã"
                  placeholder={provinceCode ? 'Chọn phường xã' : 'Chọn tỉnh trước'}
                  value={wardCode}
                  items={wards.map((w) => ({
                    code: w.code,
                    label: w.name,
                    description: w.unitAbbreviation,
                  }))}
                  disabled={!provinceCode || isLoadingWards}
                  onSelect={(code) => void handleWardSelect(code)}
                />
              </View>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View className="gap-6">
            <Section
              title="Loại ô nhiễm"
              description="Chọn một loại phù hợp nhất với hiện trường."
            >
              {POLLUTION_CATEGORIES.map((category, index) => {
                const isSelected = categoryId === category.id;
                const isLast = index === POLLUTION_CATEGORIES.length - 1;
                return (
                  <Row
                    key={category.id}
                    title={category.nameVi}
                    left={
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-2xl ${
                          isSelected ? 'bg-primary' : 'bg-primary/10'
                        }`}
                      >
                        <Ionicons
                          name={category.icon}
                          size={20}
                          color={isSelected ? colors.white : colors.primary}
                        />
                      </View>
                    }
                    right={
                      isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                      )
                    }
                    onPress={() => setCategoryId(category.id)}
                    showDivider={!isLast}
                  />
                );
              })}
            </Section>

            <Section
              title="Mức độ nghiêm trọng"
              description="Đánh giá mức độ cấp bách để ưu tiên xử lý."
            >
              {(Object.keys(SEVERITY_META) as PollutionSeverity[]).map((value, index, arr) => {
                const meta = SEVERITY_META[value];
                const isSelected = severity === value;
                const isLast = index === arr.length - 1;
                return (
                  <Row
                    key={value}
                    title={meta.label}
                    left={
                      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-surface">
                        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.accent }} />
                      </View>
                    }
                    right={
                      isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      ) : null
                    }
                    onPress={() => setSeverity(value)}
                    showDivider={!isLast}
                  />
                );
              })}
            </Section>
          </View>
        ) : null}

        {step === 4 ? (
          <View className="gap-6">
            <Section title="Mô tả, tags & ẩn danh" description="Thêm chi tiết để đội xử lý hiểu rõ hơn.">
              <View className="px-4 pb-4 pt-3.5">
                <Text className="text-[15px] font-semibold text-textPrimary">Mô tả</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mô tả ngắn gọn hiện trường, tác động hoặc mức độ cấp bách"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  className="mt-3 min-h-[130px] rounded-2xl border-border bg-surface px-4 py-3"
                />
              </View>
              <View className="h-px bg-border" />
              <View className="px-4 pb-4 pt-3.5">
                <Text className="text-[15px] font-semibold text-textPrimary">Tags</Text>
                <Text className="mt-1 text-sm text-textSecondary">Tối đa 8 tags. Nhấn tag để xoá.</Text>
                <View className="mt-3 flex-row items-center gap-2">
                  <View className="flex-1">
                    <TextInput
                      value={tagDraft}
                      onChangeText={setTagDraft}
                      placeholder="Ví dụ: rác sinh hoạt"
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px]"
                      returnKeyType="done"
                      onSubmitEditing={handleAddTag}
                    />
                  </View>
                  <TapScale onPress={handleAddTag}>
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                      <Ionicons name="add" size={20} color={colors.white} />
                    </View>
                  </TapScale>
                </View>

                {tags.length ? (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {tags.map((tag) => (
                      <TapScale key={tag} onPress={() => removeTag(tag)}>
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-2">
                          <Text className="text-xs font-semibold text-primary">{tag}</Text>
                          <Ionicons name="close" size={14} color={colors.primary} />
                        </View>
                      </TapScale>
                    ))}
                  </View>
                ) : null}
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-textPrimary">Gửi ẩn danh</Text>
                  <Text className="mt-1 text-sm text-textSecondary">Tắt để gắn tài khoản với báo cáo.</Text>
                </View>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: '#D1D5DB', true: '#6EE7B7' }}
                  thumbColor={isAnonymous ? '#10B981' : '#FFFFFF'}
                />
              </View>
            </Section>
          </View>
        ) : null}

        {step === 5 ? (
          <View className="gap-6">
            <Section title="Xem lại" description="Nếu đúng rồi, bấm “Gửi báo cáo” để hoàn tất.">
              <View className="px-4 pb-4 pt-3.5">
                <Text className="text-[15px] font-semibold text-textPrimary">Ảnh đính kèm</Text>
                <View className="mt-4">
                  <ReportDraftImageStrip images={images} />
                </View>
              </View>
              <View className="h-px bg-border" />
              <View className="px-4 py-4">
                <Text className="text-[15px] font-semibold text-textPrimary">Vị trí</Text>
                <Text className="mt-2 text-sm text-textSecondary">{location?.address ?? 'Chưa có địa chỉ'}</Text>
                <Text className="mt-1 text-xs text-textSecondary">
                  {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : '—'}
                </Text>
                {location?.provinceCode && location.wardCode ? (
                  <Text className="mt-1 text-xs text-textSecondary">
                    Mã hành chính: {location.provinceCode} · {location.wardCode}
                  </Text>
                ) : null}
              </View>
              <View className="h-px bg-border" />
              <View className="px-4 py-4">
                <Text className="text-[15px] font-semibold text-textPrimary">Phân loại</Text>
                <Text className="mt-2 text-sm text-textSecondary">
                  {selectedCategory?.nameVi ?? 'Chưa chọn loại ô nhiễm'}
                </Text>
                <Text className="mt-1 text-sm text-textSecondary">
                  Mức độ: {severity ? SEVERITY_META[severity].label : '—'}
                </Text>
                <Text className="mt-1 text-sm text-textSecondary">
                  {isAnonymous ? 'Gửi ẩn danh' : 'Gửi có danh'}
                </Text>
              </View>
              <View className="h-px bg-border" />
              <View className="px-4 py-4">
                <Text className="text-[15px] font-semibold text-textPrimary">Mô tả</Text>
                <Text className="mt-2 text-sm text-textSecondary">{description.trim() || '—'}</Text>
                {tags.length ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {tags.map((tag) => (
                      <View key={tag} className="rounded-full bg-surface px-3 py-1.5">
                        <Text className="text-xs font-semibold text-textSecondary">{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Section>
          </View>
        ) : null}
      </ScrollView>

      <WizardFooter
        nextLabel={step === 5 ? 'Gửi báo cáo' : 'Tiếp tục'}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isBusy={isPicking || isUploading || isSubmitting}
        onBack={goBack}
        onNext={() => void goNext()}
      />
    </SafeScreen>
  );
}

