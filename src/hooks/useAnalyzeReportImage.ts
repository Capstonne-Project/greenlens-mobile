import { useState } from 'react';
import { pollutionReportService } from '@/services/pollutionReport.service';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import { buildReportFileName, guessMimeTypeFromUri } from '@/utils/report-image-file';

const SEVERITY_MAP = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

const CONFIDENCE_THRESHOLD = 0.70;

export function useAnalyzeReportImage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const setAiResult = useCreateReportDraftStore((s) => s.setAiResult);
  const clearAiResult = useCreateReportDraftStore((s) => s.clearAiResult);
  const setCategoryId = useCreateReportDraftStore((s) => s.setCategoryId);
  const setSeverity = useCreateReportDraftStore((s) => s.setSeverity);

  const analyze = async (uri: string, mimeType?: string): Promise<'accepted' | 'review' | 'rejected' | 'error'> => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    clearAiResult();

    try {
      const resolvedMime = mimeType ?? guessMimeTypeFromUri(uri);
      const fileName = buildReportFileName(uri, resolvedMime);

      const res = await pollutionReportService.analyzeImage({ uri, mimeType: resolvedMime, fileName });
      const data = res.data.data;

      setAiResult(data.tempImageId, data.aiResult, data.suggestedCategory);

      const decision = data.aiResult.decision;
      if (decision === 'IRRELEVANT_OR_SUSPECTED_ABUSIVE') return 'rejected';

      const confidence = data.aiResult.classify.confidence;
      const shouldAutoFill = confidence >= CONFIDENCE_THRESHOLD;

      if (shouldAutoFill) {
        const mappedSeverity = SEVERITY_MAP[data.aiResult.classify.severity];
        if (mappedSeverity) setSeverity(mappedSeverity);

        if (data.suggestedCategory) {
          setCategoryId(data.suggestedCategory.id);
        }
      }

      return decision === 'NEED_MANUAL_REVIEW' ? 'review' : 'accepted';
    } catch {
      setAnalyzeError('Không thể phân tích ảnh. Vui lòng thử lại hoặc bỏ qua AI.');
      return 'error';
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { isAnalyzing, analyzeError, analyze };
}
