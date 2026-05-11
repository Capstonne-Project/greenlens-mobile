import { SafeScreen } from "@/components/layout/SafeScreen";
import { TapScale } from "@/components/layout/TapScale";
import { CatalogPicker } from "@/components/report-create/CatalogPicker";
import { ReportCapturePanel } from "@/components/report-create/ReportCapturePanel";
import { ReportReviewSummary } from "@/components/report-create/ReportReviewSummary";
import { ReportGalleryShelf } from "@/components/report-create/ReportGalleryShelf";
import { ReportTagField } from "@/components/report-create/ReportTagField";
import { WizardFooter } from "@/components/report-create/wizard/WizardFooter";
import { WizardHeader } from "@/components/report-create/wizard/WizardHeader";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCatalogAddress } from "@/hooks/useCatalogAddress";
import { usePollutionCategories } from "@/hooks/usePollutionCategories";
import { useSubmitPollutionReport } from "@/hooks/useSubmitPollutionReport";
import { useUserMapLocation } from "@/hooks/useUserMapLocation";
import { useCreateReportDraftStore } from "@/stores/createReportDraft.store";
import { colors } from "@/theme/colors";
import type { PollutionSeverity } from "@/types/pollution-report.types";
import { resolveCaptureLocation } from "@/utils/capture-location";
import { enrichLocationWithGoong } from "@/utils/goong-admin-match";
import { resolvePollutionCategoryIcon } from "@/utils/pollution-category-icon";
import { guessMimeTypeFromUri } from "@/utils/report-image-file";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Switch, TextInput, View } from "react-native";
import MapView, { Marker, Polygon, type LatLng } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type WizardStep = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

const SEVERITY_META: Record<PollutionSeverity, { label: string; accent: string }> = {
  Low: { label: "Thấp", accent: colors.severityLow },
  Medium: { label: "Trung bình", accent: colors.severityMedium },
  High: { label: "Cao", accent: colors.severityHigh },
  Critical: { label: "Khẩn cấp", accent: colors.severityCritical },
};

function toStepTitle(step: WizardStep): { title: string; subtitle: string } {
  switch (step) {
    case 1:
      return { title: "Hình ảnh", subtitle: "Chụp hoặc chọn ảnh minh chứng" };
    case 2:
      return { title: "Vị trí", subtitle: "Xác nhận nơi ghi nhận sự cố" };
    case 3:
      return { title: "Phân loại", subtitle: "Loại ô nhiễm và mức độ nghiêm trọng" };
    case 4:
      return { title: "Mô tả", subtitle: "Mô tả, tags và chế độ ẩn danh" };
    case 5:
      return { title: "Xem lại", subtitle: "Kiểm tra trước khi gửi" };
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
  grouped = false,
  children,
}: {
  title: string;
  description?: string;
  grouped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">{title}</Text>
      {description ? <Text className="mt-1 px-1 text-sm text-textSecondary">{description}</Text> : null}
      {grouped ? (
        <View className="mt-3 overflow-hidden rounded-2xl bg-white">{children}</View>
      ) : (
        <View className="mt-3">{children}</View>
      )}
    </View>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">{label}</Text>
      {children}
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
  const [tagDraft, setTagDraft] = useState("");

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
  const {
    categories: pollutionCategories,
    isLoading: isLoadingCategories,
    errorMessage: categoryErrorMessage,
    refetch: refetchCategories,
  } = usePollutionCategories(step === 3 || step === 5);

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
      Alert.alert("Tải ảnh thất bại", "Vui lòng kiểm tra kết nối và thử lại.");
      return;
    }
    const submitted = await submitReport();
    if (!submitted) {
      Alert.alert("Gửi báo cáo thất bại", "Vui lòng kiểm tra thông tin và thử lại.");
      return;
    }
    router.replace("/report/success" as Href);
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
        Alert.alert("Thiếu quyền camera", "Vui lòng cho phép camera để chụp ảnh.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.92,
        exif: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const captured = await resolveCaptureLocation();
      if (!captured) {
        Alert.alert("Thiếu vị trí", "Vui lòng cho phép vị trí để tiếp tục.");
        return;
      }

      const resolved = provinces.length > 0 ? await enrichLocationWithGoong(captured, provinces) : captured;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSource("camera");
      setLocation(resolved);
      setImages([
        {
          localUri: asset.uri,
          mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri),
          sizeBytes: asset.fileSize,
          uploadStatus: "pending",
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
      const resolved = provinces.length > 0 ? await enrichLocationWithGoong(seed, provinces) : seed;
      setLocation(resolved);
      return;
    }

    if (userLocation) {
      const fallback = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        capturedAt: new Date().toISOString(),
      };
      const resolved = provinces.length > 0 ? await enrichLocationWithGoong(fallback, provinces) : fallback;
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
      const resolved = provinces.length > 0 ? await enrichLocationWithGoong(base, provinces) : base;
      setLocation(resolved);
    },
    [location?.address, location?.capturedAt, location?.provinceCode, location?.wardCode, provinces, setLocation],
  );

  const handlePickLibrary = useCallback(async () => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Thiếu quyền thư viện", "Vui lòng cho phép truy cập thư viện ảnh.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.92,
      });
      if (result.canceled || !result.assets.length) return;

      setSource("library");
      setImages(
        result.assets.map((asset) => ({
          localUri: asset.uri,
          mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri),
          sizeBytes: asset.fileSize,
          uploadStatus: "pending",
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
    setTagDraft("");
  }, [addTag, tagDraft]);

  const { title, subtitle } = toStepTitle(step);
  const selectedCategory = categoryId
    ? (pollutionCategories.find((category) => category.id === categoryId) ?? null)
    : null;
  const selectedProvince = provinceCode ? provinces.find((item) => item.code === provinceCode) : undefined;
  const selectedWard = wardCode ? wards.find((item) => item.code === wardCode) : undefined;
  const severityMeta = severity ? SEVERITY_META[severity] : null;

  return (
    <SafeScreen className="bg-surface" edges={["bottom"]}>
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
          <View className="gap-8">
            <ReportCapturePanel disabled={isPicking} onCapturePress={() => void handlePickCamera()} />
            <ReportGalleryShelf
              items={galleryItems}
              onOpenLibrary={() => void handlePickLibrary()}
              onRemoveItem={removeImage}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View className="gap-8">
            {errorMessage ? (
              <View className="rounded-2xl bg-error/10 px-4 py-3">
                <Text className="text-sm text-error">{errorMessage}</Text>
              </View>
            ) : null}

            <View className="overflow-hidden rounded-2xl">
              <MapView
                style={{ height: 260, width: "100%" }}
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

            <View className="gap-5">
              <View>
                <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
                  Số nhà, đường
                </Text>
                <Input
                  value={location?.address ?? ""}
                  onChangeText={(value) => patchLocation({ address: value })}
                  placeholder="Ví dụ: 123 Nguyễn Huệ"
                  className="mt-2 rounded-2xl border-0 bg-white px-4"
                />
              </View>

              <CatalogPicker
                label="Tỉnh / Thành phố"
                placeholder={isLoadingProvinces ? "Đang tải..." : "Chọn tỉnh thành"}
                value={provinceCode}
                items={provinces.map((p) => ({ code: p.code, label: p.name }))}
                disabled={isLoadingProvinces}
                onSelect={(code) => void handleProvinceSelect(code)}
              />
              <CatalogPicker
                label="Phường / Xã"
                placeholder={provinceCode ? "Chọn phường xã" : "Chọn tỉnh trước"}
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
        ) : null}

        {step === 3 ? (
          <View className="gap-8">
            <Section title="Loại ô nhiễm" grouped>
              {isLoadingCategories ? (
                <View className="px-4 py-4">
                  <Text className="text-sm text-textSecondary">Đang tải loại ô nhiễm...</Text>
                </View>
              ) : null}
              {!isLoadingCategories && categoryErrorMessage ? (
                <View className="gap-3 px-4 py-4">
                  <Text className="text-sm text-error">{categoryErrorMessage}</Text>
                  <TapScale onPress={() => void refetchCategories()}>
                    <Text className="text-sm font-semibold text-primary">Thử lại</Text>
                  </TapScale>
                </View>
              ) : null}
              {!isLoadingCategories && !categoryErrorMessage && !pollutionCategories.length ? (
                <View className="px-4 py-4">
                  <Text className="text-sm text-textSecondary">Chưa có loại ô nhiễm khả dụng.</Text>
                </View>
              ) : null}
              {!isLoadingCategories && !categoryErrorMessage
                ? pollutionCategories.map((category, index) => {
                    const isSelected = categoryId === category.id;
                    const isLast = index === pollutionCategories.length - 1;
                    const iconName = resolvePollutionCategoryIcon(category.code, category.icon);

                    return (
                      <Row
                        key={category.id}
                        title={category.nameVi}
                        left={
                          <View
                            className={`h-10 w-10 items-center justify-center rounded-2xl ${
                              isSelected ? "bg-primary" : "bg-primary/10"
                            }`}
                          >
                            <Ionicons name={iconName} size={20} color={isSelected ? colors.white : colors.primary} />
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
                  })
                : null}
            </Section>

            <Section title="Mức độ nghiêm trọng" grouped>
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
                    right={isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                    onPress={() => setSeverity(value)}
                    showDivider={!isLast}
                  />
                );
              })}
            </Section>
          </View>
        ) : null}

        {step === 4 ? (
          <View className="gap-10">
            <FieldBlock label="Mô tả">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Hiện trường, tác động, mức độ cấp bách"
                placeholderTextColor={colors.textDisabled}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="min-h-[148px] rounded-2xl bg-white px-4 py-3.5 text-[16px] leading-6 text-textPrimary"
              />
            </FieldBlock>

            <FieldBlock label="Tag">
              <ReportTagField
                tags={tags}
                value={tagDraft}
                onChangeText={setTagDraft}
                onAdd={handleAddTag}
                onRemove={removeTag}
              />
            </FieldBlock>

            <View className="flex-row items-center justify-between px-1">
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-semibold text-textPrimary">Gửi ẩn danh</Text>
                <Text className="mt-0.5 text-sm text-textSecondary">Tắt để gắn tài khoản với báo cáo.</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isAnonymous ? colors.primary : colors.white}
              />
            </View>
          </View>
        ) : null}

        {step === 5 ? (
          <ReportReviewSummary
            images={images}
            address={location?.address}
            provinceName={selectedProvince?.name}
            wardName={selectedWard?.name}
            latitude={location?.latitude}
            longitude={location?.longitude}
            categoryName={selectedCategory?.nameVi}
            capturedAt={location?.capturedAt}
            severityLabel={severityMeta?.label}
            severityAccent={severityMeta?.accent}
            description={description}
            tags={tags}
            isAnonymous={isAnonymous}
          />
        ) : null}
      </ScrollView>

      <WizardFooter
        nextLabel={step === 5 ? "Gửi báo cáo" : "Tiếp tục"}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isBusy={isPicking || isUploading || isSubmitting}
        onBack={goBack}
        onNext={() => void goNext()}
      />
    </SafeScreen>
  );
}
