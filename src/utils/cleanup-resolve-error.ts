import axios from 'axios';

import { getApiErrorMessage } from '@/utils/api-error-message';

const RESOLVE_ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_AFTER_IMAGES: 'Cần ít nhất 2 ảnh minh chứng after.',
  NOT_TEAM_LEADER: 'Chỉ trưởng đội mới được hoàn thành nhiệm vụ.',
  INVALID_STATUS_TRANSITION: 'Nhiệm vụ không đang ở trạng thái xử lý.',
  REPORT_NOT_FOUND: 'Không tìm thấy báo cáo.',
};

export function getResolveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { code?: string } | undefined;
    const code = body?.code;
    if (code && RESOLVE_ERROR_MESSAGES[code]) {
      return RESOLVE_ERROR_MESSAGES[code];
    }
  }
  return getApiErrorMessage(error, 'Không thể hoàn thành nhiệm vụ. Vui lòng thử lại.');
}
