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

/** Mobile → R2 direct only. No BE multipart proxy. */
const R2_PUT_TIMEOUT_MS = 90_000;
const R2_PUT_MAX_ATTEMPTS = 2;
const ANALYZE_TIMEOUT_MS = 60_000;

type R2PutBody = ArrayBuffer | Blob;

/**
 * RN Hermes often lacks Blob.arrayBuffer(). Prefer Response.arrayBuffer,
 * then FileReader, else keep Blob for fetch PUT.
 */
async function readLocalFile(uri: string): Promise<{ body: R2PutBody; sizeBytes: number }> {
  const localResponse = await fetch(uri);
  if (!localResponse.ok) {
    throw new Error(`LOCAL_FILE_READ_FAILED_${localResponse.status}`);
  }

  if (typeof localResponse.arrayBuffer === 'function') {
    try {
      const bytes = await localResponse.arrayBuffer();
      return { body: bytes, sizeBytes: bytes.byteLength };
    } catch {
      // fall through to blob path
    }
  }

  const blob = await localResponse.blob();
  const sizeBytes = blob.size;

  if (typeof blob.arrayBuffer === 'function') {
    try {
      const bytes = await blob.arrayBuffer();
      return { body: bytes, sizeBytes: bytes.byteLength };
    } catch {
      // fall through
    }
  }

  if (typeof FileReader !== 'undefined') {
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('LOCAL_FILE_READ_FAILED_FILEREADER'));
      };
      reader.onerror = () => reject(new Error('LOCAL_FILE_READ_FAILED_FILEREADER'));
      reader.readAsArrayBuffer(blob);
    });
    return { body: bytes, sizeBytes: bytes.byteLength };
  }

  // Last resort: PUT Blob as-is (works on many RN builds).
  return { body: blob, sizeBytes };
}

async function putToR2(
  uploadUrl: string,
  body: R2PutBody,
  contentType: string,
  requiredHeaders: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), R2_PUT_TIMEOUT_MS);
  try {
    return await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        ...requiredHeaders,
        'Content-Type': contentType,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableR2Failure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  if (error.message === 'Aborted' || error.message === 'R2_PUT_TIMEOUT') return true;
  if (error instanceof TypeError) return true;
  return error.message.startsWith('R2_PUT_FAILED_5');
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

  const { body, sizeBytes } = await readLocalFile(uri);
  const normalizedMime = mimeType || 'image/jpeg';
  const normalizedName = fileName || `report_${Date.now()}.jpg`;

  console.log('[R2_UPLOAD] LOCAL_READY', {
    sizeBytes,
    bodyType: body instanceof ArrayBuffer ? 'ArrayBuffer' : 'Blob',
    elapsedMs: Date.now() - startedAt,
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= R2_PUT_MAX_ATTEMPTS; attempt++) {
    try {
      const presignResponse = await api.post<ApiEnvelope<PresignMediaUploadResult>>(
        '/media/presign',
        {
          fileName: normalizedName,
          contentType: normalizedMime,
          purpose,
          reportId,
          fileSizeBytes: sizeBytes,
        },
      );
      const presign = presignResponse.data.data;
      if (!presign?.uploadUrl || !presign.publicUrl || !presign.key) {
        throw new Error('PRESIGN_RESPONSE_INVALID');
      }
      if (sizeBytes > presign.maxSizeBytes) {
        throw new Error('IMAGE_TOO_LARGE');
      }

      console.log('[R2_UPLOAD] PRESIGNED', {
        purpose,
        attempt,
        host: (() => {
          try {
            return new URL(presign.uploadUrl).host;
          } catch {
            return 'invalid';
          }
        })(),
        sizeBytes,
        elapsedMs: Date.now() - startedAt,
      });

      let putResponse: Response;
      try {
        putResponse = await putToR2(
          presign.uploadUrl,
          body,
          presign.contentType,
          presign.requiredHeaders ?? {},
        );
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('R2_PUT_TIMEOUT');
        }
        throw error;
      }

      if (!putResponse.ok) {
        throw new Error(`R2_PUT_FAILED_${putResponse.status}`);
      }

      console.log('[R2_UPLOAD] SUCCESS', {
        purpose,
        attempt,
        key: presign.key,
        sizeBytes,
        elapsedMs: Date.now() - startedAt,
      });

      return {
        url: presign.publicUrl,
        key: presign.key,
        message: 'Uploaded directly to R2',
        mimeType: presign.contentType,
        sizeBytes,
      };
    } catch (error: unknown) {
      lastError = error;
      const canRetry =
        attempt < R2_PUT_MAX_ATTEMPTS &&
        error instanceof Error &&
        error.message !== 'IMAGE_TOO_LARGE' &&
        error.message !== 'PRESIGN_RESPONSE_INVALID' &&
        isRetryableR2Failure(error);

      console.log('[R2_UPLOAD] ERROR', {
        attempt,
        willRetry: canRetry,
        name: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - startedAt,
      });

      if (!canRetry) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('R2_UPLOAD_FAILED');
}

/**
 * Mobile → R2 (presign + PUT). Returns url/key for analyze-uploaded / submit.
 * Does not upload through BE multipart proxy.
 */
export async function uploadReportImage(
  input: UploadReportImageInput,
): Promise<UploadReportImageResult> {
  const startedAt = Date.now();
  try {
    return await uploadViaPresign(input);
  } catch (error: unknown) {
    console.log('[R2_UPLOAD] FAILED', {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
    });
    throw error;
  } finally {
    console.log('[UPLOAD] FINALLY', { elapsedMs: Date.now() - startedAt });
  }
}

export const pollutionReportService = {
  uploadImage: (input: UploadReportImageInput) => uploadReportImage(input),

  analyzeUploadedImage: (uploaded: UploadReportImageResult) =>
    api.post<ApiEnvelope<AiAnalyzeResponse>>(
      '/reports/analyze-uploaded',
      {
        publicUrl: uploaded.url,
        key: uploaded.key,
        fileName: uploaded.key.split('/').pop() ?? 'report.jpg',
        contentType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
      },
      // BE: download R2 + AI classify (Ai:TimeoutSeconds≈30) — default axios 15s quá ngắn.
      { timeout: ANALYZE_TIMEOUT_MS },
    ),

  /** Legacy multipart analyze — only if caller still has local bytes and no R2 object. */
  analyzeImage: ({ uri, mimeType, fileName }: UploadReportImageInput) => {
    const formData = new FormData();
    formData.append('image', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return api.post<ApiEnvelope<AiAnalyzeResponse>>('/reports/analyze', formData, {
      timeout: ANALYZE_TIMEOUT_MS,
    });
  },

  submit: (payload: SubmitPollutionReportPayload) =>
    api.post<ApiEnvelope<SubmitPollutionReportResult>>('/reports', payload, {
      timeout: 45_000,
    }),
};
