import { useCallback, useEffect, useMemo, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import { useAuthStore } from '@/stores/auth.store';
import type { InspectionTeamKpi, KpiPeriod } from '@/types/inspection-kpi.types';

/**
 * KPI đoàn thanh tra (BR-INS-032). Inspector luôn xem team của mình —
 * không truyền `teamId` để BE tự resolve theo token.
 *
 * Gate theo `user.role`: tab bar giữ màn Inspector mounted ở background
 * (react-navigation không unmount tab ẩn) — nếu không gate, sau khi user
 * logout khỏi Inspector và login lại bằng role khác, hook này vẫn tiếp tục
 * gọi `/inspections/kpi` bằng token mới → BE trả 403 vì sai role.
 */
export function useInspectionKpi(period: KpiPeriod = 'ThisMonth') {
  const role = useAuthStore((s) => s.user?.role);
  const isInspector = role === 'Inspector';

  const [kpi, setKpi] = useState<InspectionTeamKpi | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isInspector) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inspectionService.getKpi({ period });
      setKpi(res.data.data);
    } catch {
      setError('Không tải được số liệu KPI.');
    } finally {
      setLoading(false);
    }
  }, [period, isInspector]);

  useEffect(() => {
    if (!isInspector) {
      setKpi(null);
      setLoading(false);
      return;
    }
    void refetch();
  }, [refetch, isInspector]);

  return useMemo(
    () => ({ kpi, isLoading, errorMessage, refetch }),
    [kpi, isLoading, errorMessage, refetch],
  );
}
