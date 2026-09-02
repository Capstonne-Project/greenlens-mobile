import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { pollutionReportService } from '@/services/pollutionReport.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import type { SubmitPollutionReportPayload } from '@/types/pollution-report.types';
import { compressImageForUpload } from '@/utils/compress-image';
import { buildReportFileName } from '@/utils/report-image-file';
import {
  type FieldErrors,
  normalizeApiFieldName,
  validateReportDescription,
} from '@/utils/report-validation';

interface UploadProgress {
  done: number;
  total: number;
}

type SubmitFailureReason =
  | 'session-expired'
  | 'timeout'
  | 'network'
  | 'validation'
  | 'rate-limited'
  | 'content-rejected'
  | 'unknown';

interface UseSubmitPollutionReportResult {
  isUploading: boolean;
  isSubmitting: boolean;
  uploadAllImages: (
    onProgress?: (progress: UploadProgress) => void,
  ) => Promise<{ ok: boolean; reason: SubmitFailureReason | null }>;
  submitReport: () => Promise<{
    ok: boolean;
    reason: SubmitFailureReason | null;
    /** Message từ BE — có khi reason = 'rate-limited' hoặc 'content-rejected' */
    apiErrorMessage?: string | null;
  }>;
  lastFailureReason: SubmitFailureReason | null;
  fieldErrors: FieldErrors;
  clearFieldError: (field: keyof FieldErrors) => void;
}

function isSessionExpiredError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

function classifyUploadError(error: unknown): SubmitFailureReason {
  if (isSessionExpiredError(error)) return 'session-expired';
  if (error instanceof Error) {
    if (
      error.name === 'AbortError' ||
      error.message === 'R2_PUT_TIMEOUT' ||
      error.message.includes('TIMEOUT')
    ) {
      return 'timeout';
    }
    if (
      error instanceof TypeError ||
      error.message.startsWith('R2_PUT_FAILED_') ||
      error.message.startsWith('LOCAL_FILE_READ_FAILED_')
    ) {
      return 'network';
    }
    if (
      error.message === 'IMAGE_TOO_LARGE' ||
      error.message === 'PRESIGN_RESPONSE_INVALID'
    ) {
      return 'validation';
    }
  }
  if (isAxiosError(error)) {
    const body = error.response?.data as { code?: string } | undefined;
    // BR-REP-010: 5 báo cáo/giờ, 20/24h — vượt thì bị khóa 1 giờ.
    if (error.response?.status === 429 || body?.code === 'RATE_LIMIT_EXCEEDED') {
      return 'rate-limited';
    }
    if (body?.code === 'INAPPROPRIATE_CONTENT') return 'content-rejected';
    if (error.response?.status === 422 || body?.code === 'VALIDATION_ERROR') return 'validation';
    if (error.code === 'ECONNABORTED') return 'timeout';
    if (!error.response) return 'network';
  }
  return 'unknown';
}

/** Message lỗi từ BE (rate-limit kèm số phút chờ, content-rejected nêu lý do…) — dùng nguyên văn thay vì tự chế lại. */
function extractApiErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data as Record<string, unknown> | undefined;
  const message = typeof body?.message === 'string' ? body.message : undefined;
  return message?.trim() || null;
}

function extractFieldErrors(error: unknown): FieldErrors {
  if (!isAxiosError(error)) return {};
  const body = error.response?.data as
    | { data?: { errors?: { field?: string; message?: string }[] } }
    | undefined;
  const errors = body?.data?.errors;
  if (!Array.isArray(errors)) return {};

  return errors.reduce<FieldErrors>((acc, item) => {
    if (!item.field || !item.message) return acc;
    const field = normalizeApiFieldName(item.field);
    if (!field) return acc;
    acc[field] = item.message;
    return acc;
  }, {});
}

export function useSubmitPollutionReport(): UseSubmitPollutionReportResult {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFailureReason, setLastFailureReason] = useState<SubmitFailureReason | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const images = useCreateReportDraftStore((state) => state.images);
  const location = useCreateReportDraftStore((state) => state.location);
  const categoryId = useCreateReportDraftStore((state) => state.categoryId);
  const severity = useCreateReportDraftStore((state) => state.severity);
  const description = useCreateReportDraftStore((state) => state.description);
  const wasteTagIds = useCreateReportDraftStore((state) => state.wasteTagIds);
  const tempImageId = useCreateReportDraftStore((state) => state.tempImageId);
  const updateImage = useCreateReportDraftStore((state) => state.updateImage);
  const setSubmissionResult = useCreateReportDraftStore((state) => state.setSubmissionResult);
  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const uploadAllImages = useCallback(async (onProgress?: (progress: UploadProgress) => void) => {
    if (!images.length) {
      return { ok: false as const, reason: 'unknown' as SubmitFailureReason };
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

        try {
          console.log('[SUBMIT_REPORT] BEFORE_UPLOAD', {
            index: done,
            total,
            localUri: image.localUri,
          });

          const compressStartedAt = Date.now();
          const alreadyCompressed =
            image.mimeType === 'image/jpeg' && image.fileName?.toLowerCase().endsWith('.jpg');
          console.log('[SUBMIT_REPORT] BEFORE_COMPRESS', { alreadyCompressed });
          const compressed = alreadyCompressed
            ? {
                uri: image.localUri,
                mimeType: image.mimeType as string,
                fileName: image.fileName as string,
              }
            : await compressImageForUpload(image.localUri, 'report');
          console.log('[SUBMIT_REPORT] AFTER_COMPRESS', {
            uri: compressed.uri,
            fileName: compressed.fileName,
            mimeType: compressed.mimeType,
            elapsedMs: Date.now() - compressStartedAt,
          });

          const mimeType = compressed.mimeType;
          const fileName =
            compressed.fileName || image.fileName || buildReportFileName(compressed.uri, mimeType);

          const uploaded = await pollutionReportService.uploadImage({
            uri: compressed.uri,
            mimeType,
            fileName,
          });
          console.log('[SUBMIT_REPORT] AFTER_UPLOAD', {
            url: uploaded.url,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            key: uploaded.key,
          });

          updateImage(image.localUri, {
            uploadStatus: 'done',
            url: uploaded.url,
            key: uploaded.key,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            fileName,
          });
          done += 1;
          onProgress?.({ done, total });
        } catch (error) {
          console.log('[SUBMIT_REPORT] UPLOAD_FAILED', error);
          updateImage(image.localUri, { uploadStatus: 'error' });
          const reason = classifyUploadError(error);
          setLastFailureReason(reason);
          if (reason === 'session-expired') {
            await clearAuth();
          }
          return { ok: false as const, reason };
        }
      }

      return { ok: true as const, reason: null };
    } finally {
      setIsUploading(false);
    }
  }, [images, updateImage, clearAuth]);

  const submitReport = useCallback(async () => {
    if (!location || !categoryId || !severity) {
      return { ok: false as const, reason: 'unknown' as SubmitFailureReason };
    }

    const descriptionError = validateReportDescription(description);
    if (descriptionError) {
      setFieldErrors({ description: descriptionError });
      setLastFailureReason('validation');
      return { ok: false as const, reason: 'validation' as SubmitFailureReason };
    }

    const draftState = useCreateReportDraftStore.getState();
    const uploadedImages = draftState.images.filter(
      (image) =>
        image.uploadStatus === 'done' &&
        Boolean(image.url) &&
        Boolean(image.mimeType) &&
        typeof image.sizeBytes === 'number',
    );

    if (!uploadedImages.length) {
      return { ok: false as const, reason: 'unknown' as SubmitFailureReason };
    }

    // BE verify tempImageId dựa vào images[0] — ảnh đã AI phân tích phải luôn đứng đầu,
    // bất kể thứ tự user pick nhiều ảnh từ thư viện. Xem BR-AI-001 / SubmitPollutionReportCommandHandler.
    if (draftState.tempImageId && draftState.analyzedImageLocalUri) {
      const analyzedIndex = uploadedImages.findIndex(
        (image) => image.localUri === draftState.analyzedImageLocalUri,
      );
      if (analyzedIndex > 0) {
        const [analyzed] = uploadedImages.splice(analyzedIndex, 1);
        uploadedImages.unshift(analyzed);
      }
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
      hideReporterName: false,
      images: uploadedImages.map((image) => ({
        url: image.url as string,
        key: image.key,
        mimeType: image.mimeType as string,
        sizeBytes: image.sizeBytes as number,
      })),
      wasteTagIds: wasteTagIds.length ? wasteTagIds : [],
      ...(tempImageId ? { tempImageId } : {}),
    };

    setIsSubmitting(true);
    setLastFailureReason(null);
    setFieldErrors({});
    try {
      console.log('[SUBMIT_REPORT] BEFORE_SUBMIT_API', {
        categoryId: payload.categoryId,
        severity: payload.severity,
        imageCount: payload.images.length,
        hideReporterName: payload.hideReporterName,
        descriptionLength: payload.description?.length ?? 0,
        tempImageId: payload.tempImageId,
        images: payload.images.map((img) => ({ url: img.url, key: img.key, sizeBytes: img.sizeBytes, mimeType: img.mimeType })),
      });
      const submitStartedAt = Date.now();
      const response = await pollutionReportService.submit(payload);
      console.log('[SUBMIT_REPORT] AFTER_SUBMIT_API', {
        status: response.status,
        code: response.data?.code,
        data: response.data?.data,
        elapsedMs: Date.now() - submitStartedAt,
      });

      // BE returns 201 Created. Require report code only — missing optional fields
      // must not flip a committed submit into a client-side failure.
      const data = response.data?.data;
      const reportCode = data?.code;
      if (!reportCode) {
        throw new Error('SUBMIT_RESPONSE_MISSING_CODE');
      }

      setSubmissionResult(reportCode, data.slaVerifyDueAt ?? null);
      console.log('[SUBMIT_REPORT] UI_STATE_UPDATED', {
        reportCode,
        slaVerifyDueAt: data.slaVerifyDueAt ?? null,
      });
      return { ok: true as const, reason: null };
    } catch (error) {
      console.log('[SUBMIT_REPORT] SUBMIT_FAILED', {
        error,
        isAxios: isAxiosError(error),
        status: isAxiosError(error) ? error.response?.status : undefined,
        code: isAxiosError(error) ? error.code : undefined,
        message: error instanceof Error ? error.message : String(error),
        body: isAxiosError(error) ? error.response?.data : undefined,
      });
      const reason = classifyUploadError(error);
      setLastFailureReason(reason);
      if (reason === 'validation') {
        setFieldErrors(extractFieldErrors(error));
      }
      if (reason === 'session-expired') {
        await clearAuth();
      }
      return {
        ok: false as const,
        reason,
        apiErrorMessage:
          reason === 'rate-limited' || reason === 'content-rejected'
            ? extractApiErrorMessage(error)
            : null,
      };
    } finally {
      console.log('[SUBMIT_REPORT] FINALLY', {
        isSubmitting: false,
      });
      setIsSubmitting(false);
    }
  }, [
    location,
    categoryId,
    severity,
    description,
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
    fieldErrors,
    clearFieldError,
  };
}
