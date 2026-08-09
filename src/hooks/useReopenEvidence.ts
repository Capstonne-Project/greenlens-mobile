import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { pollutionReportService } from '@/services/pollutionReport.service';
import { REOPEN_EVIDENCE_MAX_IMAGES } from '@/types/report-detail.types';
import { compressImageForUpload } from '@/utils/compress-image';

type PickSource = 'camera' | 'library';

/** Ảnh minh chứng đã upload lên R2 — `url` là publicUrl gửi kèm yêu cầu mở lại. */
export interface ReopenEvidenceImage {
  /** Local uri để preview ngay trong lúc/ sau khi upload */
  previewUri: string;
  url: string;
}

interface UseReopenEvidenceResult {
  images: ReopenEvidenceImage[];
  isUploading: boolean;
  evidenceError: string | null;
  pickImages: (source: PickSource) => Promise<void>;
  removeImage: (url: string) => void;
  reset: () => void;
}

/**
 * BR-REP-015: ảnh minh chứng cho yêu cầu mở lại phải nằm trên storage của hệ thống
 * (BE validate `IsOwnedPublicUrl`) — nên phải presign + PUT lên R2 trước khi submit.
 */
export function useReopenEvidence(reportId: string | undefined): UseReopenEvidenceResult {
  const [images, setImages] = useState<ReopenEvidenceImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const pickImages = useCallback(
    async (source: PickSource) => {
      if (!reportId || isUploading) return;
      setEvidenceError(null);

      const remaining = REOPEN_EVIDENCE_MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setEvidenceError(`Tối đa ${REOPEN_EVIDENCE_MAX_IMAGES} ảnh minh chứng.`);
        return;
      }

      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setEvidenceError(
            source === 'camera'
              ? 'Cần quyền truy cập camera để chụp ảnh minh chứng.'
              : 'Cần quyền truy cập thư viện để chọn ảnh.',
          );
          return;
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
              });
        if (result.canceled || result.assets.length === 0) return;

        const picked = result.assets.slice(0, remaining);
        setIsUploading(true);

        const uploaded: ReopenEvidenceImage[] = [];
        for (const asset of picked) {
          const compressed = await compressImageForUpload(asset.uri, 'reopen_evidence');
          const media = await pollutionReportService.uploadImage({
            uri: compressed.uri,
            mimeType: compressed.mimeType,
            fileName: compressed.fileName,
            purpose: 'ReopenEvidence',
            reportId,
          });
          uploaded.push({ previewUri: compressed.uri, url: media.url });
        }

        setImages((prev) => [...prev, ...uploaded].slice(0, REOPEN_EVIDENCE_MAX_IMAGES));

        if (picked.length < result.assets.length) {
          setEvidenceError(`Chỉ thêm được ${REOPEN_EVIDENCE_MAX_IMAGES} ảnh minh chứng.`);
        }
      } catch {
        setEvidenceError('Tải ảnh lên thất bại. Vui lòng thử lại.');
      } finally {
        setIsUploading(false);
      }
    },
    [images.length, isUploading, reportId],
  );

  const removeImage = useCallback((url: string) => {
    setImages((prev) => prev.filter((image) => image.url !== url));
  }, []);

  const reset = useCallback(() => {
    setImages([]);
    setEvidenceError(null);
    setIsUploading(false);
  }, []);

  return { images, isUploading, evidenceError, pickImages, removeImage, reset };
}
