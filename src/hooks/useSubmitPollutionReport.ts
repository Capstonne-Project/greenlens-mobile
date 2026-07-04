import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { pollutionReportService } from '@/services/pollutionReport.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import type { SubmitPollutionReportPayload } from '@/types/pollution-report.types';
import { buildReportFileName, guessMimeTypeFromUri } from '@/utils/report-image-file';

interface UploadProgress {
  done: number;
  total: number;
}

type SubmitFailureReason = 'session-expired' | 'unknown';

interface UseSubmitPollutionReportResult {
  isUploading: boolean;
  isSubmitting: boolean;
  uploadAllImages: (onProgress?: (progress: UploadProgress) => void) => Promise<boolean>;
  submitReport: () => Promise<boolean>;
  lastFailureReason: SubmitFailureReason | null;
}

function isSessionExpiredError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export function useSubmitPollutionReport(): UseSubmitPollutionReportResult {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFailureReason, setLastFailureReason] = useState<SubmitFailureReason | null>(null);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const images = useCreateReportDraftStore((state) => state.images);
  const location = useCreateReportDraftStore((state) => state.location);
  const categoryId = useCreateReportDraftStore((state) => state.categoryId);
  const severity = useCreateReportDraftStore((state) => state.severity);
  const description = useCreateReportDraftStore((state) => state.description);
  const wasteTagIds = useCreateReportDraftStore((state) => state.wasteTagIds);
  const tempImageId = useCreateReportDraftStore((state) => state.tempImageId);
  const isAnonymous = useCreateReportDraftStore((state) => state.isAnonymous);
  const updateImage = useCreateReportDraftStore((state) => state.updateImage);
  const setSubmissionResult = useCreateReportDraftStore((state) => state.setSubmissionResult);

  const uploadAllImages = useCallback(async (onProgress?: (progress: UploadProgress) => void) => {
    if (!images.length) {
      return false;
    }

    const total = images.length;
    let done = 0;
    onProgress?.({ done, total });

    setIsUploading(true);
    setLastFailureReason(null);
    try {
      for (const image of images) {
        if (image.uploadStatus === 'done' && image.url && image.mimeType && image.sizeBytes) {
          done += 1;
          onProgress?.({ done, total });
          continue;
        }

        updateImage(image.localUri, { uploadStatus: 'uploading' });
        const mimeType = image.mimeType ?? guessMimeTypeFromUri(image.localUri);
        const fileName = buildReportFileName(image.localUri, mimeType);

        try {
          const response = await pollutionReportService.uploadImage({
            uri: image.localUri,
            mimeType,
            fileName,
          });
          const uploaded = response.data.data;
          updateImage(image.localUri, {
            uploadStatus: 'done',
            url: uploaded.url,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
          });
          done += 1;
          onProgress?.({ done, total });
        } catch (error) {
          updateImage(image.localUri, { uploadStatus: 'error' });
          if (isSessionExpiredError(error)) {
            setLastFailureReason('session-expired');
            await clearAuth();
          } else {
            setLastFailureReason('unknown');
          }
          return false;
        }
      }

      return true;
    } finally {
      setIsUploading(false);
    }
  }, [images, updateImage, clearAuth]);

  const submitReport = useCallback(async () => {
    if (!location || !categoryId || !severity) {
      return false;
    }

    const uploadedImages = useCreateReportDraftStore
      .getState()
      .images.filter(
        (image) =>
          image.uploadStatus === 'done' &&
          Boolean(image.url) &&
          Boolean(image.mimeType) &&
          typeof image.sizeBytes === 'number',
      );

    if (!uploadedImages.length) {
      return false;
    }

    const payload: SubmitPollutionReportPayload = {
      categoryId,
      severity,
      description: description.trim() || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address?.trim() || undefined,
      provinceCode: location.provinceCode,
      wardCode: location.wardCode,
      isAnonymous,
      images: uploadedImages.map((image) => ({
        url: image.url as string,
        mimeType: image.mimeType as string,
        sizeBytes: image.sizeBytes as number,
      })),
      wasteTagIds: wasteTagIds.length ? wasteTagIds : [],
      ...(tempImageId ? { tempImageId } : {}),
    };

    setIsSubmitting(true);
    setLastFailureReason(null);
    try {
      const response = await pollutionReportService.submit(payload, isAnonymous);
      const data = response.data.data;
      setSubmissionResult(data.code, data.slaVerifyDueAt);
      return true;
    } catch (error) {
      if (isSessionExpiredError(error)) {
        setLastFailureReason('session-expired');
        await clearAuth();
      } else {
        setLastFailureReason('unknown');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    location,
    categoryId,
    severity,
    description,
    isAnonymous,
    setSubmissionResult,
    tempImageId,
    wasteTagIds,
    clearAuth,
  ]);

  return {
    isUploading,
    isSubmitting,
    uploadAllImages,
    submitReport,
    lastFailureReason,
  };
}
