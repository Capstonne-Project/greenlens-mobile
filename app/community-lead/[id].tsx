import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { EvidencePhotoPicker } from '@/components/assignment/EvidencePhotoPicker';
import { AccordionStepSection } from '@/components/common/AccordionStepSection';
import { ParticipantsListModal } from '@/components/community/ParticipantsListModal';
import { ParticipantsSummaryCard } from '@/components/community/ParticipantsSummaryCard';
import { ReportLocationMap } from '@/components/report/ReportLocationMap';
import { Text } from '@/components/ui/text';
import { Toast, useToast } from '@/components/common/Toast';
import { useCommunityParticipants } from '@/hooks/useCommunityParticipants';
import { uploadReportImage } from '@/services/pollutionReport.service';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { compressImage, UPLOAD_COMPRESS_PRESET } from '@/utils/compress-image';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { firstRouteParam } from '@/utils/field-worker-task';
import type {
  CommunityCleanupEventDetail,
  CommunityCleanupSeverity,
} from '@/types/community-cleanup.types';

interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#065F46', bg: '#D1FAE5' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E', bg: '#FEF3C7' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF', bg: '#DBEAFE' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9', bg: '#EDE9FE' },
  Completed: { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B', bg: '#FEE2E2' },
};

const SEVERITY_CONFIG: Record<CommunityCleanupSeverity, { label: string; color: string; bg: string }> = {
  Low: { label: 'Mức độ thấp', color: '#166534', bg: colors.severityLow },
  Medium: { label: 'Mức độ trung bình', color: '#713F12', bg: colors.severityMedium },
  High: { label: 'Mức độ cao', color: colors.white, bg: colors.severityHigh },
  Critical: { label: 'Mức độ nghiêm trọng', color: colors.white, bg: colors.severityCritical },
};

type CleanupStepKey = 'before' | 'progress' | 'after';

function formatStartsAt(iso: string): string {
  const d = new Date(iso);
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${time} ngày ${date}`;
}

async function pickAndCompress(
  source: 'camera' | 'library',
  baseName: string,
  maxCount: number,
  currentCount: number,
): Promise<PickedImage[]> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('CAMERA_PERMISSION_DENIED');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return [];
    const asset = result.assets[0];
    const compressed = await compressImage(asset.uri, {
      ...UPLOAD_COMPRESS_PRESET, baseName, sourceWidth: asset.width, sourceHeight: asset.height,
    });
    return [compressed];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: true,
    selectionLimit: Math.max(1, maxCount - currentCount), quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(
    result.assets.slice(0, maxCount - currentCount).map((a) =>
      compressImage(a.uri, { ...UPLOAD_COMPRESS_PRESET, baseName, sourceWidth: a.width, sourceHeight: a.height })),
  );
}

async function uploadAll(images: PickedImage[], purpose: 'Before' | 'Progress' | 'After', reportId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const img of images) {
    const uploaded = await uploadReportImage({ uri: img.uri, mimeType: img.mimeType, fileName: img.fileName, purpose, reportId });
    urls.push(uploaded.url);
  }
  return urls;
}

export default function CommunityLeadWorkspaceScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = firstRouteParam(params.id);
  const insets = useSafeAreaInsets();
  const { toastState, show: showToast, hide: hideToast } = useToast();

  const [event, setEvent] = useState<CommunityCleanupEventDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [isActing, setActing] = useState(false);

  const [beforeImages, setBeforeImages] = useState<PickedImage[]>([]);
  const [afterImages, setAfterImages] = useState<PickedImage[]>([]);
  const [percentInput, setPercentInput] = useState('0');
  const [progressNote, setProgressNote] = useState('');
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [expandedStep, setExpandedStep] = useState<CleanupStepKey>('before');
  const stepInitializedRef = useRef(false);

  const participants = useCommunityParticipants(eventId);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getById(eventId);
      setEvent(res.data.data);
      setPercentInput(String(res.data.data.progressPercent));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải chi tiết chương trình.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Chọn bước accordion mặc định đúng theo tiến độ đã lưu — chỉ chạy 1 lần khi có dữ liệu. */
  useEffect(() => {
    if (!event || event.status !== 'InProgress' || stepInitializedRef.current) return;
    stepInitializedRef.current = true;
    const hasBefore = event.mediaSummary.beforeCount > 0;
    if (!hasBefore) setExpandedStep('before');
    else if (event.progressPercent < 100) setExpandedStep('progress');
    else setExpandedStep('after');
  }, [event]);

  /** BR-CMU: check-in/bắt đầu chỉ được phép từ giờ StartsAt của chương trình trở đi. */
  const guardStartTime = useCallback((): boolean => {
    if (!event) return false;
    const startsAtMs = new Date(event.startsAt).getTime();
    if (Date.now() < startsAtMs) {
      showToast(`Chưa đến giờ bắt đầu dọn dẹp. Dự kiến bắt đầu lúc ${formatStartsAt(event.startsAt)}.`, 'error');
      return false;
    }
    return true;
  }, [event, showToast]);

  const handleStart = useCallback(async () => {
    if (!eventId || isActing || !guardStartTime()) return;
    setActing(true);
    try {
      await communityCleanupService.start(eventId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã bắt đầu dọn dẹp!', 'success');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể bắt đầu.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, guardStartTime, load, showToast]);

  const handleCheckIn = useCallback(async () => {
    if (!eventId || isActing || !guardStartTime()) return;
    setActing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Cần quyền truy cập vị trí để check-in.', 'error');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      await communityCleanupService.checkIn(eventId, position.coords.latitude, position.coords.longitude);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Check-in thành công!', 'success');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể check-in.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, guardStartTime, load, showToast]);

  const addImages = useCallback(
    async (target: 'before' | 'after', source: 'camera' | 'library') => {
      const setter = target === 'before' ? setBeforeImages : setAfterImages;
      const current = target === 'before' ? beforeImages : afterImages;
      setProcessingPhotos(true);
      try {
        const picked = await pickAndCompress(source, target, 5, current.length);
        if (picked.length > 0) setter((prev) => [...prev, ...picked].slice(0, 5));
      } catch (err) {
        showToast(err instanceof Error && err.message === 'CAMERA_PERMISSION_DENIED'
          ? 'Cần quyền camera để chụp ảnh.'
          : 'Không thể xử lý ảnh. Thử lại.', 'error');
      } finally {
        setProcessingPhotos(false);
      }
    },
    [beforeImages, afterImages, showToast],
  );

  const removeImage = useCallback((target: 'before' | 'after', index: number) => {
    const setter = target === 'before' ? setBeforeImages : setAfterImages;
    setter((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitBeforeImages = useCallback(async () => {
    if (!eventId || isActing || beforeImages.length === 0) return;
    setActing(true);
    try {
      const urls = await uploadAll(beforeImages, 'Before', event?.reportId ?? '');
      await communityCleanupService.uploadBeforeImages(eventId, urls);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã lưu ảnh trước khi dọn.', 'success');
      setBeforeImages([]);
      setExpandedStep('progress');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể lưu ảnh.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, beforeImages, event?.reportId, load, showToast]);

  const handleUpdateProgress = useCallback(async () => {
    if (!eventId || isActing) return;
    const percent = Math.min(100, Math.max(0, parseInt(percentInput, 10) || 0));
    setActing(true);
    try {
      await communityCleanupService.updateProgress(eventId, {
        percent,
        note: progressNote.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã cập nhật tiến độ.', 'success');
      if (percent === 100) setExpandedStep('after');
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể cập nhật tiến độ.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, percentInput, progressNote, load, showToast]);

  const handleSubmitVerification = useCallback(async () => {
    if (!eventId || isActing || afterImages.length < 2) return;
    setActing(true);
    try {
      const urls = await uploadAll(afterImages, 'After', event?.reportId ?? '');
      await communityCleanupService.submitVerification(eventId, urls);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã nộp xác thực, chờ LEO duyệt.', 'success');
      setAfterImages([]);
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể nộp xác thực.'), 'error');
    } finally {
      setActing(false);
    }
  }, [eventId, isActing, afterImages, event?.reportId, load, showToast]);

  const statusCfg = event ? (STATUS_CONFIG[event.status] ?? STATUS_CONFIG.OpenForJoin) : null;
  const severityCfg = event ? (SEVERITY_CONFIG[event.severity] ?? null) : null;
  const hasBeforeMedia = (event?.mediaSummary.beforeCount ?? 0) > 0;
  const canSubmitVerification = event?.progressPercent === 100 && hasBeforeMedia && afterImages.length >= 2;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text className="text-lg font-bold text-textPrimary" numberOfLines={1} style={{ maxWidth: 160 }}>
            Không gian điều phối
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: '#111827' }}>
            <Ionicons name="people" size={11} color="#fff" />
            <Text className="text-[11px] font-bold text-white">Cộng đồng</Text>
          </View>
          {statusCfg ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusCfg.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={52} color={colors.error} />
          <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
          <Pressable onPress={load} className="mt-4 rounded-xl px-6 py-2.5" style={{ backgroundColor: colors.primary }}>
            <Text className="font-semibold text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : event ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <Text className="text-xs text-textSecondary">{event.reportCode}</Text>
          <Text className="mb-2 text-xl font-bold text-textPrimary">{event.title}</Text>

          <View className="mb-3 flex-row flex-wrap items-center gap-1.5">
            <View className="flex-row items-center gap-1 rounded-full bg-surface px-2.5 py-1">
              <Ionicons name="pricetag-outline" size={12} color={colors.textSecondary} />
              <Text className="text-[11px] font-semibold text-textSecondary">{event.categoryName}</Text>
            </View>
            {severityCfg ? (
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: severityCfg.bg }}>
                <Text className="text-[11px] font-bold" style={{ color: severityCfg.color }}>
                  {severityCfg.label}
                </Text>
              </View>
            ) : null}
          </View>

          {event.description ? (
            <Text className="mb-4 text-sm leading-5 text-textSecondary">{event.description}</Text>
          ) : null}

          <ReportLocationMap
            latitude={event.reportLatitude}
            longitude={event.reportLongitude}
            address={event.reportAddress}
          />
          {event.meetingNote ? (
            <View className="mb-4 flex-row items-start gap-1.5 rounded-xl bg-surface p-3">
              <Ionicons name="flag-outline" size={15} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs leading-4 text-textSecondary">{event.meetingNote}</Text>
            </View>
          ) : null}

          <ParticipantsSummaryCard
            participantCount={event.participantCount}
            maxParticipants={event.maxParticipants}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setParticipantsModalVisible(true);
            }}
          />

          {(event.status === 'OpenForJoin' || event.status === 'JoinClosed') ? (
            <View className="mt-2 gap-2">
              <AssignmentActionButton
                label="Check-in tại điểm tập trung"
                icon="location"
                variant="secondary"
                onPress={handleCheckIn}
                loading={isActing}
                disabled={isActing}
              />
              <AssignmentActionButton
                label="Bắt đầu dọn dẹp"
                icon="play"
                variant="primary"
                onPress={handleStart}
                loading={isActing}
                disabled={isActing}
              />
            </View>
          ) : null}

          {event.status === 'InProgress' ? (
            <View className="mt-2">
              <AccordionStepSection
                stepNumber={1}
                title="Ảnh trước khi dọn"
                completed={hasBeforeMedia}
                expanded={expandedStep === 'before'}
                onToggle={() => setExpandedStep('before')}
              >
                {hasBeforeMedia ? (
                  <Text className="text-sm text-textSecondary">
                    Đã lưu {event.mediaSummary.beforeCount} ảnh trước khi dọn.
                  </Text>
                ) : (
                  <>
                    <EvidencePhotoPicker
                      images={beforeImages}
                      minimum={1}
                      maximum={5}
                      onTakePhoto={() => void addImages('before', 'camera')}
                      onChooseLibrary={() => void addImages('before', 'library')}
                      onRemove={(i) => removeImage('before', i)}
                      processing={processingPhotos}
                    />
                    <View className="mt-3">
                      <AssignmentActionButton
                        label="Lưu ảnh trước khi dọn" icon="checkmark" variant="primary"
                        onPress={handleSubmitBeforeImages}
                        disabled={isActing || beforeImages.length === 0}
                        loading={isActing}
                      />
                    </View>
                  </>
                )}
              </AccordionStepSection>

              <AccordionStepSection
                stepNumber={2}
                title="Cập nhật tiến độ"
                completed={event.progressPercent === 100}
                expanded={expandedStep === 'progress'}
                onToggle={() => setExpandedStep('progress')}
              >
                <View className="mb-2 flex-row items-end gap-1">
                  <TextInput
                    value={percentInput}
                    onChangeText={setPercentInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={{ fontSize: 40, fontWeight: '800', color: colors.textPrimary, minWidth: 70 }}
                  />
                  <Text className="mb-1 text-xl font-bold" style={{ color: colors.textSecondary }}>%</Text>
                </View>
                <View className="mb-3 h-2 overflow-hidden rounded-full bg-surface">
                  <View className="h-full rounded-full" style={{
                    width: `${Math.min(100, Math.max(0, parseInt(percentInput, 10) || 0))}%` as `${number}%`,
                    backgroundColor: colors.primary,
                  }} />
                </View>
                <TextInput
                  value={progressNote}
                  onChangeText={setProgressNote}
                  placeholder="Ghi chú tiến độ..."
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  style={{ fontSize: 14, color: colors.textPrimary, minHeight: 60, borderBottomWidth: 2, borderBottomColor: colors.primary, marginBottom: 12 }}
                />
                <AssignmentActionButton
                  label="Cập nhật tiến độ" icon="refresh" variant="secondary"
                  onPress={handleUpdateProgress}
                  disabled={isActing}
                  loading={isActing}
                />
              </AccordionStepSection>

              <AccordionStepSection
                stepNumber={3}
                title="Ảnh sau khi dọn"
                completed={false}
                expanded={expandedStep === 'after'}
                onToggle={() => setExpandedStep('after')}
              >
                <EvidencePhotoPicker
                  images={afterImages}
                  minimum={2}
                  maximum={5}
                  onTakePhoto={() => void addImages('after', 'camera')}
                  onChooseLibrary={() => void addImages('after', 'library')}
                  onRemove={(i) => removeImage('after', i)}
                  processing={processingPhotos}
                />
                <View className="mt-3">
                  <AssignmentActionButton
                    label="Nộp xác thực hoàn thành" icon="checkmark-done" variant="primary"
                    onPress={handleSubmitVerification}
                    disabled={isActing || !canSubmitVerification}
                    loading={isActing}
                  />
                </View>
                {!canSubmitVerification ? (
                  <Text className="mt-2 text-xs text-textSecondary">
                    Cần tiến độ 100%, đã có ảnh before, và ít nhất 2 ảnh after để nộp xác thực.
                  </Text>
                ) : null}
              </AccordionStepSection>
            </View>
          ) : null}

          {event.status === 'PendingVerification' ? (
            <View className="mt-4 items-center rounded-2xl bg-surface px-4 py-6">
              <Ionicons name="hourglass-outline" size={40} color={colors.textSecondary} />
              <Text className="mt-2 font-semibold text-textPrimary">Đang chờ LEO duyệt xác thực</Text>
            </View>
          ) : null}

          {event.status === 'Completed' ? (
            <View className="mt-4 items-center rounded-2xl px-4 py-6" style={{ backgroundColor: '#ECFDF5' }}>
              <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
              <Text className="mt-2 font-semibold" style={{ color: colors.primary }}>Đã hoàn thành</Text>
            </View>
          ) : null}

          {event.status === 'Cancelled' ? (
            <View className="mt-4 items-center rounded-2xl bg-surface px-4 py-6">
              <Ionicons name="close-circle-outline" size={40} color={colors.textSecondary} />
              <Text className="mt-2 font-semibold text-textSecondary">Chương trình đã bị hủy</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <ParticipantsListModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        participants={participants.participants}
        isLoading={participants.isLoading}
        errorMessage={participants.errorMessage}
        onRetry={participants.load}
      />

      <Toast visible={toastState.visible} type={toastState.type} message={toastState.message} onHide={hideToast} />
    </View>
  );
}
