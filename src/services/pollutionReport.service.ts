import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  AiAnalyzeResponse,
  MediaUploadPurpose,
  PresignMediaUploadResult,
  SubmitPollutionReportPayload,
  SubmitPollutionReportResult,
  UploadReportImageResult,
} from '@/types/pollution-report.types';

interface UploadReportImageInput {
  uri: string;
  mimeType: string;
  fileName: string;
  purpose?: MediaUploadPurpose;
  reportId?: string;
}

/** Fail fast on phone→R2 hangs, then fall back to BE→R2 proxy. */
const R2_PUT_TIMEOUT_MS = 12_000;
const BE_PROXY_TIMEOUT_MS = 60_000;

function isR2DirectFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return (
    error.message === 'Aborted' ||
    error.message.startsWith('R2_PUT_FAILED_') ||
    error.message.startsWith('LOCAL_FILE_READ_FAILED_') ||
    error.message === 'PRESIGN_RESPONSE_INVALID' ||
    error instanceof TypeError
  );
}

async function uploadViaBeProxy({
  uri,
  mimeType,
  fileName,
}: UploadReportImageInput): Promise<UploadReportImageResult> {
  const startedAt = Date.now();
  console.log('[BE_PROXY_UPLOAD] START', { name: fileName, type: mimeType });

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName || `report_${Date.now()}.jpg`,
    type: mimeType || 'image/jpeg',
  } as unknown as Blob);

  const response = await api.post<ApiEnvelope<UploadReportImageResult>>(
    '/media/reports/images',
    formData,
    { timeout: BE_PROXY_TIMEOUT_MS },
  );

  const data = response.data?.data;
  if (!data?.url || !data.key) {
    throw new Error('BE_PROXY_RESPONSE_INVALID');
  }

  console.log('[BE_PROXY_UPLOAD] SUCCESS', {
    key: data.key,
    sizeBytes: data.sizeBytes,
    elapsedMs: Date.now() - startedAt,
  });

  return data;
}

async function uploadViaPresign({
  uri,
  mimeType,
  fileName,
  purpose = 'ReportImage',
  reportId,
}: UploadReportImageInput): Promise<UploadReportImageResult> {
  const startedAt = Date.now();
  console.log('[R2_UPLOAD] START', { name: fileName, type: mimeType, purpose });

  const localResponse = await fetch(uri);
  if (!localResponse.ok) {
    throw new Error(`LOCAL_FILE_READ_FAILED_${localResponse.status}`);
  }
  const blob = await localResponse.blob();
  const normalizedMime = mimeType || 'image/jpeg';
  const normalizedName = fileName || `report_${Date.now()}.jpg`;

  const presignResponse = await api.post<ApiEnvelope<PresignMediaUploadResult>>(
    '/media/presign',
    {
      fileName: normalizedName,
      contentType: normalizedMime,
      purpose,
      reportId,
      fileSizeBytes: blob.size,
    },
  );
  const presign = presignResponse.data.data;
  if (!presign?.uploadUrl || !presign.publicUrl || !presign.key) {
    throw new Error('PRESIGN_RESPONSE_INVALID');
  }
  if (blob.size > presign.maxSizeBytes) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  console.log('[R2_UPLOAD] PRESIGNED', {
    purpose,
    host: (() => {
      try {
        return new URL(presign.uploadUrl).host;
      } catch {
        return 'invalid';
      }
    })(),
    sizeBytes: blob.size,
    elapsedMs: Date.now() - startedAt,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), R2_PUT_TIMEOUT_MS);
  let putResponse: Response;
  try {
    putResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        ...presign.requiredHeaders,
        'Content-Type': presign.contentType,
      },
      body: blob,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!putResponse.ok) {
    throw new Error(`R2_PUT_FAILED_${putResponse.status}`);
  }

  console.log('[R2_UPLOAD] SUCCESS', {
    purpose,
    sizeBytes: blob.size,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    url: presign.publicUrl,
    key: presign.key,
    message: 'Uploaded directly to R2',
    mimeType: presign.contentType,
    sizeBytes: blob.size,
  };
}

/**
 * Preferred: Mobile → R2 (presign + PUT).
 * Fallback: Mobile → BE → R2 when the phone cannot reach Cloudflare.
 */
export async function uploadReportImage(
  input: UploadReportImageInput,
): Promise<UploadReportImageResult> {
  const startedAt = Date.now();
  try {
    return await uploadViaPresign(input);
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      message?: string;
      code?: string;
      response?: { status?: number; data?: unknown };
    };
    console.log('[R2_UPLOAD] ERROR', {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      elapsedMs: Date.now() - startedAt,
    });

    if (error instanceof Error && error.message === 'IMAGE_TOO_LARGE') {
      throw error;
    }

    if (!isR2DirectFailure(error) && !(error instanceof Error && error.name === 'AbortError')) {
      // Auth / validation from presign API — do not mask with BE proxy.
      if (
        typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
        [400, 401, 403, 422].includes((error as { response: { status: number } }).response.status)
      ) {
        throw error;
      }
    }

    console.log('[UPLOAD] FALLBACK_BE_PROXY', {
      reason: err?.message ?? 'unknown',
      elapsedMs: Date.now() - startedAt,
    });
    return uploadViaBeProxy(input);
  } finally {
    console.log('[UPLOAD] FINALLY', { elapsedMs: Date.now() - startedAt });
  }
}

export const pollutionReportService = {
  uploadImage: (input: UploadReportImageInput) => uploadReportImage(input),

  analyzeUploadedImage: (uploaded: UploadReportImageResult) =>
    api.post<ApiEnvelope<AiAnalyzeResponse>>('/reports/analyze-uploaded', {
      publicUrl: uploaded.url,
      key: uploaded.key,
      fileName: uploaded.key.split('/').pop() ?? 'report.jpg',
      contentType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
    }),

  /** Legacy multipart analyze — only used if caller still has local bytes and no R2 object. */
  analyzeImage: ({ uri, mimeType, fileName }: UploadReportImageInput) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return api.post<ApiEnvelope<AiAnalyzeResponse>>('/reports/analyze', formData, {
      timeout: BE_PROXY_TIMEOUT_MS,
    });
  },

  submit: (payload: SubmitPollutionReportPayload) =>
    api.post<ApiEnvelope<SubmitPollutionReportResult>>('/reports', payload, {
      timeout: 45_000,
    }),
};
