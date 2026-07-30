import { SafeScreen } from "@/components/layout/SafeScreen";
import { TapScale } from "@/components/layout/TapScale";
import { AiAnalysisBanner } from "@/components/report-create/AiAnalysisBanner";
import { AiImageScanOverlay } from "@/components/report-create/AiImageScanOverlay";
import { CategoryOptionGrid } from "@/components/report-create/CategoryOptionGrid";
import { ReportFormHeader } from "@/components/report-create/ReportFormHeader";
import {
  ReportFormSection,
  type ReportFormSectionId,
} from "@/components/report-create/ReportFormSection";
import { ReportFormSubmitBar } from "@/components/report-create/ReportFormSubmitBar";
import { ReportLocationPanel } from "@/components/report-create/ReportLocationPanel";
import { ReportCapturePanel } from "@/components/report-create/ReportCapturePanel";
import { SeverityPillGroup } from "@/components/report-create/SeverityPillGroup";
import { SubmitProgressOverlay, type SubmitStep, type SubmitStepStatus } from "@/components/report-create/SubmitProgressOverlay";
import { ReportGalleryShelf } from "@/components/report-create/ReportGalleryShelf";
import { ReportTagField } from "@/components/report-create/ReportTagField";
import { WasteTagPicker } from "@/components/report-create/WasteTagPicker";
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
import {
  buildLocationDraftFromCoords,
  resolveCaptureLocation,
} from "@/utils/capture-location";
import {
  parseLocationFromPickerAsset,
  parseLocationFromPickerAssets,
} from "@/utils/exif-location";
import { enrichLocationWithGoong } from "@/utils/goong-admin-match";
import { validatePinAgainstBoundary } from "@/utils/validate-pin-boundary";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_DESCRIPTION_MIN_LENGTH,
  validateReportDescription,
} from "@/utils/report-validation";
import {
  fetchProvinceBoundaryGroups,
  fetchWardBoundaryGroups,
} from "@/utils/ward-boundary";
import { extractPolygonRings } from "@/utils/geojson-boundaries";
import { resolvePollutionCategoryIcon } from "@/utils/pollution-category-icon";
import { compressImage, UPLOAD_COMPRESS_PRESET } from "@/utils/compress-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, ScrollView, Switch, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { type LatLng, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SubmitPhase = "idle" | "validate" | "upload" | "submit" | "done";

const SUBMIT_PHASE_ORDER: SubmitPhase[] = ["validate", "upload", "submit"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SEVERITY_META: Record<PollutionSeverity, { label: string; accent: string }> = {
  Low: { label: "Thấp", accent: colors.severityLow },
  Medium: { label: "Trung bình", accent: colors.severityMedium },
  High: { label: "Cao", accent: colors.severityHigh },
  Critical: { label: "Khẩn cấp", accent: colors.severityCritical },
};

export default function ReportCreateWizardScreen() {
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState<ReportFormSectionId | null>("images");
  const [isPicking, setIsPicking] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [submitProgress, setSubmitProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
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

  const {
    isUploading,
    isSubmitting,
    uploadAllImages,
    submitReport,
    fieldErrors,
    clearFieldError,
  } = useSubmitPollutionReport();
  const { isAnalyzing, analyzeError, prepareImage, uploadDraftImage } = useAnalyzeReportImage();
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
  } = usePollutionCategories(
    expandedSection === "category" || Boolean(categoryId) || Boolean(aiResult),
  );

  const toggleSection = useCallback((id: ReportFormSectionId) => {
    setExpandedSection((current) => (current === id ? null : id));
  }, []);

  const marker: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null;

  const provinceCode = location?.provinceCode ?? null;
  const wardCode = location?.wardCode ?? null;

  const isLocationOpen = expandedSection === "location";

  // Animate map theo ranh giới / pin
  useReportLocationMapCamera({
    enabled: isLocationOpen,
    mapRef,
    marker,
    provinceCode,
    wardCode,
    provincePolygons,
    wardPolygons,
  });

  const enrichedRef = useRef<string | null>(null); // track coords đã enrich

  useEffect(() => {
    if (!isLocationOpen || !location?.provinceCode) return;
    const province = provinces.find((item) => item.code === location.provinceCode);
    void loadProvinceBoundary(province?.boundaryUrl ?? null);
    void refetchWards(location.provinceCode);
  }, [isLocationOpen, loadProvinceBoundary, location?.provinceCode, provinces, refetchWards]);

  useEffect(() => {
    if (!isLocationOpen) return;
    if (!location?.wardCode) {
      void loadWardBoundary(null, null);
      return;
    }
    if (!wards.length) return;
    const ward = wards.find((item) => item.code === location.wardCode);
    void loadWardBoundary(ward?.boundaryUrl ?? null, location.wardCode);
  }, [isLocationOpen, loadWardBoundary, location?.wardCode, wards]);

  // Enrich location bằng Goong khi mở section vị trí — chỉ chạy 1 lần per coords
  useEffect(() => {
    if (!isLocationOpen || !provinces.length) return;
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
  }, [isLocationOpen, provinces.length]);

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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const descriptionError = useMemo(
    () => validateReportDescription(description),
    [description],
  );
  const visibleDescriptionError =
    submitAttempted || description.trim().length > 0
      ? (fieldErrors.description ?? descriptionError)
      : null;
  const descriptionLength = description.trim().length;

  const imagesComplete = images.length > 0;
  const categoryComplete = Boolean(categoryId && severity);
  const locationComplete = Boolean(location);
  const descriptionComplete = !descriptionError && description.trim().length >= REPORT_DESCRIPTION_MIN_LENGTH;

  const imagesSubtitle = imagesComplete
    ? `${images.length} ảnh đã thêm`
    : "Chụp hoặc chọn ảnh minh chứng";
  const categorySubtitle = categoryComplete
    ? [
        pollutionCategories.find((c) => c.id === categoryId)?.nameVi,
        severity ? SEVERITY_META[severity].label : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Chọn loại ô nhiễm và mức độ";
  const locationSubtitle = location
    ? location.address || "Đã chọn vị trí trên bản đồ"
    : "Chọn địa chỉ sự cố";
  const descriptionSubtitle = descriptionComplete
    ? `${description.trim().length} ký tự`
    : "Nhập mô tả hiện trường";
  const wasteSubtitle =
    wasteTagIds.length > 0 || tags.length > 0
      ? `${wasteTagIds.length} loại rác${tags.length > 0 ? ` · ${tags.length} tag` : ""}`
      : "Chọn loại rác (tuỳ chọn)";
  const privacySubtitle = isAnonymous
    ? "Gửi ẩn danh — không gắn tài khoản"
    : "Gắn tài khoản với báo cáo";

  const openIncompleteSection = useCallback(() => {
    if (!imagesComplete) {
      setExpandedSection("images");
      return;
    }
    if (!categoryComplete) {
      setExpandedSection("category");
      return;
    }
    if (!locationComplete) {
      setExpandedSection("location");
      return;
    }
    if (!descriptionComplete) {
      setSubmitAttempted(true);
      setExpandedSection("description");
    }
  }, [categoryComplete, descriptionComplete, imagesComplete, locationComplete]);

  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true);

    if (!imagesComplete || !categoryComplete || !locationComplete || descriptionError) {
      openIncompleteSection();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSubmitPhase("validate");
    setUploadDone(0);
    setSubmitProgress(0.06);
    await delay(420);

    setSubmitPhase("upload");
    const uploadResult = await uploadAllImages(({ done, total }) => {
      setUploadDone(done);
      setSubmitProgress(0.1 + 0.6 * (done / Math.max(total, 1)));
    });
    if (!uploadResult.ok) {
      setSubmitPhase("idle");
      setSubmitProgress(0);
      if (uploadResult.reason === "timeout") {
        Alert.alert(
          "Tải ảnh quá lâu",
          "Máy chủ chưa phản hồi kịp. Thường do upload cloud (R2) chậm — thử lại hoặc kiểm tra cấu hình BE.",
        );
      } else if (uploadResult.reason === "network") {
        Alert.alert(
          "Không kết nối được máy chủ",
          "Kiểm tra EXPO_PUBLIC_API_URL và BE đang chạy cùng Wi‑Fi.",
        );
      } else {
        Alert.alert("Tải ảnh thất bại", "Vui lòng kiểm tra kết nối và thử lại.");
      }
      return;
    }

    setSubmitProgress(0.82);
    setSubmitPhase("submit");
    const submitResult = await submitReport();
    if (!submitResult.ok) {
      setSubmitPhase("idle");
      setSubmitProgress(0);
      if (submitResult.reason === "validation") {
        setExpandedSection("description");
        return;
      }
      if (submitResult.reason === "timeout" || submitResult.reason === "network") {
        Alert.alert(
          "Không nhận được phản hồi",
          "Máy chủ có thể đã tạo báo cáo rồi (check mục Báo cáo của tôi trước khi gửi lại). Nếu chưa có thì thử lại.",
        );
        return;
      }
      Alert.alert("Gửi báo cáo thất bại", "Vui lòng kiểm tra thông tin và thử lại.");
      return;
    }

    setSubmitProgress(1);
    setSubmitPhase("done");
    await delay(520);
    router.replace("/report/success" as Href);
  }, [
    categoryComplete,
    descriptionError,
    imagesComplete,
    locationComplete,
    openIncompleteSection,
    submitReport,
    uploadAllImages,
  ]);

  const submitSteps = useMemo<SubmitStep[]>(() => {
    const phaseIndex = SUBMIT_PHASE_ORDER.indexOf(submitPhase);
    const isDoneAll = submitPhase === "done";
    const statusFor = (phase: SubmitPhase): SubmitStepStatus => {
      if (isDoneAll) return "done";
      const target = SUBMIT_PHASE_ORDER.indexOf(phase);
      if (phaseIndex > target) return "done";
      if (phaseIndex === target) return "active";
      return "pending";
    };
    return [
      { key: "validate", label: "Kiểm tra dữ liệu", status: statusFor("validate") },
      { key: "upload", label: `Tải lên ảnh (${uploadDone}/${images.length})`, status: statusFor("upload") },
      { key: "submit", label: "Gửi đến Officer", status: statusFor("submit") },
    ];
  }, [images.length, submitPhase, uploadDone]);

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
        quality: 1,
        exif: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // Đọc GPS từ EXIF trước khi compress (nén JPEG sẽ strip metadata).
      const exifCoords = parseLocationFromPickerAsset(asset);
      const captured = exifCoords
        ? await buildLocationDraftFromCoords(exifCoords)
        : await resolveCaptureLocation();

      if (!captured) {
        Alert.alert(
          "Thiếu vị trí",
          "Ảnh không có GPS trong EXIF. Vui lòng cho phép vị trí thiết bị để tiếp tục.",
        );
        return;
      }

      const resolved =
        provinces.length > 0 ? await enrichLocationWithGoong(captured, provinces) : captured;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSource("camera");
      setLocation(resolved);
      let compressed;
      try {
        // compressImage encode JPEG mới → EXIF bị xóa trước khi upload R2.
        compressed = await compressImage(asset.uri, {
          ...UPLOAD_COMPRESS_PRESET,
          baseName: "report",
          sourceWidth: asset.width,
          sourceHeight: asset.height,
        });
      } catch {
        Alert.alert("Không xử lý được ảnh", "Vui lòng chụp lại hoặc chọn ảnh khác.");
        return;
      }
      const mimeType = compressed.mimeType;
      setImages([{ localUri: compressed.uri, mimeType, fileName: compressed.fileName, uploadStatus: "pending" }]);

      // Step 1: upload Mobile → R2 (presign + PUT). AI classify only if toggle on.
      const outcome = await prepareImage(compressed.uri, mimeType, compressed.fileName, {
        runAi: useAi,
      });
      if (outcome === "error") {
        Alert.alert(
          "Không tải được ảnh",
          "Upload lên kho ảnh (R2) thất bại hoặc quá chậm. Kiểm tra mạng rồi thử lại.",
        );
      } else if (outcome === "rejected") {
        Alert.alert("Ảnh không phù hợp", "Ảnh này bị hệ thống AI đánh dấu là không liên quan. Vui lòng chọn ảnh khác.");
      } else if (outcome === "accepted" || outcome === "review") {
        setPendingAiOutcome(outcome);
        setShowAiResult(true);
      }
    } finally {
      setIsPicking(false);
    }
  }, [prepareImage, provinces, setImages, setLocation, setSource, useAi]);

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
        quality: 1,
        exif: true,
      });
      if (result.canceled || !result.assets.length) return;

      setSource("library");

      // Parse GPS từ ảnh gốc trước khi compress strip EXIF.
      const exifCoords = parseLocationFromPickerAssets(result.assets);
      if (exifCoords) {
        const fromExif = await buildLocationDraftFromCoords(exifCoords);
        const resolved =
          provinces.length > 0
            ? await enrichLocationWithGoong(fromExif, provinces)
            : fromExif;
        setLocation(resolved);
      }

      let drafted;
      try {
        drafted = await Promise.all(
          result.assets.map(async (asset) => {
            // compressImage encode JPEG mới → EXIF bị xóa trước khi upload R2.
            const compressed = await compressImage(asset.uri, {
              ...UPLOAD_COMPRESS_PRESET,
              baseName: "report",
              sourceWidth: asset.width,
              sourceHeight: asset.height,
            });
            return {
              localUri: compressed.uri,
              mimeType: compressed.mimeType,
              fileName: compressed.fileName,
              uploadStatus: "pending" as const,
            };
          }),
        );
      } catch {
        Alert.alert("Không xử lý được ảnh", "Vui lòng chọn lại ảnh khác (ưu tiên JPG).");
        return;
      }
      setImages(drafted);
      if (!exifCoords) {
        await ensureLocationSeed();
      }

      // Step 1: upload all now (extras || first+optional AI in parallel).
      const [first, ...rest] = drafted;
      const restPromise = Promise.all(
        rest.map((img) => uploadDraftImage(img.localUri, img.mimeType, img.fileName)),
      );
      const firstOutcome = first
        ? await prepareImage(first.localUri, first.mimeType, first.fileName, { runAi: useAi })
        : null;
      const restResults = await restPromise;

      if (firstOutcome === "error" || restResults.some((ok) => !ok)) {
        Alert.alert(
          "Không tải được ảnh",
          "Upload lên kho ảnh (R2) thất bại hoặc quá chậm. Kiểm tra mạng (Wi‑Fi/4G) rồi chọn lại ảnh.",
        );
      } else if (firstOutcome === "rejected") {
        Alert.alert("Ảnh không phù hợp", "Ảnh này bị hệ thống AI đánh dấu là không liên quan. Vui lòng chọn ảnh khác.");
      } else if (firstOutcome === "accepted" || firstOutcome === "review") {
        setPendingAiOutcome(firstOutcome);
        setShowAiResult(true);
      }
    } finally {
      setIsPicking(false);
    }
  }, [prepareImage, uploadDraftImage, ensureLocationSeed, provinces, setImages, setLocation, setSource, useAi]);

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

  const submitOverlayTitle = submitPhase === "done" ? "Hoàn tất!" : "Đang gửi báo cáo...";
  const submitOverlaySubtitle =
    images.length > 0 ? `${uploadDone}/${images.length} ảnh đã tải lên` : undefined;

  return (
    <SafeScreen className="bg-surface" edges={["bottom"]}>
      <SubmitProgressOverlay
        visible={submitPhase !== "idle"}
        progress={submitProgress}
        title={submitOverlayTitle}
        subtitle={submitOverlaySubtitle}
        steps={submitSteps}
      />
      <ReportFormHeader title="Tạo báo cáo" onBack={handleClose} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 100,
          gap: 12,
        }}
      >
        <ReportFormSection
          icon="images-outline"
          title="Hình ảnh"
          subtitle={imagesSubtitle}
          expanded={expandedSection === "images"}
          completed={imagesComplete}
          onToggle={() => toggleSection("images")}
        >
          <View className="gap-5">
            <View className="flex-row items-center justify-between rounded-2xl border border-border px-3 py-3">
              <View className="flex-row items-center gap-2.5 flex-1 pr-4">
                <Ionicons name="sparkles" size={20} color={useAi ? colors.primary : colors.textDisabled} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-textPrimary">Phân tích bằng AI</Text>
                  <Text className="mt-0.5 text-sm text-textSecondary">
                    {useAi ? "AI sẽ tự động nhận diện loại và mức độ ô nhiễm" : "Tự điền ở mục Phân loại"}
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
              <View className="flex-row items-center gap-2 rounded-2xl bg-surface px-4 py-3.5">
                <Ionicons name={useAi ? "sparkles" : "cloud-upload-outline"} size={16} color={colors.primary} />
                <Text className="text-sm text-textSecondary">
                  {useAi ? "Đang tải ảnh và phân tích AI..." : "Đang tải ảnh lên server..."}
                </Text>
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
        </ReportFormSection>

        <ReportFormSection
          icon="grid-outline"
          title="Phân loại"
          subtitle={categorySubtitle}
          expanded={expandedSection === "category"}
          completed={categoryComplete}
          onToggle={() => toggleSection("category")}
        >
          <View className="gap-3">
            {aiResult ? <AiAnalysisBanner aiResult={aiResult} compact /> : null}

            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-textSecondary">
                Loại ô nhiễm
              </Text>
              <CategoryOptionGrid
                categories={pollutionCategories}
                selectedId={categoryId}
                suggestedId={aiSuggestedCategory?.id ?? null}
                isLoading={isLoadingCategories}
                errorMessage={categoryErrorMessage}
                onSelect={setCategoryId}
                onRetry={() => void refetchCategories()}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-textSecondary">
                Mức độ
              </Text>
              <SeverityPillGroup
                value={severity}
                suggestedValue={aiSuggestedSeverity}
                onChange={setSeverity}
              />
            </View>
          </View>
        </ReportFormSection>
        <ReportFormSection
          icon="location-outline"
          title="Vị trí"
          subtitle={locationSubtitle}
          expanded={expandedSection === "location"}
          completed={locationComplete}
          onToggle={() => toggleSection("location")}
        >
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
        </ReportFormSection>

        <ReportFormSection
          icon="document-text-outline"
          title="Mô tả"
          subtitle={descriptionSubtitle}
          expanded={expandedSection === "description"}
          completed={descriptionComplete}
          onToggle={() => toggleSection("description")}
        >
          <View className="gap-3">
            <TextInput
              value={description}
              onChangeText={(value) => {
                clearFieldError("description");
                setDescription(value);
              }}
              placeholder="Hiện trường, tác động, mức độ cấp bách"
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={6}
              maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
              textAlignVertical="top"
              className="min-h-[148px] rounded-2xl border bg-surface px-4 py-3.5 text-[16px] leading-6 text-textPrimary"
              style={{
                borderColor: visibleDescriptionError ? colors.error : colors.border,
              }}
            />
            <View className="flex-row items-start justify-between gap-3 px-1">
              <Text
                className="flex-1 text-xs leading-5"
                style={{ color: visibleDescriptionError ? colors.error : colors.textSecondary }}
              >
                {visibleDescriptionError ??
                  `Nhập từ ${REPORT_DESCRIPTION_MIN_LENGTH}-${REPORT_DESCRIPTION_MAX_LENGTH} ký tự.`}
              </Text>
              <Text
                className="text-xs font-semibold"
                style={{
                  color:
                    descriptionLength < REPORT_DESCRIPTION_MIN_LENGTH ||
                    descriptionLength > REPORT_DESCRIPTION_MAX_LENGTH
                      ? colors.error
                      : colors.textSecondary,
                }}
              >
                {descriptionLength}/{REPORT_DESCRIPTION_MAX_LENGTH}
              </Text>
            </View>
          </View>
        </ReportFormSection>

        <ReportFormSection
          icon="pricetags-outline"
          title="Loại rác & Tag"
          subtitle={wasteSubtitle}
          expanded={expandedSection === "waste"}
          completed={wasteTagIds.length > 0 || tags.length > 0}
          optional
          onToggle={() => toggleSection("waste")}
        >
          <View className="gap-6">
            <View>
              <Text className="mb-3 text-sm text-textSecondary">
                Chọn tối đa {MAX_WASTE_TAG_SELECTION} loại phù hợp với hiện trường
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
            </View>
            <View>
              <Text className="mb-3 text-sm font-semibold text-textPrimary">Tag tự do</Text>
              <ReportTagField
                tags={tags}
                value={tagDraft}
                onChangeText={setTagDraft}
                onAdd={handleAddTag}
                onRemove={removeTag}
              />
            </View>
          </View>
        </ReportFormSection>

        <ReportFormSection
          icon="person-outline"
          title="Chế độ gửi"
          subtitle={privacySubtitle}
          expanded={expandedSection === "privacy"}
          completed
          onToggle={() => toggleSection("privacy")}
        >
          <View className="flex-row items-center justify-between rounded-2xl bg-surface px-3 py-3">
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
        </ReportFormSection>
      </ScrollView>

      <ReportFormSubmitBar
        isBusy={isPicking || isAnalyzing || isUploading || isSubmitting}
        onSubmit={() => void handleSubmit()}
      />

      {/* Scan overlay CHỈ khi phân tích bằng AI. Tắt AI → upload thuần, đã có
          banner "Đang tải ảnh lên server..." + badge trạng thái trên từng ảnh. */}
      <AiImageScanOverlay
        visible={isAnalyzing && useAi}
        imageUri={images[0]?.localUri}
        mode="ai"
      />

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
                      : "border-border bg-white"
                  }`}
                >
                  <Ionicons
                    name={resolvePollutionCategoryIcon(aiSuggestedCategory.code, null)}
                    size={22}
                    color={dialogCategoryId === aiSuggestedCategory.id ? colors.primary : colors.textSecondary}
                  />
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
                  setExpandedSection("category");
                }}
                className={`items-center rounded-2xl py-3.5 ${dialogCategoryId ? "bg-primary" : "bg-border"}`}
              >
                <Text className={`text-base font-bold ${dialogCategoryId ? "text-white" : "text-textDisabled"}`}>
                  {dialogCategoryId ? "Áp dụng" : "Chọn loại ô nhiễm để áp dụng"}
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
