import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrivalConfirmCard,
  AudioEvidenceRecorder,
  ChecklistCategoryRow,
  EvidenceCategorySheet,
  InspectionCaseHeader,
  InspectionFeedbackBanner,
  StagePanel,
  StageTracker,
  type StageDef,
} from '@/components/inspection';
import { Text } from '@/components/ui/text';
import { useArrivalDistance } from '@/hooks/useArrivalDistance';
import { useEvidenceAudioRecorder } from '@/hooks/useEvidenceAudioRecorder';
import { useInspectionActions } from '@/hooks/useInspectionActions';
import { useInspectionDetail } from '@/hooks/useInspectionDetail';
import { useInspectionEvidence } from '@/hooks/useInspectionEvidence';
import { inspectionService } from '@/services/inspection.service';
import { ReportMediaGallery } from '@/shared/components/ReportMediaGallery';
import { colors } from '@/theme/colors';
import type { EvidenceCategory, ViolationLevel } from '@/types/inspection.types';
import {
  buildChecklistState,
  getMissingRequirements,
  type ChecklistCategoryState,
} from '@/utils/inspection-checklist';

const VIOLATION_LEVELS: readonly ViolationLevel[] = [
  'Minor',
  'Moderate',
  'Severe',
  'Critical',
] as const;

const VIOLATION_LEVEL_LABELS: Record<ViolationLevel, string> = {
  Minor: 'Nhẹ',
  Moderate: 'Trung bình',
  Severe: 'Nghiêm trọng',
  Critical: 'Đặc biệt nghiêm trọng',
};

const MIN_CLOSE_REASON_LENGTH = 50;

type StepKey = 'accept' | 'arrival' | 'checklist' | 'decision' | 'payment';

const STEP_ORDER: readonly StepKey[] = ['accept', 'arrival', 'checklist', 'decision', 'payment'];

const STEP_META: Record<StepKey, { label: string; icon: keyof typeof Ionicons.glyphMap; title: string }> = {
  accept: { label: 'Nhận việc', icon: 'hand-left-outline', title: 'Nhận việc' },
  arrival: { label: 'Hiện trường', icon: 'navigate-outline', title: 'Xác nhận đến hiện trường' },
  checklist: { label: 'Checklist', icon: 'list-outline', title: 'Checklist hiện trường' },
  decision: { label: 'Quyết định', icon: 'document-text-outline', title: 'Quyết định xử lý' },
  payment: { label: 'Nộp phạt', icon: 'cash-outline', title: 'Nộp phạt & đóng hồ sơ' },
};

const INPUT_CLASS = 'mb-3 h-12 rounded-2xl bg-surface px-4 text-sm text-textPrimary';
const TEXTAREA_CLASS = 'mb-3 min-h-[84px] rounded-2xl bg-surface px-4 py-3 text-sm text-textPrimary';

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { detail, reportMedia, sceneCoords, isLoading, errorMessage, refetch } =
    useInspectionDetail(id);
  const { run, submitting, actionError, successMessage, dismissFeedback } = useInspectionActions({
    onRefresh: refetch,
  });
  const {
    upload,
    uploadFile,
    uploadingCategory,
    isUploading,
    evidenceError,
    clearEvidenceError,
  } = useInspectionEvidence({ inspectionId: id, onUploaded: refetch });
  const audio = useEvidenceAudioRecorder();

  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<ChecklistCategoryState | null>(null);

  // Form state
  const [arrivalNote, setArrivalNote] = useState('');
  const [violationStatus, setViolationStatus] = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [violationLevel, setViolationLevel] = useState<ViolationLevel>('Moderate');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('10');
  const [additionalMeasures, setAdditionalMeasures] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; fileName: string; mimeType: string } | null>(
    null,
  );
  const [closeNoViolationReason, setCloseNoViolationReason] = useState('');
  const [closeReason, setCloseReason] = useState('');

  const checklistStates = useMemo(
    () => buildChecklistState(detail?.checklistEvidence),
    [detail?.checklistEvidence],
  );
  const missingRequirements = useMemo(
    () => getMissingRequirements(checklistStates),
    [checklistStates],
  );

  const arrival = useArrivalDistance({
    latitude: sceneCoords?.latitude,
    longitude: sceneCoords?.longitude,
    enabled: activeStep === 'arrival' && Boolean(detail?.canConfirmArrival),
  });

  // Prefill từ server + tự chọn stage đang cần xử lý.
  useEffect(() => {
    if (!detail) return;
    const states = buildChecklistState(detail.checklistEvidence);
    setViolationStatus(states.find((s) => s.category === 'ViolationStatus')?.note ?? '');
    setOtherNote(states.find((s) => s.category === 'Other')?.note ?? '');
    if (detail.violationLevel) setViolationLevel(detail.violationLevel);

    setActiveStep((current) => {
      if (current) return current;
      if (detail.canAcceptTask) return 'accept';
      if (detail.canConfirmArrival && !detail.arrivalConfirmedAt) return 'arrival';
      if (detail.canEditChecklist) return 'checklist';
      if (detail.canIssuePenalty || detail.canCloseNoViolation) return 'decision';
      if (detail.canRecordPayment || detail.canClose) return 'payment';
      return null;
    });
  }, [detail]);

  const handlePickReceipt = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReceipt({
      uri: asset.uri,
      fileName: asset.fileName ?? 'receipt.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }, []);

  const handleEvidencePick = useCallback(
    async (category: EvidenceCategory, source: 'camera' | 'library') => {
      const ok = await upload(category, source);
      if (ok) setActiveCategory(null);
    },
    [upload],
  );

  const handleStopRecording = useCallback(async () => {
    const recorded = await audio.stop();
    if (!recorded) return;
    const ok = await uploadFile('Audio', {
      uri: recorded.uri,
      fileName: recorded.fileName,
      mimeType: recorded.mimeType,
    });
    if (ok) setActiveCategory(null);
  }, [audio, uploadFile]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorMessage || !detail) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Ionicons name="alert-circle-outline" size={44} color={colors.textDisabled} />
        <Text className="mt-3 text-center text-sm text-textSecondary">
          {errorMessage ?? 'Không có dữ liệu hồ sơ.'}
        </Text>
        <Pressable onPress={() => void refetch()} hitSlop={8} className="mt-4">
          <Text className="text-sm font-bold text-primary">Tải lại</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={8} className="mt-3">
          <Text className="text-sm font-semibold text-textSecondary">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const checklistLocked = !detail.canEditChecklist;
  const canSubmitFieldReport = detail.canSubmitFieldReport && missingRequirements.length === 0;

  // Trạng thái từng stage — done/active/pending/locked — điều khiển StageTracker.
  const stepStatus: Record<StepKey, 'done' | 'locked'> = {
    accept: !detail.canAcceptTask ? 'done' : 'locked',
    arrival: detail.arrivalConfirmedAt ? 'done' : detail.canConfirmArrival ? 'locked' : 'locked',
    checklist: detail.fieldInvestigationSubmittedAt ? 'done' : 'locked',
    decision:
      Boolean(detail.penaltyIssuedAt) || detail.status === 'ClosedNoViolation' ? 'done' : 'locked',
    payment: detail.status === 'Closed' ? 'done' : 'locked',
  };

  // Một stage "mở khoá" (bấm được) khi nó đã done, hoặc BE cho phép hành động ở đó.
  const stepUnlocked: Record<StepKey, boolean> = {
    accept: true,
    arrival: stepStatus.arrival === 'done' || detail.canConfirmArrival,
    checklist: stepStatus.checklist === 'done' || detail.canEditChecklist || detail.canSubmitFieldReport,
    decision: stepStatus.decision === 'done' || detail.canIssuePenalty || detail.canCloseNoViolation,
    payment: stepStatus.payment === 'done' || detail.canRecordPayment || detail.canClose,
  };

  const stages: StageDef<StepKey>[] = STEP_ORDER.map((key) => ({
    key,
    label: STEP_META[key].label,
    icon: STEP_META[key].icon,
    status: stepStatus[key] === 'done' ? 'done' : stepUnlocked[key] ? 'pending' : 'locked',
  }));

  const currentStep = activeStep ?? 'accept';

  return (
    <View className="flex-1 bg-surface">
      <View
        className="flex-row items-center gap-3 bg-white px-4 pb-3"
        style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Hồ sơ thanh tra
          </Text>
          <Text className="font-mono text-sm font-bold text-textPrimary" numberOfLines={1}>
            {detail.reportCode}
          </Text>
        </View>
      </View>

      <View className="bg-white pb-3">
        <StageTracker
          stages={stages}
          activeKey={currentStep}
          onSelect={(key) => {
            if (stepUnlocked[key]) setActiveStep(key);
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <InspectionFeedbackBanner
            errorMessage={actionError}
            successMessage={successMessage}
            onDismiss={dismissFeedback}
          />

          <View className="mb-4">
            <InspectionCaseHeader detail={detail} />
          </View>

          {reportMedia.length > 0 ? (
            <View className="mb-4 overflow-hidden rounded-3xl bg-white">
              <View className="px-4 pt-4">
                <Text className="text-sm font-bold text-textPrimary">Ảnh báo cáo gốc</Text>
                <Text className="mt-0.5 text-xs text-textSecondary">
                  Do người dân gửi — chỉ để tham chiếu
                </Text>
              </View>
              <ReportMediaGallery
                media={reportMedia}
                heroIndex={heroIndex}
                onSelectIndex={setHeroIndex}
              />
            </View>
          ) : null}

          {detail.violationDescription ? (
            <View className="mb-4 rounded-3xl bg-white p-4">
              <Text className="mb-1.5 text-sm font-bold text-textPrimary">Nội dung vi phạm</Text>
              <Text className="text-sm leading-5 text-textSecondary">
                {detail.violationDescription}
              </Text>
            </View>
          ) : null}

          {/* ---- Nhận việc ---- */}
          {currentStep === 'accept' ? (
            <StagePanel title={STEP_META.accept.title}>
              {detail.canAcceptTask ? (
                <>
                  <Text className="mb-4 text-xs leading-[18px] text-textSecondary">
                    Nhận hồ sơ để bắt đầu điều tra. Sau khi nhận, hồ sơ chuyển sang trạng thái
                    “Đang điều tra”.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => void run(() => inspectionService.accept(id!), 'Đã nhận hồ sơ.')}
                    className="h-13 flex-row items-center justify-center gap-2 rounded-2xl"
                    style={{ backgroundColor: submitting ? colors.textDisabled : colors.primary, height: 52 }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="hand-left-outline" size={18} color={colors.white} />
                    )}
                    <Text className="text-sm font-bold text-white">Nhận hồ sơ</Text>
                  </Pressable>
                </>
              ) : (
                <Text className="text-xs leading-[18px] text-textSecondary">
                  Hồ sơ đã được nhận. Tiếp tục các bước tiếp theo.
                </Text>
              )}
            </StagePanel>
          ) : null}

          {/* ---- Xác nhận đến hiện trường ---- */}
          {currentStep === 'arrival' ? (
            <StagePanel title={STEP_META.arrival.title}>
              {detail.arrivalConfirmedAt ? (
                <View>
                  <Text className="text-xs text-textSecondary">
                    Đã xác nhận lúc{' '}
                    {new Date(detail.arrivalConfirmedAt).toLocaleString('vi-VN')}
                  </Text>
                  {detail.arrivalNote?.trim() ? (
                    <Text className="mt-1 text-xs leading-[18px] text-textSecondary">
                      Giải trình: {detail.arrivalNote.trim()}
                    </Text>
                  ) : null}
                </View>
              ) : detail.canConfirmArrival ? (
                <ArrivalConfirmCard
                  distanceMeters={arrival.distanceMeters}
                  hasCoords={Boolean(arrival.coords ?? sceneCoords)}
                  isLocating={arrival.isLocating}
                  locationError={arrival.locationError}
                  note={arrivalNote}
                  onChangeNote={setArrivalNote}
                  onRetryLocation={() => void arrival.retryLocation()}
                  submitting={submitting}
                  onConfirm={() => {
                    // Không có GPS thật → gửi toạ độ hiện trường kèm note giải trình.
                    const coords = arrival.coords ?? sceneCoords;
                    if (!coords) {
                      return;
                    }
                    void run(
                      () =>
                        inspectionService.confirmArrival(id!, {
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                          note: arrivalNote.trim() || undefined,
                        }),
                      'Đã xác nhận có mặt tại hiện trường.',
                    ).then((ok) => {
                      if (ok) setArrivalNote('');
                    });
                  }}
                />
              ) : (
                <Text className="text-xs leading-[18px] text-textSecondary">
                  Bước này chỉ khả dụng khi hồ sơ đang được điều tra. Đây là bước tùy chọn.
                </Text>
              )}
            </StagePanel>
          ) : null}

          {/* ---- Checklist hiện trường ---- */}
          {currentStep === 'checklist' ? (
            <StagePanel
              title={STEP_META.checklist.title}
              description="Hoàn thành các mục bắt buộc (*) trước khi chốt biên bản hiện trường."
            >
              {checklistStates.map((state) => (
                <ChecklistCategoryRow
                  key={state.category}
                  state={state}
                  disabled={checklistLocked}
                  onPress={(picked) => {
                    if (picked.category === 'ViolationStatus') return;
                    clearEvidenceError();
                    setActiveCategory(picked);
                  }}
                />
              ))}

              {!checklistLocked ? (
                <View className="mt-3 rounded-2xl bg-surface p-3.5">
                  <Text className="mb-2 text-sm font-bold text-textPrimary">
                    Tình trạng vi phạm <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TextInput
                    value={violationStatus}
                    onChangeText={setViolationStatus}
                    multiline
                    placeholder="Mô tả tình trạng vi phạm quan sát được tại hiện trường"
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    style={{ backgroundColor: colors.white }}
                    textAlignVertical="top"
                  />
                  <TextInput
                    value={otherNote}
                    onChangeText={setOtherNote}
                    multiline
                    placeholder="Ghi chú khác (tùy chọn)"
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    style={{ backgroundColor: colors.white }}
                    textAlignVertical="top"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || !violationStatus.trim()}
                    onPress={() =>
                      void run(
                        () =>
                          inspectionService.updateChecklist(id!, {
                            violationStatusText: violationStatus.trim(),
                            otherDescription: otherNote.trim() || undefined,
                          }),
                        'Đã lưu checklist.',
                      )
                    }
                    className="h-12 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        submitting || !violationStatus.trim() ? colors.textDisabled : colors.primary,
                    }}
                  >
                    <Text className="text-sm font-bold text-white">Lưu checklist</Text>
                  </Pressable>
                </View>
              ) : null}

              {detail.fieldInvestigationSubmittedAt ? (
                <View
                  className="mt-3 rounded-2xl px-3.5 py-3"
                  style={{ backgroundColor: colors.primaryLight }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.primaryDark }}>
                    Biên bản đã chốt lúc{' '}
                    {new Date(detail.fieldInvestigationSubmittedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
              ) : detail.canSubmitFieldReport ? (
                <View className="mt-3">
                  {missingRequirements.length > 0 ? (
                    <View
                      className="mb-3 rounded-2xl px-3.5 py-3"
                      style={{ backgroundColor: '#FFFBEB' }}
                    >
                      <Text className="text-xs font-bold" style={{ color: '#92400E' }}>
                        Còn thiếu: {missingRequirements.join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                  <Text className="mb-3 text-xs leading-[18px] text-textSecondary">
                    Sau khi chốt, checklist bị khóa và mở bước ra quyết định. Chỉ trưởng đoàn thực
                    hiện được.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || !canSubmitFieldReport}
                    onPress={() =>
                      void run(
                        () => inspectionService.submitFieldReport(id!),
                        'Đã chốt biên bản hiện trường.',
                      )
                    }
                    className="h-13 flex-row items-center justify-center gap-2 rounded-2xl"
                    style={{
                      backgroundColor:
                        submitting || !canSubmitFieldReport ? colors.textDisabled : colors.primary,
                      height: 52,
                    }}
                  >
                    <Ionicons name="lock-closed-outline" size={17} color={colors.white} />
                    <Text className="text-sm font-bold text-white">Chốt biên bản (Trưởng đoàn)</Text>
                  </Pressable>
                </View>
              ) : null}
            </StagePanel>
          ) : null}

          {/* ---- Quyết định xử lý ---- */}
          {currentStep === 'decision' ? (
            <StagePanel title={STEP_META.decision.title}>
              {!detail.canIssuePenalty && !detail.canCloseNoViolation ? (
                <Text className="text-xs leading-[18px] text-textSecondary">
                  {detail.penaltyIssuedAt || detail.status === 'ClosedNoViolation'
                    ? 'Đã có quyết định xử lý cho hồ sơ này.'
                    : 'Cần chốt biên bản hiện trường trước khi ra quyết định.'}
                </Text>
              ) : null}

              {detail.canIssuePenalty ? (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-bold text-textPrimary">
                    Ban hành quyết định xử phạt
                  </Text>
                  <View className="mb-3 flex-row flex-wrap gap-2">
                    {VIOLATION_LEVELS.map((level) => {
                      const isActive = violationLevel === level;
                      return (
                        <Pressable
                          key={level}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                          onPress={() => setViolationLevel(level)}
                          className={`rounded-full px-3.5 py-2 ${isActive ? 'bg-primary' : 'bg-surface'}`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isActive ? 'text-white' : 'text-textSecondary'
                            }`}
                          >
                            {VIOLATION_LEVEL_LABELS[level]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={penaltyAmount}
                    onChangeText={setPenaltyAmount}
                    keyboardType="number-pad"
                    placeholder="Số tiền phạt (VND)"
                    placeholderTextColor={colors.textSecondary}
                    className={INPUT_CLASS}
                  />
                  <TextInput
                    value={decisionNumber}
                    onChangeText={setDecisionNumber}
                    placeholder="Số quyết định (VD: QĐ-XP-2026-001)"
                    placeholderTextColor={colors.textSecondary}
                    className={INPUT_CLASS}
                  />
                  <TextInput
                    value={paymentDueDays}
                    onChangeText={setPaymentDueDays}
                    keyboardType="number-pad"
                    placeholder="Số ngày được nộp phạt"
                    placeholderTextColor={colors.textSecondary}
                    className={INPUT_CLASS}
                  />
                  <TextInput
                    value={additionalMeasures}
                    onChangeText={setAdditionalMeasures}
                    multiline
                    placeholder="Biện pháp bổ sung (tùy chọn)"
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    textAlignVertical="top"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      submitting || Number(penaltyAmount) <= 0 || !decisionNumber.trim()
                    }
                    onPress={() =>
                      void run(
                        () =>
                          inspectionService.issuePenalty(id!, {
                            violationLevel,
                            penaltyAmount: Number(penaltyAmount),
                            decisionNumber: decisionNumber.trim(),
                            paymentDueDays: Number(paymentDueDays) || 10,
                            additionalMeasures: additionalMeasures.trim() || undefined,
                          }),
                        'Đã ban hành quyết định xử phạt.',
                      )
                    }
                    className="h-13 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        submitting || Number(penaltyAmount) <= 0 || !decisionNumber.trim()
                          ? colors.textDisabled
                          : colors.primary,
                      height: 52,
                    }}
                  >
                    <Text className="text-sm font-bold text-white">Ban hành quyết định</Text>
                  </Pressable>
                </View>
              ) : null}

              {detail.canCloseNoViolation ? (
                <View style={detail.canIssuePenalty ? { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 } : undefined}>
                  <Text className="mb-2 text-sm font-bold text-textPrimary">
                    Đóng hồ sơ — không đủ căn cứ
                  </Text>
                  <TextInput
                    value={closeNoViolationReason}
                    onChangeText={setCloseNoViolationReason}
                    multiline
                    placeholder={`Lý do (tối thiểu ${MIN_CLOSE_REASON_LENGTH} ký tự)`}
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    textAlignVertical="top"
                  />
                  <Text className="mb-2 text-[11px] text-textSecondary">
                    {closeNoViolationReason.trim().length}/{MIN_CLOSE_REASON_LENGTH} ký tự
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      submitting ||
                      closeNoViolationReason.trim().length < MIN_CLOSE_REASON_LENGTH
                    }
                    onPress={() =>
                      void run(
                        () =>
                          inspectionService.closeNoViolation(id!, {
                            reason: closeNoViolationReason.trim(),
                          }),
                        'Đã đóng hồ sơ — không đủ căn cứ.',
                      )
                    }
                    className="h-12 items-center justify-center rounded-2xl bg-surface"
                    style={{
                      opacity:
                        closeNoViolationReason.trim().length < MIN_CLOSE_REASON_LENGTH ? 0.5 : 1,
                    }}
                  >
                    <Text className="text-sm font-bold text-textPrimary">Đóng không vi phạm</Text>
                  </Pressable>
                </View>
              ) : null}
            </StagePanel>
          ) : null}

          {/* ---- Nộp phạt & đóng hồ sơ ---- */}
          {currentStep === 'payment' ? (
            <StagePanel title={STEP_META.payment.title}>
              {!detail.canRecordPayment && !detail.canClose ? (
                <Text className="text-xs leading-[18px] text-textSecondary">
                  {detail.status === 'Closed'
                    ? 'Hồ sơ đã đóng.'
                    : 'Bước này khả dụng sau khi có quyết định xử phạt.'}
                </Text>
              ) : null}

              {detail.canRecordPayment ? (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-bold text-textPrimary">Ghi nhận nộp phạt</Text>
                  <TextInput
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                    keyboardType="number-pad"
                    placeholder="Số tiền đã nộp (VND)"
                    placeholderTextColor={colors.textSecondary}
                    className={INPUT_CLASS}
                  />

                  <Text className="mb-1.5 text-xs font-semibold text-textPrimary">
                    Biên lai <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  {receipt ? (
                    <View className="mb-3 flex-row items-center gap-3 rounded-2xl bg-surface p-2.5">
                      <Image
                        source={{ uri: receipt.uri }}
                        style={{ width: 52, height: 52, borderRadius: 12 }}
                      />
                      <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
                        {receipt.fileName}
                      </Text>
                      <Pressable onPress={() => setReceipt(null)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void handlePickReceipt()}
                      className="mb-3 items-center rounded-2xl bg-surface py-6"
                    >
                      <Ionicons name="receipt-outline" size={24} color={colors.textSecondary} />
                      <Text className="mt-1.5 text-xs font-semibold text-textPrimary">
                        Chọn ảnh biên lai
                      </Text>
                    </Pressable>
                  )}

                  <TextInput
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    multiline
                    placeholder="Ghi chú (tùy chọn)"
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    textAlignVertical="top"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || Number(paidAmount) <= 0 || !receipt}
                    onPress={() =>
                      void run(
                        () =>
                          inspectionService.recordPayment(id!, {
                            paidAmount: Number(paidAmount),
                            paidAt: new Date().toISOString(),
                            receipt: receipt!,
                            note: paymentNote.trim() || undefined,
                          }),
                        'Đã ghi nhận nộp phạt.',
                      ).then((ok) => {
                        if (ok) {
                          setPaidAmount('');
                          setPaymentNote('');
                          setReceipt(null);
                        }
                      })
                    }
                    className="h-13 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        submitting || Number(paidAmount) <= 0 || !receipt
                          ? colors.textDisabled
                          : colors.primary,
                      height: 52,
                    }}
                  >
                    <Text className="text-sm font-bold text-white">Ghi nhận nộp phạt</Text>
                  </Pressable>
                </View>
              ) : null}

              {detail.canClose ? (
                <View style={detail.canRecordPayment ? { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 } : undefined}>
                  <Text className="mb-2 text-sm font-bold text-textPrimary">Đóng hồ sơ</Text>
                  <TextInput
                    value={closeReason}
                    onChangeText={setCloseReason}
                    multiline
                    placeholder="Lý do đóng hồ sơ (tùy chọn)"
                    placeholderTextColor={colors.textSecondary}
                    className={TEXTAREA_CLASS}
                    textAlignVertical="top"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() =>
                      void run(
                        () =>
                          inspectionService.close(
                            id!,
                            closeReason.trim() ? { reason: closeReason.trim() } : undefined,
                          ),
                        'Đã đóng hồ sơ.',
                      )
                    }
                    className="h-13 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: submitting ? colors.textDisabled : colors.primary, height: 52 }}
                  >
                    <Text className="text-sm font-bold text-white">Đóng hồ sơ</Text>
                  </Pressable>
                </View>
              ) : null}
            </StagePanel>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <EvidenceCategorySheet
        state={activeCategory}
        visible={activeCategory !== null}
        uploading={isUploading && uploadingCategory === activeCategory?.category}
        errorMessage={evidenceError ?? audio.recordingError}
        readOnly={checklistLocked}
        onClose={() => {
          if (audio.isRecording) return; // không đóng giữa lúc đang ghi
          setActiveCategory(null);
          clearEvidenceError();
          audio.clearRecordingError();
        }}
        onPick={(category, source) => void handleEvidencePick(category, source)}
        recorderSlot={
          activeCategory?.category === 'Audio' ? (
            <AudioEvidenceRecorder
              isRecording={audio.isRecording}
              durationSeconds={audio.durationSeconds}
              maxDurationSeconds={audio.maxDurationSeconds}
              reachedLimit={audio.reachedLimit}
              uploading={isUploading && uploadingCategory === 'Audio'}
              onStart={() => void audio.start()}
              onStop={() => void handleStopRecording()}
            />
          ) : undefined
        }
      />
    </View>
  );
}
