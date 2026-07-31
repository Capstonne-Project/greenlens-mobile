import { useCallback, useEffect, useMemo, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import { reportDetailService } from '@/services/reportDetail.service';
import type { InspectionDetail } from '@/types/inspection.types';

export interface InspectionMediaItem {
  url: string;
  mimeType?: string;
}

export interface SceneCoords {
  latitude: number;
  longitude: number;
}

/**
 * Chi tiết hồ sơ thanh tra + ảnh báo cáo gốc.
 * Inspection không có endpoint media riêng — ảnh lấy từ `GET /reports/{id}`.
 */
export function useInspectionDetail(id: string | undefined) {
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [reportMedia, setReportMedia] = useState<InspectionMediaItem[]>([]);
  const [sceneCoords, setSceneCoords] = useState<SceneCoords | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inspectionService.getDetail(id);
      const data = res.data.data;
      setDetail(data);

      // Ảnh + toạ độ hiện trường lấy từ report gốc (InspectionReport không lưu toạ độ).
      // Lỗi ở đây không nên chặn cả màn hình.
      try {
        const report = (await reportDetailService.getById(data.reportId)).data.data;
        setReportMedia(report.media.map((m) => ({ url: m.url, mimeType: m.mediaType })));
        setSceneCoords(
          typeof report.latitude === 'number' && typeof report.longitude === 'number'
            ? { latitude: report.latitude, longitude: report.longitude }
            : null,
        );
      } catch {
        setReportMedia([]);
        setSceneCoords(null);
      }
    } catch {
      setError('Không tải được chi tiết hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return useMemo(
    () => ({ detail, reportMedia, sceneCoords, isLoading, errorMessage, refetch }),
    [detail, reportMedia, sceneCoords, isLoading, errorMessage, refetch],
  );
}
