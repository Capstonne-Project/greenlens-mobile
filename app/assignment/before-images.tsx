import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import { getResolveErrorMessage } from '@/utils/cleanup-resolve-error';
import { compressImage, UPLOAD_COMPRESS_PRESET } from '@/utils/compress-image';
import { firstRouteParam } from '@/utils/field-worker-task';

interface LocalImageFile extends EvidencePhoto {
  mimeType: string;
  fileName: string;
}

const MIN_BEFORE_IMAGES = 1;
const MAX_BEFORE_IMAGES = 5;

export default function AssignmentBeforeImagesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    reportCode?: string | string[];
  }>();
  const reportId = firstRouteParam(params.reportId);
  const reportCode = firstRouteParam(params.reportCode);
  const { isLeader, isLoading: isAccessLoading, errorMessage: accessError } = useTeamAccess();

  const [images, setImages] = useState<LocalImageFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const appendAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      setProcessing(true);
      setApiError(null);
      try {
        const available = MAX_BEFORE_IMAGES - images.length;
        const compressed = await Promise.all(
          assets.slice(0, available).map((asset) =>
            compressImage(asset.uri, {
              ...UPLOAD_COMPRESS_PRESET,
              baseName: 'before',
              sourceWidth: asset.width,
              sourceHeight: asset.height,
            }),
          ),
        );
        setImages((current) => [...current, ...compressed].slice(0, MAX_BEFORE_IMAGES));
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
      setApiError('Cần quyền camera để chụp ảnh hiện trường.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) await appendAssets(result.assets);
  }, [appendAssets]);

  const chooseLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_BEFORE_IMAGES - images.length,
      quality: 1,
    });
    if (!result.canceled) await appendAssets(result.assets);
  }, [appendAssets, images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (
      submitting ||
      !isLeader ||
      !reportId ||
      images.length < MIN_BEFORE_IMAGES
    ) {
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      await cleanupAssignmentService.uploadBeforeImages(reportId, { images });
      const detailResponse = await cleanupAssignmentService.getMyTaskDetail(reportId);
      if (!detailResponse.data.data.hasBeforeImages) {
        throw new Error('Before images were not persisted');
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/assignment/[id]',
        params: { id: reportId },
      } as never);
    } catch (error) {
      setApiError(getResolveErrorMessage(error));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  }, [images, isLeader, reportId, submitting]);

  const canSubmit =
    isLeader &&
    images.length >= MIN_BEFORE_IMAGES &&
    !submitting &&
    !processing;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <AssignmentScreenHeader
        title="Ảnh trước khi xử lý"
        subtitle={reportCode || 'Bước bắt buộc · 1/3'}
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
            Ghi nhận hiện trạng ban đầu
          </Text>
          <Text className="mt-2 text-sm leading-5 text-textSecondary">
            Ảnh này dùng để đối chiếu với kết quả sau xử lý. Hãy chụp trước khi bắt đầu dọn.
          </Text>
        </View>

        <View className="mb-6 flex-row items-start gap-3 border-l-2 border-primary pl-3">
          <Ionicons name="scan-outline" size={19} color={colors.primary} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-textPrimary">Ảnh đạt yêu cầu</Text>
            <Text className="mt-1 text-xs leading-5 text-textSecondary">
              Có toàn cảnh, đủ sáng và không che khuất điểm ô nhiễm.
            </Text>
          </View>
        </View>

        {isAccessLoading ? (
          <View className="rounded-xl bg-surface p-4">
            <Text className="text-sm text-textSecondary">Đang kiểm tra quyền thao tác…</Text>
          </View>
        ) : !isLeader ? (
          <View className="rounded-xl border border-border bg-surface p-4">
            <Text className="font-semibold text-textPrimary">Chỉ trưởng nhóm được gửi ảnh</Text>
            <Text className="mt-1 text-sm leading-5 text-textSecondary">
              {accessError ?? 'Bạn có thể quay lại màn chi tiết để theo dõi nhiệm vụ.'}
            </Text>
          </View>
        ) : (
          <EvidencePhotoPicker
            images={images}
            minimum={MIN_BEFORE_IMAGES}
            maximum={MAX_BEFORE_IMAGES}
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
          label="Lưu ảnh và tiếp tục"
          loadingLabel="Đang tải ảnh lên"
          icon="arrow-forward"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
      </View>
    </View>
  );
}
