import { SafeScreen } from "@/components/layout/SafeScreen";
import { TapScale } from "@/components/layout/TapScale";
import { AiAnalysisBanner } from "@/components/report-create/AiAnalysisBanner";
import { ReportLocationPanel } from "@/components/report-create/ReportLocationPanel";
import { ReportCapturePanel } from "@/components/report-create/ReportCapturePanel";
import { ReportReviewSummary } from "@/components/report-create/ReportReviewSummary";
import { ReportGalleryShelf } from "@/components/report-create/ReportGalleryShelf";
import { ReportTagField } from "@/components/report-create/ReportTagField";
import { WasteTagPicker } from "@/components/report-create/WasteTagPicker";
import { WizardFooter } from "@/components/report-create/wizard/WizardFooter";
import { WizardHeader } from "@/components/report-create/wizard/WizardHeader";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCatalogAddress } from "@/hooks/useCatalogAddress";
import { catalogService } from "@/services/catalog.service";
import { useAnalyzeReportImage } from "@/hooks/useAnalyzeReportImage";
import { usePollutionCategories } from "@/hooks/usePollutionCategories";
import { useSubmitPollutionReport } from "@/hooks/useSubmitPollutionReport";
import { useWasteTags } from "@/hooks/useWasteTags";
import { useReportLocationMapCamera } from "@/hooks/useReportLocationMapCamera";
import { useUserMapLocation } from "@/hooks/useUserMapLocation";
import { useCreateReportDraftStore } from "@/stores/createReportDraft.store";
import { colors } from "@/theme/colors";
import type { PollutionSeverity, ReportLocationDraft } from "@/types/pollution-report.types";
import { MAX_WASTE_TAG_SELECTION } from "@/types/waste-tag.types";
import { resolveCaptureLocation } from "@/utils/capture-location";
import { enrichLocationWithGoong } from "@/utils/goong-admin-match";
import { validatePinAgainstBoundary } from "@/utils/validate-pin-boundary";
import {
  fetchProvinceBoundaryGroups,
  fetchWardBoundaryGroups,
} from "@/utils/ward-boundary";
import { extractPolygonRings } from "@/utils/geojson-boundaries";
import { resolvePollutionCategoryIcon } from "@/utils/pollution-category-icon";
import { guessMimeTypeFromUri } from "@/utils/report-image-file";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, ScrollView, Switch, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { type LatLng, type Region } from "react-native-maps";
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
      return { title: "Phân loại", subtitle: "Loại ô nhiễm và mức độ nghiêm trọng" };
    case 3:
      return { title: "Vị trí", subtitle: "Xác nhận nơi ghi nhận sự cố" };
    case 4:
      return { title: "Mô tả", subtitle: "Mô tả, loại rác và chế độ ẩn danh" };
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
  const [wasteTagLimitMessage, setWasteTagLimitMessage] = useState<string | null>(null);
  const [showAiResult, setShowAiResult] = useState(false);
  const [pendingAiOutcome, setPendingAiOutcome] = useState<"accepted" | "review" | null>(null);
  // Local selections inside AI dialog — chỉ apply khi user bấm "Áp dụng"
  const [dialogCategoryId, setDialogCategoryId] = useState<string | null>(null);
  const [dialogSeverity, setDialogSeverity] = useState<PollutionSeverity | null>(null);
  const mapRef = useRef<MapView>(null);
  const mapRegion: Region = {
    latitude: 10.7769,
    longitude: 106.7009,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  const images = useCreateReportDraftStore((s) => s.images);
  const location = useCreateReportDraftStore((s) => s.location);
  const categoryId = useCreateReportDraftStore((s) => s.categoryId);
  const severity = useCreateReportDraftStore((s) => s.severity);
  const description = useCreateReportDraftStore((s) => s.description);
  const tags = useCreateReportDraftStore((s) => s.tags);
  const wasteTagIds = useCreateReportDraftStore((s) => s.wasteTagIds);
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
  const toggleWasteTag = useCreateReportDraftStore((s) => s.toggleWasteTag);
  const reset = useCreateReportDraftStore((s) => s.reset);
  const useAi = useCreateReportDraftStore((s) => s.useAi);
  const aiResult = useCreateReportDraftStore((s) => s.aiResult);
  const aiSuggestedCategory = useCreateReportDraftStore((s) => s.aiSuggestedCategory);
  const setUseAi = useCreateReportDraftStore((s) => s.setUseAi);
  const clearAiResult = useCreateReportDraftStore((s) => s.clearAiResult);

  // AI suggested severity (mapped từ AiSeverity → PollutionSeverity)
  const aiSuggestedSeverity: PollutionSeverity | null = aiResult
    ? ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" } as const)[aiResult.classify.severity] ?? null
    : null;

  const { isUploading, isSubmitting, uploadAllImages, submitReport } = useSubmitPollutionReport();
  const { isAnalyzing, analyzeError, analyze } = useAnalyzeReportImage();
  const {
    tags: wasteTags,
    isLoading: isLoadingWasteTags,
    errorMessage: wasteTagsErrorMessage,
    refetch: refetchWasteTags,
  } = useWasteTags(true);

  const {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    errorMessage,
    provincePolygons,
    wardPolygons,
    provincePolygonGroups,
    wardPolygonGroups,
    loadProvinceBoundary,
    loadWardBoundary,
    refetchWards,
  } = useCatalogAddress();
  const { location: userLocation, refreshLocation, permissionDenied, ensurePermission, isLocating } = useUserMapLocation();
  const {
    categories: pollutionCategories,
    isLoading: isLoadingCategories,
    errorMessage: categoryErrorMessage,
    refetch: refetchCategories,
  } = usePollutionCategories(step === 2 || step === 5);

  const marker: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null;

  const provinceCode = location?.provinceCode ?? null;
  const wardCode = location?.wardCode ?? null;

  // Animate map theo ranh giới / pin
  useReportLocationMapCamera({
    enabled: step === 3,
    mapRef,
    marker,
    provinceCode,
    wardCode,
    provincePolygons,
    wardPolygons,
  });

  const enrichedRef = useRef<string | null>(null); // track coords đã enrich

  useEffect(() => {
    if (step !== 3 || !location?.provinceCode) return;
    const province = provinces.find((item) => item.code === location.provinceCode);
    void loadProvinceBoundary(province?.boundaryUrl ?? null);
    void refetchWards(location.provinceCode);
  }, [loadProvinceBoundary, location?.provinceCode, provinces, refetchWards, step]);

  useEffect(() => {
    if (step !== 3) return;
    if (!location?.wardCode) {
      void loadWardBoundary(null, null);
      return;
    }
    if (!wards.length) return;
    const ward = wards.find((item) => item.code === location.wardCode);
    void loadWardBoundary(ward?.boundaryUrl ?? null, location.wardCode);
  }, [loadWardBoundary, location?.wardCode, step, wards]);

  // Enrich location bằng Goong khi vào step 3 — chỉ chạy 1 lần per coords
  useEffect(() => {
    if (step !== 3 || !provinces.length) return;
    const loc = useCreateReportDraftStore.getState().location;
    if (!loc) return;

    const coordKey = `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
    if (enrichedRef.current === coordKey) return; // đã enrich coords này rồi
    if (loc.provinceCode && loc.wardCode && loc.address) return; // đã đầy đủ

    enrichedRef.current = coordKey;
    let cancelled = false;
    void (async () => {
      const enriched = await enrichLocationWithGoong(loc, provinces);
      if (cancelled) return;
      patchLocation({
        address: enriched.address,
        provinceCode: enriched.provinceCode ?? loc.provinceCode,
        wardCode: enriched.wardCode ?? loc.wardCode,
      });
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, provinces.length]);

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
    if (step === 2) return Boolean(categoryId && severity);
    if (step === 3) return Boolean(location);
    if (step === 4) return true;
    if (step === 5) return Boolean(images.length && location && categoryId && severity);
    return false;
  }, [categoryId, images.length, location, severity, step]);

  const canGoBack = step > 1;

  const goNext = useCallback(async () => {
    if (step < 5) {
      if (step === 3) {
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
      const mimeType = asset.mimeType ?? guessMimeTypeFromUri(asset.uri);
      setImages([{ localUri: asset.uri, mimeType, sizeBytes: asset.fileSize, uploadStatus: "pending" }]);

      if (useAi) {
        const outcome = await analyze(asset.uri, mimeType);
        if (outcome === "rejected") {
          Alert.alert("Ảnh không phù hợp", "Ảnh này bị hệ thống AI đánh dấu là không liên quan. Vui lòng chọn ảnh khác.");
        } else if (outcome === "accepted" || outcome === "review") {
          setPendingAiOutcome(outcome);
          setShowAiResult(true);
        }
      }
    } finally {
      setIsPicking(false);
    }
  }, [analyze, provinces, setImages, setLocation, setSource, useAi]);

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

  const assertPinInsideBoundary = useCallback(
    async (
      point: LatLng,
      admin: { provinceCode: string | null; wardCode: string | null },
    ) => {
      let provinceGroups: LatLng[][][] = [];
      let wardGroups: LatLng[][][] = [];

      if (admin.wardCode) {
        let ward = wards.find((item) => item.code === admin.wardCode);
        if (!ward && admin.provinceCode) {
          try {
            const response = await catalogService.getWardsByProvince(admin.provinceCode);
            ward = response.data.data.items.find((item) => item.code === admin.wardCode);
          } catch {
            ward = undefined;
          }
        }
        if (ward?.boundaryUrl) {
          wardGroups = await fetchWardBoundaryGroups(ward.boundaryUrl, admin.wardCode);
        }
      } else if (admin.provinceCode) {
        const province = provinces.find((item) => item.code === admin.provinceCode);
        if (province?.boundaryUrl) {
          provinceGroups = await fetchProvinceBoundaryGroups(province.boundaryUrl);
        }
      }

      return validatePinAgainstBoundary({
        point,
        provinceCode: admin.provinceCode,
        wardCode: admin.wardCode,
        provincePolygonGroups: provinceGroups,
        wardPolygonGroups: wardGroups,
      });
    },
    [provinces, wards],
  );

  const showInvalidPinAlert = useCallback((message: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert("Vị trí không hợp lệ", message);
  }, []);

  const handleMapPress = useCallback(
    async (coordinate: LatLng) => {
      const current = useCreateReportDraftStore.getState().location;
      const adminCodes = {
        provinceCode: current?.provinceCode ?? null,
        wardCode: current?.wardCode ?? null,
      };

      const validation = await assertPinInsideBoundary(coordinate, adminCodes);
      if (!validation.valid) {
        showInvalidPinAlert(validation.message ?? "Vị trí pin không hợp lệ.");
        return;
      }

      const base = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        capturedAt: current?.capturedAt ?? new Date().toISOString(),
      };
      const preserveAdmin = Boolean(current?.wardCode);

      if (current) {
        patchLocation(base);
      } else {
        setLocation({ ...base });
      }

      if (provinces.length === 0) return;

      const enriched = await enrichLocationWithGoong(
        { ...(current ?? {}), ...base } as ReportLocationDraft,
        provinces,
        { preserveAdminCodes: preserveAdmin },
      );

      if (current) {
        patchLocation({
          latitude: enriched.latitude,
          longitude: enriched.longitude,
          address: enriched.address,
          ...(preserveAdmin
            ? {}
            : {
                provinceCode: enriched.provinceCode ?? current.provinceCode,
                wardCode: enriched.wardCode ?? current.wardCode,
              }),
        });
      } else {
        setLocation(enriched);
      }
    },
    [assertPinInsideBoundary, patchLocation, provinces, setLocation, showInvalidPinAlert],
  );

  const applyGpsLocation = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      const base = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        capturedAt: new Date().toISOString(),
      };
      const current = useCreateReportDraftStore.getState().location;

      if (provinces.length === 0) {
        if (current) patchLocation(base);
        else setLocation(base);
        return;
      }

      const enriched = await enrichLocationWithGoong(
        { ...(current ?? {}), ...base } as ReportLocationDraft,
        provinces,
        { overwriteAddress: true, preserveAdminCodes: false },
      );

      enrichedRef.current = `${enriched.latitude.toFixed(5)},${enriched.longitude.toFixed(5)}`;

      if (current) {
        patchLocation({
          latitude: enriched.latitude,
          longitude: enriched.longitude,
          address: enriched.address,
          provinceCode: enriched.provinceCode,
          wardCode: enriched.wardCode,
        });
      } else {
        setLocation(enriched);
      }

      if (enriched.provinceCode) {
        const province = provinces.find((item) => item.code === enriched.provinceCode);
        await loadProvinceBoundary(province?.boundaryUrl ?? null);
        await refetchWards(enriched.provinceCode);
        if (enriched.wardCode) {
          const wardsResponse = await catalogService.getWardsByProvince(enriched.provinceCode);
          const ward = wardsResponse.data.data.items.find((item) => item.code === enriched.wardCode);
          await loadWardBoundary(ward?.boundaryUrl ?? null, enriched.wardCode);
        } else {
          void loadWardBoundary(null, null);
        }
      }

      if (!enriched.provinceCode) {
        Alert.alert(
          "Chưa xác định được tỉnh/phường",
          "Đã lấy tọa độ GPS. Vui lòng chọn tỉnh và phường/xã thủ công.",
        );
      }
    },
    [loadProvinceBoundary, loadWardBoundary, patchLocation, provinces, refetchWards, setLocation],
  );

  const handleLocatePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const coords = await refreshLocation();
    if (!coords) {
      const granted = await ensurePermission();
      if (!granted) {
        void Linking.openSettings();
        return;
      }
      const retry = await refreshLocation();
      if (!retry) return;
      await applyGpsLocation(retry);
      return;
    }
    await applyGpsLocation(coords);
  }, [applyGpsLocation, ensurePermission, refreshLocation]);

  const handlePermissionPress = useCallback(async () => {
    const granted = await ensurePermission();
    if (!granted) {
      void Linking.openSettings();
      return;
    }
    const coords = await refreshLocation();
    if (coords) {
      await applyGpsLocation(coords);
    }
  }, [applyGpsLocation, ensurePermission, refreshLocation]);

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
      const drafted = result.assets.map((asset) => ({
        localUri: asset.uri,
        mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri),
        sizeBytes: asset.fileSize,
        uploadStatus: "pending" as const,
      }));
      setImages(drafted);
      await ensureLocationSeed();

      if (useAi && drafted[0]) {
        const outcome = await analyze(drafted[0].localUri, drafted[0].mimeType);
        if (outcome === "rejected") {
          Alert.alert("Ảnh không phù hợp", "Ảnh này bị hệ thống AI đánh dấu là không liên quan. Vui lòng chọn ảnh khác.");
        } else if (outcome === "accepted" || outcome === "review") {
          setPendingAiOutcome(outcome);
          setShowAiResult(true);
        }
      }
    } finally {
      setIsPicking(false);
    }
  }, [analyze, ensureLocationSeed, setImages, setSource, useAi]);

  const handleProvinceSelect = useCallback(
    async (code: string | null) => {
      if (!code) {
        enrichedRef.current = null;
        void loadProvinceBoundary(null);
        void loadWardBoundary(null, null);
        const current = useCreateReportDraftStore.getState().location;
        if (current) {
          patchLocation({ provinceCode: undefined, wardCode: undefined, address: undefined });
        }
        return;
      }

      const selected = provinces.find((item) => item.code === code);

      // Load boundary + wards song song, lấy polygon ngay từ kết quả
      const [rings] = await Promise.all([
        selected?.boundaryUrl
          ? fetch(selected.boundaryUrl)
              .then((r) => r.json())
              .then((geo) => extractPolygonRings(geo as Parameters<typeof extractPolygonRings>[0]).flat() as LatLng[])
              .catch(() => [] as LatLng[])
          : Promise.resolve([] as LatLng[]),
        loadProvinceBoundary(selected?.boundaryUrl ?? null),
        refetchWards(code),
      ]);

      // Centroid bounding box của tỉnh
      let centerLat = userLocation?.latitude ?? 10.7769;
      let centerLng = userLocation?.longitude ?? 106.7009;
      if (rings.length > 0) {
        const lats = rings.map((p) => p.latitude);
        const lngs = rings.map((p) => p.longitude);
        centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      }

      enrichedRef.current = null;
      void loadWardBoundary(null, null);

      const current = useCreateReportDraftStore.getState().location;
      if (current) {
        patchLocation({ provinceCode: code, wardCode: undefined, address: undefined, latitude: centerLat, longitude: centerLng });
      } else {
        setLocation({ latitude: centerLat, longitude: centerLng, provinceCode: code, capturedAt: new Date().toISOString() });
      }
    },
    [loadProvinceBoundary, loadWardBoundary, patchLocation, provinces, refetchWards, setLocation, userLocation],
  );

  const handleWardSelect = useCallback(
    async (code: string | null) => {
      if (!code) {
        void loadWardBoundary(null, null);
        patchLocation({ wardCode: undefined });
        return;
      }

      const selected = wards.find((item) => item.code === code);
      await loadWardBoundary(selected?.boundaryUrl ?? null, code);
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

  const handleToggleWasteTag = useCallback(
    (tagId: string) => {
      const current = useCreateReportDraftStore.getState().wasteTagIds;
      if (current.includes(tagId)) {
        toggleWasteTag(tagId);
        setWasteTagLimitMessage(null);
        return;
      }
      if (current.length >= MAX_WASTE_TAG_SELECTION) {
        setWasteTagLimitMessage("Đã đạt giới hạn 10 loại rác thải.");
        return;
      }
      toggleWasteTag(tagId);
      setWasteTagLimitMessage(null);
    },
    [toggleWasteTag],
  );

  const selectedWasteTags = useMemo(
    () => wasteTags.filter((tag) => wasteTagIds.includes(tag.id)),
    [wasteTagIds, wasteTags],
  );

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
            {/* AI toggle */}
            <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-3.5">
              <View className="flex-row items-center gap-2.5 flex-1 pr-4">
                <Ionicons name="sparkles" size={20} color={useAi ? colors.primary : colors.textDisabled} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-textPrimary">Phân tích bằng AI</Text>
                  <Text className="mt-0.5 text-sm text-textSecondary">
                    {useAi ? "AI sẽ tự động nhận diện loại và mức độ ô nhiễm" : "Tự điền thông tin ở bước phân loại"}
                  </Text>
                </View>
              </View>
              <Switch
                value={useAi}
                onValueChange={(val) => {
                  setUseAi(val);
                  if (!val) clearAiResult();
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={useAi ? colors.primary : colors.white}
              />
            </View>

            <ReportCapturePanel disabled={isPicking || isAnalyzing} onCapturePress={() => void handlePickCamera()} />

            {isAnalyzing ? (
              <View className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3.5">
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text className="text-sm text-textSecondary">Đang phân tích ảnh...</Text>
              </View>
            ) : null}

            {!isAnalyzing && analyzeError ? (
              <View className="rounded-2xl bg-error/10 px-4 py-3">
                <Text className="text-sm text-error">{analyzeError}</Text>
              </View>
            ) : null}

            <ReportGalleryShelf
              items={galleryItems}
              onOpenLibrary={() => void handlePickLibrary()}
              onRemoveItem={(uri) => {
                removeImage(uri);
                clearAiResult();
              }}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <ReportLocationPanel
            mapRef={mapRef}
            initialRegion={mapRegion}
            marker={marker}
            address={location?.address ?? ""}
            provinceCode={provinceCode}
            wardCode={wardCode}
            provinces={provinces}
            wards={wards}
            isLoadingProvinces={isLoadingProvinces}
            isLoadingWards={isLoadingWards}
            provincePolygons={provincePolygons}
            wardPolygons={wardPolygons}
            errorMessage={errorMessage}
            permissionDenied={permissionDenied}
            isLocating={isLocating}
            onAddressChange={(value) => patchLocation({ address: value })}
            onProvinceSelect={(code) => void handleProvinceSelect(code)}
            onWardSelect={(code) => void handleWardSelect(code)}
            onMapPress={(coordinate) => void handleMapPress(coordinate)}
            onLocatePress={() => void handleLocatePress()}
            onPermissionPress={() => void handlePermissionPress()}
          />
        ) : null}

        {step === 2 ? (
          <View className="gap-8">
            {aiResult ? (
              <AiAnalysisBanner aiResult={aiResult} />
            ) : null}

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
                    const isAiSuggested = aiSuggestedCategory?.id === category.id;
                    const isLast = index === pollutionCategories.length - 1;
                    const iconName = resolvePollutionCategoryIcon(category.code, category.icon);

                    return (
                      <Row
                        key={category.id}
                        title={category.nameVi}
                        subtitle={isAiSuggested ? "AI đề xuất" : undefined}
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
                            <View className="flex-row items-center gap-1.5">
                              {isAiSuggested ? (
                                <Ionicons name="sparkles" size={14} color={colors.primary} />
                              ) : null}
                              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                            </View>
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
                const isAiSuggested = aiSuggestedSeverity === value;
                const isLast = index === arr.length - 1;
                return (
                  <Row
                    key={value}
                    title={meta.label}
                    subtitle={isAiSuggested ? "AI đề xuất" : undefined}
                    left={
                      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-surface">
                        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.accent }} />
                      </View>
                    }
                    right={
                      isSelected ? (
                        <View className="flex-row items-center gap-1.5">
                          {isAiSuggested ? <Ionicons name="sparkles" size={14} color={colors.primary} /> : null}
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                        </View>
                      ) : isAiSuggested ? (
                        <Ionicons name="sparkles" size={16} color={colors.primary} />
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

            <FieldBlock label="Loại rác thải">
              <Text className="mb-3 px-1 text-sm text-textSecondary">
                Tùy chọn — chọn tối đa {MAX_WASTE_TAG_SELECTION} loại phù hợp với hiện trường
              </Text>
              <WasteTagPicker
                tags={wasteTags}
                selectedIds={wasteTagIds}
                isLoading={isLoadingWasteTags}
                errorMessage={wasteTagsErrorMessage}
                limitMessage={wasteTagLimitMessage}
                onToggle={handleToggleWasteTag}
                onRetry={() => void refetchWasteTags()}
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
            wasteTags={selectedWasteTags}
            isAnonymous={isAnonymous}
          />
        ) : null}
      </ScrollView>

      <WizardFooter
        nextLabel={step === 5 ? "Gửi báo cáo" : "Tiếp tục"}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isBusy={isPicking || isAnalyzing || isUploading || isSubmitting}
        onBack={goBack}
        onNext={() => void goNext()}
      />

      {/* AI Analyzing dialog */}
      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-8">
          <View className="w-full items-center gap-4 rounded-3xl bg-white px-6 py-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <View className="items-center gap-1.5">
              <Text className="text-lg font-bold text-textPrimary">AI đang phân tích</Text>
              <Text className="text-center text-sm text-textSecondary">
                Hệ thống đang nhận diện loại ô nhiễm và mức độ từ ảnh của bạn...
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Result dialog */}
      <Modal
        visible={showAiResult && !isAnalyzing && aiResult !== null}
        transparent
        animationType="slide"
        onShow={() => {
          // Seed local dialog state from AI suggestion khi dialog mở
          setDialogCategoryId(aiSuggestedCategory?.id ?? null);
          setDialogSeverity(
            aiResult
              ? ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" } as const)[aiResult.classify.severity] ?? null
              : null,
          );
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}>
            {/* Handle */}
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            {/* Header */}
            <View className="mb-4 flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-textPrimary">Kết quả phân tích AI</Text>
                {pendingAiOutcome === "review" ? (
                  <Text className="text-xs text-warning">Cần xem xét — hãy xác nhận thông tin bên dưới</Text>
                ) : (
                  <Text className="text-xs text-success">Ảnh hợp lệ — chọn thông tin để áp dụng</Text>
                )}
              </View>
            </View>

            {/* AI stats card */}
            {aiResult ? <AiAnalysisBanner aiResult={aiResult} /> : null}

            {/* Loại ô nhiễm — BẮT BUỘC chọn */}
            <View className="mt-5 gap-3">
              <View className="flex-row items-center gap-1.5">
                <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
                  Loại ô nhiễm
                </Text>
                {!dialogCategoryId ? (
                  <View className="rounded-full bg-error/10 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-error">Bắt buộc chọn</Text>
                  </View>
                ) : null}
              </View>

              {aiSuggestedCategory ? (
                /* Chỉ có 1 gợi ý từ AI — hiện dạng toggle card */
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    setDialogCategoryId((prev) => (prev === aiSuggestedCategory.id ? null : aiSuggestedCategory.id))
                  }
                  className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 ${
                    dialogCategoryId === aiSuggestedCategory.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-xl ${
                      dialogCategoryId === aiSuggestedCategory.id ? "bg-primary" : "bg-primary/10"
                    }`}
                  >
                    <Ionicons
                      name={resolvePollutionCategoryIcon(aiSuggestedCategory.code, null)}
                      size={20}
                      color={dialogCategoryId === aiSuggestedCategory.id ? colors.white : colors.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-textPrimary">{aiSuggestedCategory.nameVi}</Text>
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <Ionicons name="sparkles" size={11} color={colors.primary} />
                      <Text className="text-xs text-primary">AI đề xuất</Text>
                    </View>
                  </View>
                  {dialogCategoryId === aiSuggestedCategory.id ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <View className="h-5 w-5 rounded-full border-2 border-border" />
                  )}
                </TouchableOpacity>
              ) : (
                <View className="rounded-2xl bg-surface px-4 py-3">
                  <Text className="text-sm text-textSecondary">AI không nhận diện được loại — bạn sẽ tự chọn ở bước tiếp theo.</Text>
                </View>
              )}
            </View>

            {/* Mức độ nghiêm trọng */}
            <View className="mt-5 gap-3">
              <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
                Mức độ nghiêm trọng
              </Text>
              <View className="flex-row gap-2">
                {(Object.keys(SEVERITY_META) as PollutionSeverity[]).map((value) => {
                  const meta = SEVERITY_META[value];
                  const isSelected = dialogSeverity === value;
                  const isAiPick =
                    aiResult &&
                    ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" } as const)[
                      aiResult.classify.severity
                    ] === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      activeOpacity={0.75}
                      onPress={() => setDialogSeverity(value)}
                      className={`flex-1 items-center rounded-xl py-2.5 ${isSelected ? "bg-primary" : "bg-surface"}`}
                    >
                      <View className="mb-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                      <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-textSecondary"}`}>
                        {meta.label}
                      </Text>
                      {isAiPick && !isSelected ? (
                        <Ionicons name="sparkles" size={10} color={colors.primary} style={{ marginTop: 2 }} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            <View className="mt-5 gap-3">
              <TouchableOpacity
                activeOpacity={dialogCategoryId ? 0.8 : 1}
                onPress={() => {
                  if (!dialogCategoryId) return;
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  // Áp dụng lựa chọn từ dialog vào store
                  setCategoryId(dialogCategoryId);
                  if (dialogSeverity) setSeverity(dialogSeverity);
                  setShowAiResult(false);
                  setPendingAiOutcome(null);
                  setStep(2);
                }}
                className={`items-center rounded-2xl py-3.5 ${dialogCategoryId ? "bg-primary" : "bg-border"}`}
              >
                <Text className={`text-base font-bold ${dialogCategoryId ? "text-white" : "text-textDisabled"}`}>
                  {dialogCategoryId ? "Áp dụng và tiếp tục" : "Chọn loại ô nhiễm để áp dụng"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  clearAiResult();
                  setShowAiResult(false);
                  setPendingAiOutcome(null);
                  setDialogCategoryId(null);
                  setDialogSeverity(null);
                }}
                className="items-center rounded-2xl bg-surface py-3.5"
              >
                <Text className="text-base font-semibold text-textSecondary">Bỏ qua, tự điền</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}
