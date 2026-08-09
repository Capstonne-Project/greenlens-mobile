import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  ChecklistSectionBlock,
  EvidenceCategoryContent,
  EvidencePlayerModal,
  InspectionCaseHeader,
  InspectionFeedbackBanner,
  StagePanel,
  StageTracker,
  type StageDef,
  ViolationReportDocument,
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
import type {
  EvidenceCategory,
  InspectionEvidenceItem,
  ViolationLevel,
} from '@/types/inspection.types';
import { formatVndDigits, parseVndDigits, vndToWords } from '@/utils/currency';
import {
  buildChecklistState,
  getMissingRequirements,
  ROMAN_NUMERALS,
} from '@/utils/inspection-checklist';
import {
  EMPTY_VIOLATION_REPORT_VALUES,
  parseViolationReport,
  serializeViolationReport,
  VIOLATION_REPORT_SECTIONS,
  type ViolationReportValues,
} from '@/utils/violation-report-template';

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
/** Ô nhập kiểu "điền vào dòng kẻ" của biên bản giấy — gạch chân đơn, không nền, không bo góc. */
const PAPER_INPUT_CLASS = 'mb-3 h-9 border-b border-textDisabled px-0.5 text-sm text-textPrimary';
const PAPER_TEXTAREA_CLASS = 'mb-3 min-h-[56px] border-b border-textDisabled px-0.5 text-sm text-textPrimary';

/** Nút hành động chính trong sticky footer — style đồng nhất cho mọi stage. */
interface FooterButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  tone?: 'primary' | 'neutral';
}

function FooterButton({ label, icon, disabled, loading, onPress, tone = 'primary' }: FooterButtonProps) {
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`h-13 flex-row items-center justify-center gap-2 rounded-2xl ${!isPrimary ? 'bg-surface' : ''}`}
      style={{
        height: 52,
        backgroundColor: isPrimary ? (disabled ? colors.textDisabled : colors.primary) : undefined,
        opacity: !isPrimary && disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? colors.white : colors.textPrimary} />
      ) : icon ? (
        <Ionicons name={icon} size={17} color={isPrimary ? colors.white : colors.textPrimary} />
      ) : null}
      <Text className={`text-sm font-bold ${isPrimary ? 'text-white' : 'text-textPrimary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

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
    compressProgress,
    evidenceError,
    clearEvidenceError,
  } = useInspectionEvidence({ inspectionId: id, onUploaded: refetch });
  const audio = useEvidenceAudioRecorder();

  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  /** Bằng chứng video/ghi âm đang mở trong trình phát. */
  const [previewItem, setPreviewItem] = useState<InspectionEvidenceItem | null>(null);

  // Form state
  const [arrivalNote, setArrivalNote] = useState('');
  const [violatorName, setViolatorName] = useState('');
  const [violatorAddress, setViolatorAddress] = useState('');
  const [violatorIdentity, setViolatorIdentity] = useState('');
  const [violationReport, setViolationReport] = useState<ViolationReportValues>(
    EMPTY_VIOLATION_REPORT_VALUES,
  );
  const [otherNote, setOtherNote] = useState('');
  const [violationLevel, setViolationLevel] = useState<ViolationLevel>('Moderate');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('10');
  const [additionalMeasures, setAdditionalMeasures] = useState('');
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
    setViolatorName(detail.violatorName ?? '');
    setViolatorAddress(detail.violatorAddress ?? '');
    setViolatorIdentity(detail.violatorIdentity ?? '');
    setViolationReport(
      parseViolationReport(states.find((s) => s.category === 'ViolationStatus')?.note),
    );
    setOtherNote(states.find((s) => s.category === 'Other')?.note ?? '');
    if (detail.violationLevel) setViolationLevel(detail.violationLevel);

    setActiveStep((current) => {
      if (current) return current;
      if (detail.canAcceptTask) return 'accept';
      if (detail.canConfirmArrival && !detail.arrivalConfirmedAt) return 'arrival';
      if (detail.canEditChecklist) return 'checklist';
      if (detail.canIssuePenalty || detail.canCloseNoViolation) return 'decision';
      if (detail.canClose) return 'payment';
      return null;
    });
  }, [detail]);

  const handleEvidencePick = useCallback(
    async (category: EvidenceCategory, source: 'camera' | 'library') => {
      await upload(category, source);
    },
    [upload],
  );

  const handleStopRecording = useCallback(async () => {
    const recorded = await audio.stop();
    if (!recorded) return;
    await uploadFile('Audio', {
      uri: recorded.uri,
      fileName: recorded.fileName,
      mimeType: recorded.mimeType,
      // BE từ chối durationSeconds = 0 — bản ghi < 1s bỏ qua field này.
      ...(recorded.durationSeconds >= 1
        ? { durationSeconds: recorded.durationSeconds }
        : {}),
    });
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
    payment: stepStatus.payment === 'done' || detail.canClose,
  };

  const stages: StageDef<StepKey>[] = STEP_ORDER.map((key) => ({
    key,
    label: STEP_META[key].label,
    icon: STEP_META[key].icon,
    status: stepStatus[key] === 'done' ? 'done' : stepUnlocked[key] ? 'pending' : 'locked',
  }));

  const currentStep = activeStep ?? 'accept';

  // ---- Footer: nút hành động chính của stage đang xem — luôn sticky đáy màn hình. ----
  const footerButtons: FooterButtonProps[] = [];

  if (currentStep === 'accept' && detail.canAcceptTask) {
    footerButtons.push({
      label: 'Nhận hồ sơ',
      icon: 'hand-left-outline',
      disabled: submitting,
      loading: submitting,
      onPress: () => void run(() => inspectionService.accept(id!), 'Đã nhận hồ sơ.'),
    });
  }

  if (currentStep === 'checklist' && !checklistLocked) {
    footerButtons.push({
      label: 'Lưu checklist',
      disabled: submitting || !violationReport.severity.trim(),
      loading: submitting,
      onPress: () =>
        void run(
          async () => {
            await inspectionService.updateDetails(id!, {
              violatorName: violatorName.trim() || undefined,
              violatorAddress: violatorAddress.trim() || undefined,
              violatorIdentity: violatorIdentity.trim() || undefined,
            });
            await inspectionService.updateChecklist(id!, {
              violationStatusText: serializeViolationReport(violationReport),
              otherDescription: otherNote.trim() || undefined,
            });
          },
          'Đã lưu checklist.',
        ),
    });
  }
  if (currentStep === 'checklist' && !detail.fieldInvestigationSubmittedAt && detail.canSubmitFieldReport) {
    footerButtons.push({
      label: 'Chốt biên bản (Trưởng đoàn)',
      icon: 'lock-closed-outline',
      disabled: submitting || !canSubmitFieldReport,
      loading: submitting,
      onPress: () =>
        void run(() => inspectionService.submitFieldReport(id!), 'Đã chốt biên bản hiện trường.'),
    });
  }

  if (currentStep === 'decision' && detail.canIssuePenalty) {
    footerButtons.push({
      label: 'Ban hành quyết định',
      disabled: submitting || parseVndDigits(penaltyAmount) <= 0 || !decisionNumber.trim(),
      loading: submitting,
      onPress: () =>
        void run(
          () =>
            inspectionService.issuePenalty(id!, {
              violationLevel,
              penaltyAmount: parseVndDigits(penaltyAmount),
              decisionNumber: decisionNumber.trim(),
              paymentDueDays: Number(paymentDueDays) || 10,
              additionalMeasures: additionalMeasures.trim() || undefined,
            }),
          'Đã ban hành quyết định xử phạt.',
        ),
    });
  }
  if (currentStep === 'decision' && detail.canCloseNoViolation) {
    footerButtons.push({
      label: 'Đóng không vi phạm',
      tone: 'neutral',
      disabled: submitting || closeNoViolationReason.trim().length < MIN_CLOSE_REASON_LENGTH,
      loading: submitting,
      onPress: () =>
        void run(
          () => inspectionService.closeNoViolation(id!, { reason: closeNoViolationReason.trim() }),
          'Đã đóng hồ sơ — không đủ căn cứ.',
        ),
    });
  }

  if (currentStep === 'payment' && detail.canClose) {
    footerButtons.push({
      label: 'Đóng hồ sơ',
      disabled: submitting,
      loading: submitting,
      onPress: () =>
        void run(
          () =>
            inspectionService.close(
              id!,
              closeReason.trim() ? { reason: closeReason.trim() } : undefined,
            ),
          'Đã đóng hồ sơ.',
        ),
    });
  }

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

      <View className="bg-white pb-3 pt-4">
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
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
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
                <Text className="text-xs leading-[18px] text-textSecondary">
                  Nhận hồ sơ để bắt đầu điều tra. Sau khi nhận, hồ sơ chuyển sang trạng thái
                  “Đang điều tra”.
                </Text>
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

          {/* ---- Checklist hiện trường — trình bày như 1 tờ biên bản, mọi mục luôn hiện ---- */}
          {currentStep === 'checklist' ? (
            <StagePanel
              title={STEP_META.checklist.title}
              description="Hoàn thành các mục bắt buộc (*) trước khi chốt biên bản hiện trường."
            >
              {checklistLocked && detail.fieldInvestigationSubmittedAt ? (
                <ViolationReportDocument
                  reportCode={detail.reportCode}
                  submittedAt={detail.fieldInvestigationSubmittedAt}
                  preparedByName={detail.assignedTeamName}
                  violator={{
                    name: detail.violatorName,
                    address: detail.violatorAddress,
                    identity: detail.violatorIdentity,
                  }}
                  sections={parseViolationReport(
                    checklistStates.find((s) => s.category === 'ViolationStatus')?.note,
                  )}
                  evidenceStates={checklistStates.filter((s) => s.category !== 'ViolationStatus')}
                />
              ) : (
                <View className="bg-white p-5" style={{ borderWidth: 1, borderColor: colors.textPrimary }}>
                  <Text className="text-center text-base font-extrabold uppercase tracking-wide text-textPrimary">
                    Biên bản ghi nhận hiện trường
                  </Text>
                  <Text className="mt-1 text-center text-xs italic text-textSecondary">
                    (Số hồ sơ: {detail.reportCode})
                  </Text>

                  {/*
                    BE cho phép UpdateDetails ngay trong InProgress (cùng nhóm với
                    UpdateChecklist — xem docs/inspection-penalty-handover-flow.md dòng 273),
                    nên hiện form theo cùng điều kiện các mục checklist khác, không phụ thuộc
                    `canEditDetails` (flag đó phản ánh rule Draft cũ, không khớp flow checklist).
                  */}
                  <View className="mt-5 mb-5">
                    <Text className="mb-2.5 text-sm font-bold text-textPrimary">Đối tượng vi phạm</Text>
                    <TextInput
                      value={violatorName}
                      onChangeText={setViolatorName}
                      placeholder="Họ tên / Tên cơ sở"
                      placeholderTextColor={colors.textDisabled}
                      className={PAPER_INPUT_CLASS}
                    />
                    <TextInput
                      value={violatorAddress}
                      onChangeText={setViolatorAddress}
                      placeholder="Địa chỉ"
                      placeholderTextColor={colors.textDisabled}
                      className={PAPER_INPUT_CLASS}
                    />
                    <TextInput
                      value={violatorIdentity}
                      onChangeText={setViolatorIdentity}
                      placeholder="CCCD / Mã số thuế"
                      placeholderTextColor={colors.textDisabled}
                      className={PAPER_INPUT_CLASS}
                    />
                  </View>

                  {checklistStates.map((state, index) => {
                    const numeral = ROMAN_NUMERALS[index] ?? String(index + 1);

                    if (state.category === 'ViolationStatus') {
                      return (
                        <ChecklistSectionBlock key={state.category} numeral={numeral} state={state}>
                          {VIOLATION_REPORT_SECTIONS.map((section) => (
                            <View key={section.key} className="mb-3">
                              <Text className="mb-1 text-sm text-textPrimary">
                                {section.label}
                                {section.required ? (
                                  <Text style={{ color: colors.error }}> *</Text>
                                ) : null}
                              </Text>
                              <TextInput
                                value={violationReport[section.key]}
                                onChangeText={(text) =>
                                  setViolationReport((current) => ({ ...current, [section.key]: text }))
                                }
                                multiline
                                placeholder={section.placeholder}
                                placeholderTextColor={colors.textDisabled}
                                className={PAPER_TEXTAREA_CLASS}
                                textAlignVertical="top"
                              />
                            </View>
                          ))}
                        </ChecklistSectionBlock>
                      );
                    }

                    const category = state.category as EvidenceCategory;
                    return (
                      <ChecklistSectionBlock key={state.category} numeral={numeral} state={state}>
                        <EvidenceCategoryContent
                          state={state}
                          uploading={isUploading && uploadingCategory === category}
                          compressProgress={
                            uploadingCategory === category ? compressProgress : null
                          }
                          errorMessage={
                            evidenceError ?? (category === 'Audio' ? audio.recordingError : null)
                          }
                          readOnly={checklistLocked}
                          onPick={(pickedCategory, source) => void handleEvidencePick(pickedCategory, source)}
                          onPreview={setPreviewItem}
                          recorderSlot={
                            category === 'Audio' ? (
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
                      </ChecklistSectionBlock>
                    );
                  })}
                </View>
              )}

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
                missingRequirements.length > 0 ? (
                  <View
                    className="mt-3 rounded-2xl px-3.5 py-3"
                    style={{ backgroundColor: '#FFFBEB' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: '#92400E' }}>
                      Còn thiếu: {missingRequirements.join(' · ')}
                    </Text>
                  </View>
                ) : (
                  <Text className="mt-3 text-xs leading-[18px] text-textSecondary">
                    Sau khi chốt, checklist bị khóa và mở bước ra quyết định. Chỉ trưởng đoàn thực
                    hiện được.
                  </Text>
                )
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
                    onChangeText={(text) => setPenaltyAmount(formatVndDigits(text))}
                    keyboardType="number-pad"
                    placeholder="Số tiền phạt (VND)"
                    placeholderTextColor={colors.textSecondary}
                    className={INPUT_CLASS}
                  />
                  {parseVndDigits(penaltyAmount) > 0 ? (
                    <Text className="-mt-2 mb-3 text-xs italic text-textSecondary">
                      {vndToWords(parseVndDigits(penaltyAmount))}
                    </Text>
                  ) : null}
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
                  <Text className="text-[11px] text-textSecondary">
                    {closeNoViolationReason.trim().length}/{MIN_CLOSE_REASON_LENGTH} ký tự
                  </Text>
                </View>
              ) : null}
            </StagePanel>
          ) : null}

          {/* ---- Đóng hồ sơ ---- */}
          {currentStep === 'payment' ? (
            <StagePanel title={STEP_META.payment.title}>
              {!detail.canClose ? (
                <Text className="text-xs leading-[18px] text-textSecondary">
                  {detail.status === 'Closed'
                    ? 'Hồ sơ đã đóng.'
                    : 'LEO ghi nhận nộp phạt trên hệ thống web. Khi hồ sơ chuyển sang trạng thái đã nộp đủ, bước đóng hồ sơ sẽ khả dụng ở đây.'}
                </Text>
              ) : null}

              {detail.canClose ? (
                <View>
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
                </View>
              ) : null}
            </StagePanel>
          ) : null}
        </ScrollView>

        {footerButtons.length > 0 ? (
          <View
            className="gap-2 border-t border-border bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {footerButtons.map((btn) => (
              <FooterButton key={btn.label} {...btn} />
            ))}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <EvidencePlayerModal
        visible={previewItem !== null}
        kind={previewItem?.category === 'Audio' ? 'audio' : 'video'}
        uri={previewItem?.mediaUrl ?? null}
        title={previewItem?.category === 'Audio' ? 'Bản ghi âm hiện trường' : 'Video hiện trường'}
        onClose={() => setPreviewItem(null)}
      />
    </View>
  );
}
