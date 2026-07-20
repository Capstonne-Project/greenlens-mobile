import { useState } from 'react';
import { pollutionReportService } from '@/services/pollutionReport.service';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import type { UploadReportImageResult } from '@/types/pollution-report.types';

const SEVERITY_MAP = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

const CONFIDENCE_THRESHOLD = 0.7;

async function ensureUploaded(
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<UploadReportImageResult> {
  const existing = useCreateReportDraftStore
    .getState()
    .images.find(
      (image) =>
        image.localUri === uri &&
        image.uploadStatus === 'done' &&
        image.url &&
        image.key &&
        image.mimeType &&
        typeof image.sizeBytes === 'number',
    );

  if (existing?.url && existing.key && existing.mimeType && existing.sizeBytes != null) {
    return {
      url: existing.url,
      key: existing.key,
      message: 'Already uploaded',
      mimeType: existing.mimeType,
      sizeBytes: existing.sizeBytes,
    };
  }

  useCreateReportDraftStore.getState().updateImage(uri, { uploadStatus: 'uploading' });

  try {
    const uploaded = await pollutionReportService.uploadImage({
      uri,
      mimeType,
      fileName,
    });

    useCreateReportDraftStore.getState().updateImage(uri, {
      uploadStatus: 'done',
      url: uploaded.url,
      key: uploaded.key,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      fileName,
    });

    return uploaded;
  } catch (error) {
    useCreateReportDraftStore.getState().updateImage(uri, { uploadStatus: 'error' });
    throw error;
  }
}

export function useAnalyzeReportImage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const setAiResult = useCreateReportDraftStore((s) => s.setAiResult);
  const clearAiResult = useCreateReportDraftStore((s) => s.clearAiResult);
  const setCategoryId = useCreateReportDraftStore((s) => s.setCategoryId);
  const setSeverity = useCreateReportDraftStore((s) => s.setSeverity);

  /** Upload only (no AI). Safe to call in parallel for gallery multi-select. */
  const uploadDraftImage = async (
    uri: string,
    mimeType = 'image/jpeg',
    fileName = `report_${Date.now()}.jpg`,
  ): Promise<boolean> => {
    try {
      await ensureUploaded(uri, mimeType, fileName);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Upload at step 1 (reuse if already done), then optionally run AI classify.
   * - `uploaded`: bytes on R2, no AI (or AI cancelled after upload)
   * - `accepted` / `review` / `rejected`: AI ran
   */
  const prepareImage = async (
    uri: string,
    mimeType = 'image/jpeg',
    fileName = `analyze_${Date.now()}.jpg`,
    options?: { runAi?: boolean },
  ): Promise<'uploaded' | 'accepted' | 'review' | 'rejected' | 'error' | 'cancelled'> => {
    const runAi = options?.runAi ?? useCreateReportDraftStore.getState().useAi;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    if (runAi) clearAiResult();

    try {
      const uploaded = await ensureUploaded(uri, mimeType, fileName);

      if (!runAi) {
        return 'uploaded';
      }

      if (!useCreateReportDraftStore.getState().useAi) {
        return 'cancelled';
      }

      const res = await pollutionReportService.analyzeUploadedImage(uploaded);
      const data = res.data.data;

      if (!useCreateReportDraftStore.getState().useAi) return 'cancelled';

      setAiResult(data.tempImageId, data.aiResult, data.suggestedCategory);

      const decision = data.aiResult.decision;
      if (decision === 'IRRELEVANT_OR_SUSPECTED_ABUSIVE') return 'rejected';

      const confidence = data.aiResult.classify.confidence;
      if (confidence >= CONFIDENCE_THRESHOLD) {
        const mappedSeverity = SEVERITY_MAP[data.aiResult.classify.severity];
        if (mappedSeverity) setSeverity(mappedSeverity);
        if (data.suggestedCategory) setCategoryId(data.suggestedCategory.id);
      }

      return decision === 'NEED_MANUAL_REVIEW' ? 'review' : 'accepted';
    } catch {
      setAnalyzeError(
        runAi
          ? 'Không thể tải/phân tích ảnh. Vui lòng thử lại hoặc tắt AI.'
          : 'Không thể tải ảnh lên. Vui lòng thử lại.',
      );
      return 'error';
    } finally {
      setIsAnalyzing(false);
    }
  };

  /** Convenience: upload + AI classify. */
  const analyze = (
    uri: string,
    mimeType = 'image/jpeg',
    fileName = `analyze_${Date.now()}.jpg`,
  ) => prepareImage(uri, mimeType, fileName, { runAi: true });

  return { isAnalyzing, analyzeError, prepareImage, uploadDraftImage, analyze };
}
