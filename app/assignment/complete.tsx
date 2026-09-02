import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { AssignmentScreenHeader } from '@/components/assignment/AssignmentScreenHeader';
import {
  EvidencePhotoPicker,
  type EvidencePhoto,
} from '@/components/assignment/EvidencePhotoPicker';
import { Text } from '@/components/ui/text';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import { getResolveErrorCode, getResolveErrorMessage } from '@/utils/cleanup-resolve-error';
import { compressImage, UPLOAD_COMPRESS_PRESET } from '@/utils/compress-image';
import {
  ensureMediaLocationPermission,
  parseLocationFromPickerAsset,
  readGpsFromFileExif,
} from '@/utils/exif-location';
import { firstRouteParam } from '@/utils/field-worker-task';

interface LocalImageFile extends EvidencePhoto {
  mimeType: string;
  fileName: string;
  hasExifLocation: boolean;
}

const MIN_AFTER_IMAGES = 2;
const MAX_AFTER_IMAGES = 5;

type SubmitStep = 'idle' | 'uploading' | 'resolving';

export default function AssignmentCompleteScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    reportCode?: string | string[];
  }>();
  const reportId = firstRouteParam(params.reportId);
  const reportCode = firstRouteParam(params.reportCode);
  const { isLeader, isLoading: isAccessLoading, errorMessage: accessError } = useTeamAccess();

  const [images, setImages] = useState<LocalImageFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [submitStep, setSubmitStep] = useState<SubmitStep>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  const appendAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      setProcessing(true);
      setApiError(null);
      try {
        const available = MAX_AFTER_IMAGES - images.length;
        const picked = assets.slice(0, available);
        const compressed = await Promise.all(
          picked.map(async (asset) => {
            // Đọc GPS từ EXIF trước khi compress — nén JPEG sẽ strip metadata.
            let exifCoords = parseLocationFromPickerAsset(asset);
            if (!exifCoords) {
              exifCoords = await readGpsFromFileExif(asset.uri);
            }
            const result = await compressImage(asset.uri, {
              ...UPLOAD_COMPRESS_PRESET,
              baseName: 'after',
              sourceWidth: asset.width,
              sourceHeight: asset.height,
            });
            return { ...result, hasExifLocation: exifCoords !== null };
          }),
        );
        setImages((current) => [...current, ...compressed].slice(0, MAX_AFTER_IMAGES));
        if (compressed.some((img) => !img.hasExifLocation)) {
          Alert.alert(
            'Ảnh không có vị trí',
            'Một số ảnh không có GPS trong EXIF. Hãy chắc chắn ảnh được chụp trực tiếp tại hiện trường.',
          );
        }
      } catch {
        setApiError('Không thể xử lý ảnh. Vui lòng thử ảnh khác.');
      } finally {
        setProcessing(false);
      }
    },
    [images.length],
  );

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setApiError('Cần quyền camera để chụp ảnh sau xử lý.');
      return;
    }
    // Camera hệ thống chỉ ghi GPS vào EXIF nếu app đã có quyền vị trí — xin trước khi mở camera.
    await Location.requestForegroundPermissionsAsync();
    // Android 10+ strip GPS khỏi EXIF khi thiếu quyền ACCESS_MEDIA_LOCATION.
    await ensureMediaLocationPermission();
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: true,
    });
    if (!result.canceled) await appendAssets(result.assets);
  }, [appendAssets]);

  const chooseLibrary = useCallback(async () => {
    // Android 10+ strip GPS khỏi EXIF khi thiếu quyền ACCESS_MEDIA_LOCATION.
    await ensureMediaLocationPermission();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_AFTER_IMAGES - images.length,
      quality: 1,
      exif: true,
      // Android Photo Picker (mặc định) không bao giờ trả EXIF/GPS dù exif:true.
      // Ép dùng picker cũ để đọc được GPS EXIF khi chọn ảnh từ thư viện.
      legacy: true,
    });
    if (!result.canceled) await appendAssets(result.assets);
  }, [appendAssets, images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (
      submitStep !== 'idle' ||
      !isLeader ||
      !reportId ||
      images.length < MIN_AFTER_IMAGES
    ) {
      return;
    }

    setApiError(null);
    setSubmitStep('uploading');
    try {
      const detailResponse = await cleanupAssignmentService.getMyTaskDetail(reportId);
      const detail = detailResponse.data.data;

      // Bắt buộc có ít nhất 1 lần cập nhật tiến độ trước khi hoàn thành.
      if (detail.progressUpdatedAt == null && detail.progressPercent <= 0) {
        setSubmitStep('idle');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Chưa cập nhật tiến độ',
          'Hãy cập nhật tiến độ xử lý ít nhất một lần trước khi hoàn thành nhiệm vụ.',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Cập nhật tiến độ',
              onPress: () =>
                router.replace({
                  pathname: '/assignment/progress',
                  params: {
                    reportId,
                    currentPercent: String(detail.progressPercent),
                    lastUpdatedHoursAgo: '',
                    historyJson: '[]',
                    siteLatitude: String(detail.latitude),
                    siteLongitude: String(detail.longitude),
                  },
                } as never),
            },
          ],
        );
        return;
      }

      if (!detail.canResolve) {
        const destination = detail.hasBeforeImages
          ? '/assignment/[id]'
          : '/assignment/before-images';
        router.replace({
          pathname: destination,
          params:
            destination === '/assignment/[id]'
              ? { id: reportId }
              : { reportId, reportCode },
        } as never);
        return;
      }

      const afterImageUrls =
        await cleanupAssignmentService.uploadAfterImagesForResolve(images);
      if (afterImageUrls.length < MIN_AFTER_IMAGES) {
        throw new Error('INSUFFICIENT_AFTER_IMAGES');
      }

      setSubmitStep('resolving');
      await cleanupAssignmentService.resolve(reportId, { afterImageUrls });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/assignment/completed',
        params: { reportId, reportCode },
      } as never);
    } catch (error) {
      const code = getResolveErrorCode(error);
      setApiError(getResolveErrorMessage(error));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (code === 'MISSING_BEFORE_IMAGES') {
        Alert.alert(
          'Thiếu ảnh trước xử lý',
          'Task chưa có ảnh hiện trạng ban đầu. Hãy bổ sung trước khi hoàn thành.',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Bổ sung ảnh',
              onPress: () =>
                router.replace({
                  pathname: '/assignment/before-images',
                  params: { reportId, reportCode },
                } as never),
            },
          ],
        );
      }
    } finally {
      setSubmitStep('idle');
    }
  }, [images, isLeader, reportCode, reportId, submitStep]);

  const submitting = submitStep !== 'idle';
  const canSubmit =
    isLeader &&
    images.length >= MIN_AFTER_IMAGES &&
    !processing &&
    !submitting;
  const loadingLabel =
    submitStep === 'uploading' ? 'Đang tải ảnh lên' : 'Đang xác nhận';

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <AssignmentScreenHeader
        title="Hoàn thành nhiệm vụ"
        subtitle={reportCode || 'Bước cuối · 3/3'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: insets.bottom + 116,
        }}
      >
        <View className="mb-7">
          <Text className="text-2xl font-bold leading-8 text-textPrimary">
            Ghi nhận kết quả sau xử lý
          </Text>
          <Text className="mt-2 text-sm leading-5 text-textSecondary">
            Chụp cùng góc với ảnh ban đầu nếu có thể. Hệ thống cần ít nhất 2 ảnh để xác nhận.
          </Text>
        </View>

        <View className="mb-6 flex-row items-start gap-3 border-l-2 border-primary pl-3">
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.primary} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-textPrimary">Trước khi xác nhận</Text>
            <Text className="mt-1 text-xs leading-5 text-textSecondary">
              Kiểm tra khu vực đã an toàn, sạch và ảnh thể hiện rõ toàn bộ kết quả.
            </Text>
          </View>
        </View>

        {isAccessLoading ? (
          <View className="rounded-xl bg-surface p-4">
            <Text className="text-sm text-textSecondary">Đang kiểm tra quyền thao tác…</Text>
          </View>
        ) : !isLeader ? (
          <View className="rounded-xl border border-border bg-surface p-4">
            <Text className="font-semibold text-textPrimary">Chỉ trưởng nhóm được hoàn thành task</Text>
            <Text className="mt-1 text-sm leading-5 text-textSecondary">
              {accessError ?? 'Bạn có thể quay lại màn chi tiết để theo dõi nhiệm vụ.'}
            </Text>
          </View>
        ) : (
          <EvidencePhotoPicker
            images={images}
            minimum={MIN_AFTER_IMAGES}
            maximum={MAX_AFTER_IMAGES}
            onTakePhoto={takePhoto}
            onChooseLibrary={chooseLibrary}
            onRemove={removeImage}
            processing={processing}
          />
        )}

        {apiError ? (
          <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-red-50 p-3">
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text className="flex-1 text-sm leading-5" style={{ color: colors.error }}>
              {apiError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <AssignmentActionButton
          label="Xác nhận hoàn thành"
          loadingLabel={loadingLabel}
          icon="checkmark"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
      </View>
    </View>
  );
}
