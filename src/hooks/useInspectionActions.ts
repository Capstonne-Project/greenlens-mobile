import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';

import { getInspectionErrorMessage, isStaleStateError } from '@/utils/inspection-errors';

interface UseInspectionActionsOptions {
  /** Gọi lại detail sau khi mutation thành công. */
  onRefresh: () => Promise<void>;
}

/**
 * Bọc mutation inspection: chặn double-submit, haptic, map lỗi sang tiếng Việt.
 * Trả `true` khi thành công để caller reset form.
 */
export function useInspectionActions({ onRefresh }: UseInspectionActionsOptions) {
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string): Promise<boolean> => {
      if (submitting) return false;
      setSubmitting(true);
      setActionError(null);
      setSuccessMessage(null);
      try {
        await action();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMessage(message);
        await onRefresh();
        return true;
      } catch (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActionError(getInspectionErrorMessage(error));
        if (isStaleStateError(error)) {
          await onRefresh();
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [onRefresh, submitting],
  );

  const dismissFeedback = useCallback(() => {
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  return { run, submitting, actionError, successMessage, dismissFeedback };
}
