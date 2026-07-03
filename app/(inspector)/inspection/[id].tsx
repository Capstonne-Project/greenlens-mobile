import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { inspectionService } from '@/services/inspection.service';
import { reportDetailService } from '@/services/reportDetail.service';
import { ReportMediaGallery } from '@/shared/components/ReportMediaGallery';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { SlaCountdown } from '@/shared/components/SlaCountdown';
import { colors } from '@/theme/colors';
import type { InspectionDetail, ViolationLevel } from '@/types/inspection.types';

const VIOLATION_LEVELS: ViolationLevel[] = ['Minor', 'Moderate', 'Severe', 'Critical'];

const VIOLATION_LEVEL_LABELS: Record<ViolationLevel, string> = {
  Minor: 'Nhẹ',
  Moderate: 'Trung bình',
  Severe: 'Nghiêm trọng',
  Critical: 'Đặc biệt nghiêm trọng',
};

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [reportMedia, setReportMedia] = useState<{ url: string; mimeType?: string }[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [violatorName, setViolatorName] = useState('');
  const [violatorAddress, setViolatorAddress] = useState('');
  const [violatorIdentity, setViolatorIdentity] = useState('');
  const [violationDescription, setViolationDescription] = useState('');
  const [violationLevel, setViolationLevel] = useState<ViolationLevel>('Moderate');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('10');
  const [additionalMeasures, setAdditionalMeasures] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [closeFinalReason, setCloseFinalReason] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inspectionService.getDetail(id);
      const data = res.data.data;
      setDetail(data);
      setViolatorName(data.violatorName ?? '');
      setViolatorAddress(data.violatorAddress ?? '');
      setViolatorIdentity(data.violatorIdentity ?? '');
      setViolationDescription(data.violationDescription ?? '');
      if (data.violationLevel) setViolationLevel(data.violationLevel);

      const reportRes = await reportDetailService.getById(data.reportId);
      setReportMedia(
        reportRes.data.data.media.map((m) => ({ url: m.url, mimeType: m.mediaType })),
      );
    } catch {
      setError('Không tải được chi tiết hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setSubmitting(true);
      try {
        await action();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Thành công', successMessage);
        await loadDetail();
      } catch {
        Alert.alert('Lỗi', 'Không thể thực hiện thao tác. Kiểm tra quyền và trạng thái hồ sơ.');
      } finally {
        setSubmitting(false);
      }
    },
    [loadDetail],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-textSecondary">{error ?? 'Không có dữ liệu'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="font-semibold text-primary">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="absolute left-0 right-0 z-10 px-4" style={{ top: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-white">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <ReportMediaGallery
          media={reportMedia}
          heroIndex={heroIndex}
          onSelectIndex={setHeroIndex}
        />

        <View className="px-4 pt-4">
          <View className="mb-2 flex-row flex-wrap items-center gap-2">
            <Text className="text-xs text-textSecondary">{detail.reportCode}</Text>
            <StatusBadge kind="inspection" status={detail.status} />
          </View>
          <Text className="mb-1 text-xl font-bold text-textPrimary">{detail.violatorName ?? 'Chưa có tên vi phạm'}</Text>
          <Text className="mb-1 text-sm text-textSecondary">{detail.assignedTeamName}</Text>
          {detail.violatorAddress ? (
            <Text className="mb-2 text-sm text-textSecondary">{detail.violatorAddress}</Text>
          ) : null}
          {detail.slaInspectionDueAt ? (
            <View className="mb-3"><SlaCountdown dueAt={detail.slaInspectionDueAt} /></View>
          ) : null}
          {detail.penaltyAmount != null ? (
            <Text className="mb-1 text-sm text-textSecondary">
              QĐ phạt: {detail.penaltyAmount.toLocaleString('vi-VN')} VND
              {detail.paidAmount != null ? ` · Đã nộp: ${detail.paidAmount.toLocaleString('vi-VN')}` : ''}
            </Text>
          ) : null}

          {detail.canEditDetails && (
            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-2 text-sm font-bold text-textPrimary">Biên bản hiện trường</Text>
              <TextInput
                value={violatorName}
                onChangeText={setViolatorName}
                placeholder="Tên đối tượng vi phạm"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={violatorAddress}
                onChangeText={setViolatorAddress}
                placeholder="Địa chỉ hiện trường"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={violatorIdentity}
                onChangeText={setViolatorIdentity}
                placeholder="Mã số / CCCD / MST"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={violationDescription}
                onChangeText={setViolationDescription}
                multiline
                placeholder="Mô tả vi phạm sau điều tra"
                className="mb-3 min-h-[80px] rounded-xl border border-border px-3 py-2 text-sm text-textPrimary"
              />
              <Pressable
                disabled={submitting}
                onPress={() =>
                  void runAction(
                    () =>
                      inspectionService.updateDetails(id!, {
                        violatorName: violatorName.trim() || undefined,
                        violatorAddress: violatorAddress.trim() || undefined,
                        violatorIdentity: violatorIdentity.trim() || undefined,
                        violationDescription: violationDescription.trim() || undefined,
                      }),
                    'Đã lưu biên bản.',
                  )
                }
                className="h-11 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="font-bold text-white">Lưu biên bản</Text>
              </Pressable>
            </View>
          )}

          {detail.canIssuePenalty && (
            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-2 text-sm font-bold text-textPrimary">Ban hành quyết định phạt</Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {VIOLATION_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setViolationLevel(level)}
                    className={`rounded-full px-3 py-1.5 ${violationLevel === level ? 'bg-primary' : 'bg-surface'}`}
                  >
                    <Text className={`text-xs font-semibold ${violationLevel === level ? 'text-white' : 'text-textSecondary'}`}>
                      {VIOLATION_LEVEL_LABELS[level]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={penaltyAmount}
                onChangeText={setPenaltyAmount}
                keyboardType="numeric"
                placeholder="Số tiền phạt (VND)"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={decisionNumber}
                onChangeText={setDecisionNumber}
                placeholder="Số quyết định (QĐ-XP-2026-001)"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={paymentDueDays}
                onChangeText={setPaymentDueDays}
                keyboardType="numeric"
                placeholder="Số ngày nộp phạt"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <TextInput
                value={additionalMeasures}
                onChangeText={setAdditionalMeasures}
                multiline
                placeholder="Biện pháp bổ sung (tùy chọn)"
                className="mb-3 min-h-[64px] rounded-xl border border-border px-3 py-2 text-sm text-textPrimary"
              />
              <Pressable
                disabled={submitting || !penaltyAmount || !decisionNumber.trim()}
                onPress={() =>
                  void runAction(
                    () =>
                      inspectionService.issuePenalty(id!, {
                        violationLevel,
                        penaltyAmount: Number(penaltyAmount),
                        decisionNumber: decisionNumber.trim(),
                        paymentDueDays: Number(paymentDueDays) || 10,
                        additionalMeasures: additionalMeasures.trim() || undefined,
                      }),
                    'Đã ban hành QĐ phạt.',
                  )
                }
                className="h-11 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="font-bold text-white">Ban hành phạt</Text>
              </Pressable>
            </View>
          )}

          {detail.canRecordPayment && (
            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-2 text-sm font-bold text-textPrimary">Ghi nhận nộp phạt</Text>
              <TextInput
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="numeric"
                placeholder="Số tiền đã nộp"
                className="mb-3 h-11 rounded-xl border border-border px-3 text-sm text-textPrimary"
              />
              <Pressable
                disabled={submitting}
                onPress={() =>
                  void runAction(
                    () => inspectionService.recordPayment(id!, { paidAmount: Number(paidAmount) }),
                    'Đã ghi nhận thanh toán.',
                  )
                }
                className="h-11 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="font-bold text-white">Ghi nhận nộp phạt</Text>
              </Pressable>
            </View>
          )}

          {detail.canCloseNoViolation && (
            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-2 text-sm font-bold text-textPrimary">Đóng — không đủ căn cứ</Text>
              <TextInput
                value={closeReason}
                onChangeText={setCloseReason}
                multiline
                placeholder="Lý do (≥ 50 ký tự)"
                className="mb-3 min-h-[88px] rounded-xl border border-border px-3 py-2 text-sm text-textPrimary"
              />
              <Pressable
                disabled={submitting || closeReason.trim().length < 50}
                onPress={() =>
                  void runAction(
                    () => inspectionService.closeNoViolation(id!, { reason: closeReason.trim() }),
                    'Đã đóng hồ sơ.',
                  )
                }
                className="h-11 items-center justify-center rounded-xl border border-border"
              >
                <Text className="font-semibold text-textSecondary">Đóng không vi phạm</Text>
              </Pressable>
            </View>
          )}

          {detail.canClose && (
            <View className="mb-4 rounded-2xl bg-white p-4">
              <TextInput
                value={closeFinalReason}
                onChangeText={setCloseFinalReason}
                multiline
                placeholder="Lý do đóng hồ sơ (tùy chọn)"
                className="mb-3 min-h-[64px] rounded-xl border border-border px-3 py-2 text-sm text-textPrimary"
              />
              <Pressable
                disabled={submitting}
                onPress={() =>
                  void runAction(
                    () =>
                      inspectionService.close(
                        id!,
                        closeFinalReason.trim() ? { reason: closeFinalReason.trim() } : undefined,
                      ),
                    'Đã đóng hồ sơ.',
                  )
                }
                className="h-12 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="font-bold text-white">Đóng hồ sơ</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
