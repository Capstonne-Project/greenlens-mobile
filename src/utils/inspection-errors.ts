import { isAxiosError } from 'axios';

/**
 * Error code BE trả cho mutation inspection (fe-inspection-api-guide §Error codes).
 * Đây là enum code — an toàn để map sang message cụ thể, không phải raw server message.
 */
const INSPECTION_ERROR_MESSAGES: Record<string, string> = {
  NOT_INSPECTION_TEAM_LEADER: 'Chỉ trưởng đoàn mới thực hiện được thao tác này.',
  NOT_ASSIGNED_TO_YOUR_TEAM: 'Hồ sơ không thuộc đoàn của bạn.',
  INSPECTION_NOT_FOUND: 'Hồ sơ không còn tồn tại.',
  INSPECTION_INVALID_STATUS: 'Trạng thái hồ sơ đã thay đổi. Vui lòng tải lại.',
  CLOSE_REASON_TOO_SHORT: 'Lý do phải từ 50 ký tự trở lên.',
  PENALTY_AMOUNT_INVALID: 'Số tiền phạt phải lớn hơn 0.',
  PAYMENT_AMOUNT_INVALID: 'Số tiền nộp phải lớn hơn 0.',
  PAYMENT_RECEIPT_REQUIRED: 'Cần ảnh biên lai để ghi nhận nộp phạt.',
  PAYMENT_NOT_FOUND: 'Không tìm thấy khoản nộp phạt.',
  PAYMENT_ALREADY_DELETED: 'Khoản nộp phạt này đã bị xóa.',

  // Checklist workflow — BR-INS-033
  INSPECTION_ARRIVAL_NOTE_REQUIRED:
    'Bạn ở cách hiện trường hơn 200m — cần nhập lý do giải trình.',
  INSPECTION_TOO_FAR: 'Vị trí quá xa hiện trường. Vui lòng nhập lý do giải trình.',
  CHECKLIST_VIOLATION_STATUS_REQUIRED: 'Cần mô tả tình trạng vi phạm trước khi chốt biên bản.',
  INSUFFICIENT_EVIDENCE_IMAGES: 'Cần tối thiểu 2 ảnh hiện trường.',
  EVIDENCE_IMAGES_REQUIRED: 'Vui lòng chọn ít nhất 1 tệp.',
  FILE_REQUIRED: 'Vui lòng chọn ít nhất 1 tệp.',
  INSPECTION_FIELD_REPORT_ALREADY_SUBMITTED:
    'Biên bản đã được chốt — không thể thay đổi checklist.',
  INSPECTION_FIELD_REPORT_REQUIRED: 'Cần chốt biên bản hiện trường trước khi ra quyết định.',
  INSPECTION_NO_TEAM: 'Hồ sơ chưa được gán đoàn thanh tra.',
  INSPECTION_DECLINE_EXPIRED: 'Đã quá hạn 24h để từ chối hồ sơ.',
  ENDPOINT_DEPRECATED: 'Chức năng này đã được thay thế. Vui lòng cập nhật ứng dụng.',
};

const FALLBACK = 'Không thể thực hiện thao tác. Vui lòng thử lại.';

/**
 * Map lỗi mutation sang message tiếng Việt.
 * Chỉ dùng `code` (enum của BE) — không hiển thị `message` thô từ server.
 */
export function getInspectionErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Không có kết nối mạng. Kiểm tra lại đường truyền.';

    if (error.response.status === 410) {
      return 'Chức năng này đã được thay thế. Vui lòng cập nhật ứng dụng.';
    }

    const code = (error.response.data as { code?: string } | undefined)?.code;
    if (code && INSPECTION_ERROR_MESSAGES[code]) return INSPECTION_ERROR_MESSAGES[code];
  }
  return FALLBACK;
}
