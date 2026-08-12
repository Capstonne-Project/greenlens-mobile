import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MAX_ITEMS_PER_REQUEST,
  type EvidenceCategory,
  type EvidenceLocalFile,
} from '@/types/inspection.types';
import { compressImageForUpload } from '@/utils/compress-image';
import { compressVideoForUpload } from '@/utils/compress-video';
import { getInspectionErrorMessage } from '@/utils/inspection-errors';

type PickSource = 'camera' | 'library';

interface UseInspectionEvidenceOptions {
  inspectionId: string | undefined;
  onUploaded: () => Promise<unknown>;
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
  /** % nén video (0–100); null khi không nén — UI dùng để hiện tiến độ. */
  const [compressProgress, setCompressProgress] = useState<number | null>(null);

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

        // Video sẽ được nén ở bước dưới nên chỉ chặn sau khi nén; ảnh/tệp khác chặn ngay.
        if (!isVideo) {
          const oversized = result.assets.find(
            (a) => typeof a.fileSize === 'number' && a.fileSize > limit,
          );
          if (oversized) {
            setEvidenceError(
              `Tệp ${formatLimit(oversized.fileSize!)} vượt giới hạn ${formatLimit(limit)}. Vui lòng chọn tệp nhỏ hơn.`,
            );
            return false;
          }
        }

        if (result.assets.length > EVIDENCE_MAX_ITEMS_PER_REQUEST) {
          setEvidenceError(
            `Chỉ được tải tối đa ${EVIDENCE_MAX_ITEMS_PER_REQUEST} tệp mỗi lượt. Vui lòng chọn lại.`,
          );
          return false;
        }

        setUploadingCategory(category);

        const files: EvidenceLocalFile[] = [];
        for (const asset of result.assets) {
          if (isVideo) {
            setCompressProgress(0);
            const video = await compressVideoForUpload(asset.uri, {
              baseName: category.toLowerCase(),
              onProgress: setCompressProgress,
            });
            setCompressProgress(null);

            // Nén xong mới biết dung lượng thật — chặn ở đây thay vì trước khi nén.
            const finalSize = video.sizeBytes ?? asset.fileSize;
            if (typeof finalSize === 'number' && finalSize > limit) {
              setEvidenceError(
                video.compressed
                  ? `Video sau khi nén vẫn ${formatLimit(finalSize)}, vượt giới hạn ${formatLimit(limit)}. Vui lòng quay clip ngắn hơn.`
                  : `Video ${formatLimit(finalSize)} vượt giới hạn ${formatLimit(limit)}. Cần bản build dev-client để tự động nén, hoặc chọn clip ngắn hơn.`,
              );
              return false;
            }

            files.push({
              uri: video.uri,
              mimeType: video.mimeType,
              fileName: video.fileName,
              // expo-image-picker trả ms; BE yêu cầu số nguyên giây > 0.
              ...(video.durationSeconds
                ? { durationSeconds: video.durationSeconds }
                : asset.duration
                  ? { durationSeconds: Math.max(1, Math.round(asset.duration / 1000)) }
                  : {}),
            });
            continue;
          }

          const compressed = await compressImageForUpload(asset.uri, category.toLowerCase());
          files.push({
            uri: compressed.uri,
            mimeType: compressed.mimeType,
            fileName: compressed.fileName,
          });
        }

        // Một request cho cả lượt chọn — BE đếm lại tổng theo category để mở gate ScenePhoto ≥ 2.
        await inspectionService.uploadEvidence(inspectionId, { category, files });

        await onUploaded();
        return true;
      } catch (error) {
        setEvidenceError(getInspectionErrorMessage(error));
        return false;
      } finally {
        setUploadingCategory(null);
        setCompressProgress(null);
      }
    },
    [inspectionId, onUploaded, uploadingCategory],
  );

  /** Upload tệp đã có sẵn (bản ghi âm từ expo-audio) — không qua picker. */
  const uploadFile = useCallback(
    async (
      category: EvidenceCategory,
      file: EvidenceLocalFile,
    ): Promise<boolean> => {
      if (!inspectionId || uploadingCategory) return false;
      setEvidenceError(null);
      setUploadingCategory(category);
      try {
        await inspectionService.uploadEvidence(inspectionId, { category, files: [file] });
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
    /** 0–100 khi đang nén video, null khi không — hiện tiến độ thay vì spinner câm. */
    compressProgress,
    evidenceError,
    clearEvidenceError: useCallback(() => setEvidenceError(null), []),
  };
}
