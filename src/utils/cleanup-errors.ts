import { isAxiosError } from 'axios';

/**
 * Error code BE trả cho mutation cleanup assignment (PUT /reports/{id}/progress, /resolve, ...).
 * Chỉ map theo `code` (enum BE) — không hiển thị message thô từ server.
 */
const CLEANUP_ERROR_MESSAGES: Record<string, string> = {
  PROGRESS_CANNOT_DECREASE: 'Không thể cập nhật tiến độ thấp hơn mức đã lưu trước đó.',
  CLEANUP_PROGRESS_CANNOT_DECREASE: 'Không thể cập nhật tiến độ thấp hơn mức đã lưu trước đó.',
  ASSIGNMENT_NOT_IN_PROGRESS: 'Nhiệm vụ không ở trạng thái đang xử lý. Vui lòng tải lại.',
  CLEANUP_NOT_IN_PROGRESS: 'Nhiệm vụ không ở trạng thái đang xử lý. Vui lòng tải lại.',
  INVALID_PROGRESS_PERCENT: 'Phần trăm tiến độ phải trong khoảng 0–100.',
  TOO_MANY_IMAGES: 'Chỉ được đính kèm tối đa 5 ảnh.',
  INVALID_STORAGE_URL: 'Đường dẫn tệp không hợp lệ. Vui lòng chụp/tải lại ảnh.',
  NOT_TEAM_LEADER: 'Chỉ trưởng nhóm được thực hiện thao tác này.',
  ASSIGNMENT_NOT_FOUND: 'Không tìm thấy nhiệm vụ.',
};

const FALLBACK = 'Không thể gửi cập nhật. Vui lòng thử lại.';

export function getCleanupErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Không có kết nối mạng. Kiểm tra lại đường truyền.';

    const code = (error.response.data as { code?: string } | undefined)?.code;
    if (code && CLEANUP_ERROR_MESSAGES[code]) return CLEANUP_ERROR_MESSAGES[code];
    return FALLBACK;
  }

  return FALLBACK;
}
