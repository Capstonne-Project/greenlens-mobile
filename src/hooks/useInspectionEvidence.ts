import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import { EVIDENCE_MAX_BYTES, type EvidenceCategory } from '@/types/inspection.types';
import { compressImageForUpload } from '@/utils/compress-image';
import { getInspectionErrorMessage } from '@/utils/inspection-errors';

type PickSource = 'camera' | 'library';

interface UseInspectionEvidenceOptions {
  inspectionId: string | undefined;
  onUploaded: () => Promise<void>;
}

const MB = 1024 * 1024;

function formatLimit(bytes: number): string {
  return `${Math.round(bytes / MB)}MB`;
}

/**
 * Chọn + upload evidence cho checklist (ScenePhoto / Video / Audio / Other).
 * Ảnh được nén trước; video/audio kiểm tra dung lượng theo BR-INS-033.
 */
export function useInspectionEvidence({
  inspectionId,
  onUploaded,
}: UseInspectionEvidenceOptions) {
  const [uploadingCategory, setUploadingCategory] = useState<EvidenceCategory | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const upload = useCallback(
    async (category: EvidenceCategory, source: PickSource): Promise<boolean> => {
      if (!inspectionId || uploadingCategory) return false;
      setEvidenceError(null);

      const isVideo = category === 'Video';
      const mediaTypes: ImagePicker.MediaType[] = isVideo ? ['videos'] : ['images'];

      // Audio đi qua `uploadFile` (thu âm bằng expo-audio), không qua image picker.
      if (category === 'Audio') {
        setEvidenceError('Dùng chức năng ghi âm để thêm bằng chứng âm thanh.');
        return false;
      }

      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setEvidenceError(
            source === 'camera'
              ? 'Cần quyền truy cập camera để chụp bằng chứng.'
              : 'Cần quyền truy cập thư viện để chọn tệp.',
          );
          return false;
        }

        // ScenePhoto cần ≥2 ảnh — cho chọn nhiều để đạt yêu cầu trong một lượt.
        const allowsMultipleSelection = category === 'ScenePhoto' && source === 'library';

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes,
                quality: 1,
                allowsMultipleSelection,
              });
        if (result.canceled || result.assets.length === 0) return false;

        const limit = EVIDENCE_MAX_BYTES[category];
        const oversized = result.assets.find(
          (a) => limit && typeof a.fileSize === 'number' && a.fileSize > limit,
        );
        if (oversized && limit) {
          setEvidenceError(
            `Tệp ${formatLimit(oversized.fileSize!)} vượt giới hạn ${formatLimit(limit)}. Vui lòng chọn tệp nhỏ hơn.`,
          );
          return false;
        }

        setUploadingCategory(category);

        for (const asset of result.assets) {
          let uri = asset.uri;
          let mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
          let fileName = asset.fileName ?? `${category.toLowerCase()}.${isVideo ? 'mp4' : 'jpg'}`;

          if (!isVideo) {
            const compressed = await compressImageForUpload(asset.uri, category.toLowerCase());
            uri = compressed.uri;
            mimeType = compressed.mimeType;
            fileName = compressed.fileName;
          }

          await inspectionService.uploadEvidence(inspectionId, {
            category,
            uri,
            fileName,
            mimeType,
          });
        }

        await onUploaded();
        return true;
      } catch (error) {
        setEvidenceError(getInspectionErrorMessage(error));
        return false;
      } finally {
        setUploadingCategory(null);
      }
    },
    [inspectionId, onUploaded, uploadingCategory],
  );

  /** Upload tệp đã có sẵn (bản ghi âm từ expo-audio) — không qua picker. */
  const uploadFile = useCallback(
    async (
      category: EvidenceCategory,
      file: { uri: string; fileName: string; mimeType: string },
    ): Promise<boolean> => {
      if (!inspectionId || uploadingCategory) return false;
      setEvidenceError(null);
      setUploadingCategory(category);
      try {
        await inspectionService.uploadEvidence(inspectionId, { category, ...file });
        await onUploaded();
        return true;
      } catch (error) {
        setEvidenceError(getInspectionErrorMessage(error));
        return false;
      } finally {
        setUploadingCategory(null);
      }
    },
    [inspectionId, onUploaded, uploadingCategory],
  );

  return {
    upload,
    uploadFile,
    uploadingCategory,
    isUploading: uploadingCategory !== null,
    evidenceError,
    clearEvidenceError: useCallback(() => setEvidenceError(null), []),
  };
}
