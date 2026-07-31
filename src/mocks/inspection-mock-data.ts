/**
 * ============================================================
 * MOCK DATA — CHỈ ĐỂ XEM UI INSPECTOR KHI BE CHƯA CÓ DATA THẬT.
 * XOÁ TOÀN BỘ FILE NÀY + IMPORT Ở inspection.service.ts VÀ
 * reportDetail.service.ts KHI KHÔNG CẦN NỮA.
 * ============================================================
 *
 * Bật/tắt bằng cờ `USE_INSPECTION_MOCK` bên dưới — đổi `false` để tắt
 * ngay mà không cần xoá code.
 */

import type { InspectionTeamKpi } from "@/types/inspection-kpi.types";
import type {
  InspectionDetail,
  InspectionEvidenceItem,
  InspectionQueueItem,
  InspectionStatus,
} from "@/types/inspection.types";
import type { ReportDetail } from "@/types/report-detail.types";

/** ĐỔI THÀNH false ĐỂ TẮT MOCK — không cần xoá code. */
export const USE_INSPECTION_MOCK = false;

/** Độ trễ giả lập network — cho UI loading/skeleton hiện đúng nhịp. */
const MOCK_DELAY_MS = 450;

export function mockDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const MOCK_TEAM_ID = "mock-team-01";
const MOCK_TEAM_NAME = "Đội thanh tra số 1 — Quận 7";

const MOCK_SCENE_COORDS: Record<string, { latitude: number; longitude: number; address: string }> = {
  "mock-insp-1": { latitude: 10.7326, longitude: 106.7217, address: "12 Nguyễn Lương Bằng, Quận 7, TP.HCM" },
  "mock-insp-2": { latitude: 10.7378, longitude: 106.7191, address: "45 Huỳnh Tấn Phát, Quận 7, TP.HCM" },
  "mock-insp-3": { latitude: 10.7551, longitude: 106.6982, address: "8 Nguyễn Hữu Thọ, Quận 7, TP.HCM" },
  "mock-insp-4": { latitude: 10.7462, longitude: 106.7079, address: "120 Lâm Văn Bền, Quận 7, TP.HCM" },
  "mock-insp-5": { latitude: 10.729, longitude: 106.7266, address: "3 Đào Trí, Quận 7, TP.HCM" },
  "mock-insp-6": { latitude: 10.741, longitude: 106.715, address: "77 Nguyễn Thị Thập, Quận 7, TP.HCM" },
};

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=60";
const SAMPLE_IMAGE_2 = "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=60";

/** Checklist evidence mẫu cho hồ sơ đã qua bước điều tra (InProgress trở lên). */
function buildChecklistEvidence(withScenePhotos: boolean): InspectionEvidenceItem[] {
  const items: InspectionEvidenceItem[] = [
    {
      id: "ev-violation-status",
      category: "ViolationStatus",
      mediaUrl: null,
      mimeType: null,
      sizeBytes: null,
      description:
        "Phát hiện cơ sở xả nước thải chưa qua xử lý ra kênh rạch lân cận. Mùi hôi nồng nặc, nước có màu đen bất thường.",
      durationSeconds: null,
      uploadedAt: daysAgo(2),
    },
  ];

  if (withScenePhotos) {
    items.push(
      {
        id: "ev-scene-1",
        category: "ScenePhoto",
        mediaUrl: SAMPLE_IMAGE,
        mimeType: "image/jpeg",
        sizeBytes: 1_200_000,
        description: null,
        durationSeconds: null,
        uploadedAt: daysAgo(2),
      },
      {
        id: "ev-scene-2",
        category: "ScenePhoto",
        mediaUrl: SAMPLE_IMAGE_2,
        mimeType: "image/jpeg",
        sizeBytes: 1_340_000,
        description: null,
        durationSeconds: null,
        uploadedAt: daysAgo(2),
      },
    );
  }

  return items;
}

/** 6 hồ sơ trải đủ mọi status để xem hết luồng UI. */
const MOCK_QUEUE_ITEMS: InspectionQueueItem[] = [
  {
    id: "mock-insp-1",
    reportId: "mock-report-1",
    reportCode: "REP-MOB-2026-0142",
    status: "Draft",
    address: MOCK_SCENE_COORDS["mock-insp-1"].address,
    wardCode: "27145",
    violatorName: "Cơ sở giặt ủi Sạch Xanh",
    violationDescription: "Xả nước thải chưa qua xử lý ra cống thoát nước công cộng.",
    violationLevel: null,
    penaltyAmount: null,
    isRepeatOffender: false,
    slaInspectionDueAt: hoursFromNow(20),
    createdAt: daysAgo(1),
    latitude: MOCK_SCENE_COORDS["mock-insp-1"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-1"].longitude,
  },
  {
    id: "mock-insp-2",
    reportId: "mock-report-2",
    reportCode: "REP-MOB-2026-0139",
    status: "InProgress",
    address: MOCK_SCENE_COORDS["mock-insp-2"].address,
    wardCode: "27145",
    violatorName: "Xưởng cơ khí Thành Phát",
    violationDescription: "Phát sinh khói bụi và tiếng ồn vượt mức cho phép trong khu dân cư.",
    violationLevel: null,
    penaltyAmount: null,
    isRepeatOffender: true,
    slaInspectionDueAt: hoursFromNow(6),
    createdAt: daysAgo(2),
    latitude: MOCK_SCENE_COORDS["mock-insp-2"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-2"].longitude,
  },
  {
    id: "mock-insp-3",
    reportId: "mock-report-3",
    reportCode: "REP-MOB-2026-0130",
    status: "PenaltyIssued",
    address: MOCK_SCENE_COORDS["mock-insp-3"].address,
    wardCode: "27146",
    violatorName: "Công ty TNHH Vật liệu xây dựng Hưng Thịnh",
    violationDescription: "Đổ chất thải xây dựng trái phép ra khu đất trống.",
    violationLevel: "Severe",
    penaltyAmount: 15_000_000,
    isRepeatOffender: false,
    slaInspectionDueAt: hoursFromNow(-4),
    createdAt: daysAgo(5),
    latitude: MOCK_SCENE_COORDS["mock-insp-3"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-3"].longitude,
  },
  {
    id: "mock-insp-4",
    reportId: "mock-report-4",
    reportCode: "REP-MOB-2026-0121",
    status: "Overdue",
    address: MOCK_SCENE_COORDS["mock-insp-4"].address,
    wardCode: "27146",
    violatorName: "Nhà hàng Biển Xanh",
    violationDescription: "Xả dầu mỡ thải trực tiếp xuống kênh, gây ô nhiễm nguồn nước.",
    violationLevel: "Moderate",
    penaltyAmount: 8_000_000,
    isRepeatOffender: true,
    slaInspectionDueAt: hoursFromNow(-30),
    createdAt: daysAgo(8),
    latitude: MOCK_SCENE_COORDS["mock-insp-4"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-4"].longitude,
  },
  {
    id: "mock-insp-5",
    reportId: "mock-report-5",
    reportCode: "REP-MOB-2026-0098",
    status: "Paid",
    address: MOCK_SCENE_COORDS["mock-insp-5"].address,
    wardCode: "27147",
    violatorName: "Hộ kinh doanh Trần Văn Minh",
    violationDescription: "Đốt rác thải sinh hoạt gây khói bụi ảnh hưởng khu dân cư.",
    violationLevel: "Minor",
    penaltyAmount: 3_000_000,
    isRepeatOffender: false,
    slaInspectionDueAt: null,
    createdAt: daysAgo(12),
    latitude: MOCK_SCENE_COORDS["mock-insp-5"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-5"].longitude,
  },
  {
    id: "mock-insp-6",
    reportId: "mock-report-6",
    reportCode: "REP-MOB-2026-0087",
    status: "Closed",
    address: MOCK_SCENE_COORDS["mock-insp-6"].address,
    wardCode: "27147",
    violatorName: "Công ty CP Thực phẩm An Khang",
    violationDescription: "Xả thải mùi hôi từ khu chế biến ra khu vực xung quanh.",
    violationLevel: "Moderate",
    penaltyAmount: 10_000_000,
    isRepeatOffender: false,
    slaInspectionDueAt: null,
    createdAt: daysAgo(20),
    latitude: MOCK_SCENE_COORDS["mock-insp-6"].latitude,
    longitude: MOCK_SCENE_COORDS["mock-insp-6"].longitude,
  },
];

/** Suy ra 9 capability flag từ status — giữ đúng state machine BR-INS-033 thật. */
function buildFlagsForStatus(status: InspectionStatus, fieldSubmitted: boolean) {
  const inProgress = status === "InProgress";
  return {
    canAcceptTask: status === "Draft",
    canConfirmArrival: inProgress && !fieldSubmitted,
    canEditChecklist: inProgress && !fieldSubmitted,
    canSubmitFieldReport: inProgress && !fieldSubmitted,
    canEditDetails: inProgress && !fieldSubmitted,
    canIssuePenalty: inProgress && fieldSubmitted,
    canCloseNoViolation: inProgress && fieldSubmitted,
    canRecordPayment: status === "PenaltyIssued" || status === "PartiallyPaid" || status === "Overdue",
    canClose: status === "Paid",
  };
}

/** Map từng mock item thành InspectionDetail đầy đủ — mutable, giả lập BE thật. */
const MOCK_DETAILS = new Map<string, InspectionDetail>(
  MOCK_QUEUE_ITEMS.map((item) => {
    const fieldSubmitted = ["PenaltyIssued", "PartiallyPaid", "Overdue", "Paid", "Closed"].includes(item.status);
    const hasScenePhotos = item.status !== "Draft";
    const flags = buildFlagsForStatus(item.status, fieldSubmitted);

    const detail: InspectionDetail = {
      id: item.id,
      reportId: item.reportId,
      reportCode: item.reportCode,
      status: item.status,
      assignedTeamId: MOCK_TEAM_ID,
      assignedTeamName: MOCK_TEAM_NAME,
      violationDescription: item.violationDescription,
      violatorName: item.violatorName,
      violatorAddress: item.address,
      violatorIdentity: item.status === "Draft" ? null : "0312xxxxxx",
      violationLevel: item.violationLevel,
      penaltyAmount: item.penaltyAmount,
      penaltyDecisionNumber: item.penaltyAmount != null ? `QĐ-XP-2026-${item.reportCode.slice(-3)}` : null,
      penaltyIssuedAt: item.penaltyAmount != null ? daysAgo(3) : null,
      penaltyDueDate: item.penaltyAmount != null ? hoursFromNow(24 * 7) : null,
      paidAmount: item.status === "Paid" || item.status === "Closed" ? item.penaltyAmount : null,
      additionalPenaltyMeasures: item.status === "Overdue" ? "Tạm đình chỉ hoạt động 7 ngày" : null,
      isRepeatOffender: item.isRepeatOffender,
      createdByOfficerId: "mock-officer-1",
      createdByOfficerName: "LEO Nguyễn Văn An",
      issuedByInspectorId: fieldSubmitted ? "mock-inspector-me" : null,
      issuedByInspectorName: fieldSubmitted ? "Bạn" : null,
      slaInspectionDueAt: item.slaInspectionDueAt,
      closedAt: item.status === "Closed" ? daysAgo(1) : null,
      closedReason: item.status === "Closed" ? "Vi phạm đã nộp phạt đầy đủ." : null,
      createdAt: item.createdAt,

      violatingEntityId: null,
      violatingEntity: null,
      payments:
        item.status === "Paid" || item.status === "Closed"
          ? [
              {
                id: "mock-payment-1",
                amount: item.penaltyAmount ?? 0,
                paidAt: daysAgo(2),
                evidenceUrl: SAMPLE_IMAGE,
                note: "Nộp đủ tại kho bạc quận.",
                recordedByUserId: "mock-inspector-me",
                recordedByUserName: "Bạn",
                createdAt: daysAgo(2),
              },
            ]
          : [],

      acceptedAt: item.status === "Draft" ? null : daysAgo(3),
      acceptedByUserId: item.status === "Draft" ? null : "mock-inspector-me",
      arrivalConfirmedAt: fieldSubmitted || item.status === "InProgress" ? daysAgo(2) : null,
      arrivalLatitude: MOCK_SCENE_COORDS[item.id]?.latitude ?? null,
      arrivalLongitude: MOCK_SCENE_COORDS[item.id]?.longitude ?? null,
      arrivalNote: item.isRepeatOffender
        ? "Đối tượng tái phạm — đã ghi nhận vị trí xa 250m do khu vực rào chắn."
        : null,
      fieldInvestigationSubmittedAt: fieldSubmitted ? daysAgo(3) : null,
      fieldInvestigationSubmittedByUserId: fieldSubmitted ? "mock-inspector-me" : null,
      checklistEvidence: item.status === "Draft" ? [] : buildChecklistEvidence(hasScenePhotos),

      canEditDetails: flags.canEditDetails,
      canAcceptTask: flags.canAcceptTask,
      canConfirmArrival: flags.canConfirmArrival,
      canEditChecklist: flags.canEditChecklist,
      canSubmitFieldReport: flags.canSubmitFieldReport,
      canIssuePenalty: flags.canIssuePenalty,
      canCloseNoViolation: flags.canCloseNoViolation,
      canRecordPayment: flags.canRecordPayment,
      canClose: flags.canClose,
    };

    return [item.id, detail];
  }),
);

const MOCK_REPORT_DETAILS = new Map<string, ReportDetail>(
  MOCK_QUEUE_ITEMS.map((item) => {
    const coords = MOCK_SCENE_COORDS[item.id];
    const report: ReportDetail = {
      id: item.reportId,
      code: item.reportCode,
      reporterId: "mock-citizen-1",
      reporterName: "Người dân ẩn danh",
      reporterAvatarUrl: null,
      status: "Verified",
      categoryName: "Ô nhiễm nguồn nước",
      categoryCode: "water_pollution",
      severity: "High",
      description: item.violationDescription ?? null,
      address: coords.address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      reporterCount: 1,
      reopenedCount: 0,
      media: [
        { id: "m1", url: SAMPLE_IMAGE, mediaType: "image/jpeg" },
        { id: "m2", url: SAMPLE_IMAGE_2, mediaType: "image/jpeg" },
      ],
      assignments: [],
      wasteTags: [],
      createdAt: item.createdAt,
      verifiedAt: daysAgo(4),
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
      slaVerifyDueAt: null,
      slaResolveDueAt: null,
    };
    return [item.reportId, report];
  }),
);

const MOCK_KPI: InspectionTeamKpi = {
  teamId: MOCK_TEAM_ID,
  teamName: MOCK_TEAM_NAME,
  periodFrom: daysAgo(30),
  periodTo: new Date().toISOString(),
  totalInspections: 12,
  penaltyIssuedCount: 8,
  penaltyIssuedOnTime: 7,
  penaltyIssuedOnTimePercent: 87.5,
  closedNoViolationCount: 1,
  totalPaid: 5,
  paidOnTime: 4,
  paidOnTimePercent: 80,
  repeatOffenderCount: 2,
  slaBreach: 1,
};

// ── Mutable "server-side" state — nằm ở module scope nên các hook dùng
// chung state trong suốt session (giống một BE giả). ──

export function mockGetQueue(status?: string) {
  const items = status ? MOCK_QUEUE_ITEMS.filter((i) => i.status === status) : MOCK_QUEUE_ITEMS;
  return mockDelay({
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  });
}

export function mockGetKpi() {
  return mockDelay(MOCK_KPI);
}

export function mockGetDetail(id: string) {
  const detail = MOCK_DETAILS.get(id);
  if (!detail) return Promise.reject(new Error("MOCK_NOT_FOUND"));
  return mockDelay(detail);
}

export function mockGetReportDetail(reportId: string) {
  const report = MOCK_REPORT_DETAILS.get(reportId);
  if (!report) return Promise.reject(new Error("MOCK_NOT_FOUND"));
  return mockDelay(report);
}

function patchDetail(id: string, patch: Partial<InspectionDetail>): void {
  const current = MOCK_DETAILS.get(id);
  if (!current) return;
  const next = { ...current, ...patch };
  const fieldSubmitted = Boolean(next.fieldInvestigationSubmittedAt);
  Object.assign(next, buildFlagsForStatus(next.status, fieldSubmitted));
  MOCK_DETAILS.set(id, next);

  const queueItem = MOCK_QUEUE_ITEMS.find((q) => q.id === id);
  if (queueItem) queueItem.status = next.status;
}

export function mockAccept(id: string) {
  patchDetail(id, { status: "InProgress", acceptedAt: new Date().toISOString() });
  return mockDelay(undefined);
}

export function mockConfirmArrival(id: string, latitude: number, longitude: number, note?: string) {
  patchDetail(id, {
    arrivalConfirmedAt: new Date().toISOString(),
    arrivalLatitude: latitude,
    arrivalLongitude: longitude,
    arrivalNote: note ?? null,
  });
  return mockDelay(undefined);
}

export function mockUpdateChecklist(id: string, violationStatusText: string, otherDescription?: string) {
  const current = MOCK_DETAILS.get(id);
  if (!current) return mockDelay(undefined);
  const withoutText = current.checklistEvidence.filter(
    (e) => e.category !== "ViolationStatus" && e.category !== "Other",
  );
  const nextEvidence: InspectionEvidenceItem[] = [
    ...withoutText,
    {
      id: `ev-violation-status-${Date.now()}`,
      category: "ViolationStatus",
      mediaUrl: null,
      mimeType: null,
      sizeBytes: null,
      description: violationStatusText,
      durationSeconds: null,
      uploadedAt: new Date().toISOString(),
    },
    ...(otherDescription
      ? [
          {
            id: `ev-other-${Date.now()}`,
            category: "Other" as const,
            mediaUrl: null,
            mimeType: null,
            sizeBytes: null,
            description: otherDescription,
            durationSeconds: null,
            uploadedAt: new Date().toISOString(),
          },
        ]
      : []),
  ];
  patchDetail(id, { checklistEvidence: nextEvidence });
  return mockDelay(undefined);
}

export function mockUploadEvidence(id: string, category: string) {
  const current = MOCK_DETAILS.get(id);
  if (!current) return mockDelay(undefined);
  const nextEvidence: InspectionEvidenceItem[] = [
    ...current.checklistEvidence,
    {
      id: `ev-${category}-${Date.now()}`,
      category: category as InspectionEvidenceItem["category"],
      mediaUrl: category === "ScenePhoto" ? SAMPLE_IMAGE : null,
      mimeType: category === "ScenePhoto" ? "image/jpeg" : "application/octet-stream",
      sizeBytes: 500_000,
      description: null,
      durationSeconds: category === "Audio" ? 12 : null,
      uploadedAt: new Date().toISOString(),
    },
  ];
  patchDetail(id, { checklistEvidence: nextEvidence });
  return mockDelay(undefined);
}

export function mockSubmitFieldReport(id: string) {
  patchDetail(id, { fieldInvestigationSubmittedAt: new Date().toISOString() });
  return mockDelay(undefined);
}

export function mockIssuePenalty(
  id: string,
  violationLevel: string,
  penaltyAmount: number,
  decisionNumber: string,
  paymentDueDays: number,
  additionalMeasures?: string,
) {
  patchDetail(id, {
    status: "PenaltyIssued",
    violationLevel: violationLevel as InspectionDetail["violationLevel"],
    penaltyAmount,
    penaltyDecisionNumber: decisionNumber,
    penaltyIssuedAt: new Date().toISOString(),
    penaltyDueDate: hoursFromNow(24 * paymentDueDays),
    additionalPenaltyMeasures: additionalMeasures ?? null,
  });
  return mockDelay(undefined);
}

export function mockCloseNoViolation(id: string, reason: string) {
  patchDetail(id, { status: "ClosedNoViolation", closedAt: new Date().toISOString(), closedReason: reason });
  return mockDelay(undefined);
}

export function mockRecordPayment(id: string, paidAmount: number, note?: string) {
  const current = MOCK_DETAILS.get(id);
  if (!current) return mockDelay(undefined);
  const totalPaid = (current.paidAmount ?? 0) + paidAmount;
  const fullyPaid = current.penaltyAmount != null && totalPaid >= current.penaltyAmount;
  patchDetail(id, {
    status: fullyPaid ? "Paid" : "PartiallyPaid",
    paidAmount: totalPaid,
    payments: [
      ...current.payments,
      {
        id: `mock-payment-${Date.now()}`,
        amount: paidAmount,
        paidAt: new Date().toISOString(),
        evidenceUrl: SAMPLE_IMAGE,
        note: note ?? null,
        recordedByUserId: "mock-inspector-me",
        recordedByUserName: "Bạn",
        createdAt: new Date().toISOString(),
      },
    ],
  });
  return mockDelay(undefined);
}

export function mockClose(id: string, reason?: string) {
  patchDetail(id, { status: "Closed", closedAt: new Date().toISOString(), closedReason: reason ?? null });
  return mockDelay(undefined);
}
