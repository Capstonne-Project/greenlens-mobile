import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';

import { getInspectionErrorMessage, isStaleStateError } from '@/utils/inspection-errors';

interface UseInspectionActionsOptions<T> {
  /** Gọi lại detail sau khi mutation thành công. */
  onRefresh: () => Promise<T>;
}

/**
 * Bọc mutation inspection: chặn double-submit, haptic, map lỗi sang tiếng Việt.
 * Trả detail mới nhất (từ onRefresh) khi thành công, `null` khi thất bại — caller dùng
 * giá trị này để tự động nhảy sang step tiếp theo, không phụ thuộc closure `detail` cũ.
 */
export function useInspectionActions<T>({ onRefresh }: UseInspectionActionsOptions<T>) {
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<unknown>, message: string): Promise<T | null> => {
      if (submitting) return null;
      setSubmitting(true);
      setActionError(null);
      setSuccessMessage(null);
      try {
        await action();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMessage(message);
        const refreshed = await onRefresh();
        return refreshed;
      } catch (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActionError(getInspectionErrorMessage(error));
        if (isStaleStateError(error)) {
          await onRefresh();
        }
        return null;
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
