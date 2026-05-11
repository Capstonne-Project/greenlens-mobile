import { useCallback, useState } from 'react';
import { pollutionReportService } from '@/services/pollutionReport.service';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import type { SubmitPollutionReportPayload } from '@/types/pollution-report.types';
import { buildReportFileName, guessMimeTypeFromUri } from '@/utils/report-image-file';

interface UseSubmitPollutionReportResult {
  isUploading: boolean;
  isSubmitting: boolean;
  uploadAllImages: () => Promise<boolean>;
  submitReport: () => Promise<boolean>;
}

export function useSubmitPollutionReport(): UseSubmitPollutionReportResult {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const images = useCreateReportDraftStore((state) => state.images);
  const location = useCreateReportDraftStore((state) => state.location);
  const categoryId = useCreateReportDraftStore((state) => state.categoryId);
  const severity = useCreateReportDraftStore((state) => state.severity);
  const description = useCreateReportDraftStore((state) => state.description);
  const isAnonymous = useCreateReportDraftStore((state) => state.isAnonymous);
  const updateImage = useCreateReportDraftStore((state) => state.updateImage);
  const setSubmissionResult = useCreateReportDraftStore((state) => state.setSubmissionResult);

  const uploadAllImages = useCallback(async () => {
    if (!images.length) {
      return false;
    }

    setIsUploading(true);
    try {
      for (const image of images) {
        if (image.uploadStatus === 'done' && image.url && image.mimeType && image.sizeBytes) {
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
        } catch {
          updateImage(image.localUri, { uploadStatus: 'error' });
          return false;
        }
      }

      return true;
    } finally {
      setIsUploading(false);
    }
  }, [images, updateImage]);

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
    };

    setIsSubmitting(true);
    try {
      const response = await pollutionReportService.submit(payload, isAnonymous);
      const data = response.data.data;
      setSubmissionResult(data.code, data.slaVerifyDueAt);
      return true;
    } catch {
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
  ]);

  return {
    isUploading,
    isSubmitting,
    uploadAllImages,
    submitReport,
  };
}
