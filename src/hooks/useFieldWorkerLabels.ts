import { useMemo } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { getFieldWorkerLabels, type FieldWorkerLabels } from '@/utils/field-worker-labels';

export function useFieldWorkerLabels(): FieldWorkerLabels {
  const role = useAuthStore((s) => s.user?.role ?? 'Cleaner');
  return useMemo(() => getFieldWorkerLabels(role), [role]);
}
