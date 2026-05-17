import { api, apiPublic } from "@/services/api";
import type { ApiEnvelope } from "@/types/api.types";
import type {
  AiAnalyzeResponse,
  SubmitPollutionReportPayload,
  SubmitPollutionReportResult,
  UploadReportImageResult,
} from "@/types/pollution-report.types";

interface UploadReportImageInput {
  uri: string;
  mimeType: string;
  fileName: string;
}

export const pollutionReportService = {
  uploadImage: ({ uri, mimeType, fileName }: UploadReportImageInput) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return apiPublic.post<ApiEnvelope<UploadReportImageResult>>("/media/reports/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  analyzeImage: ({ uri, mimeType, fileName }: UploadReportImageInput) => {
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    return apiPublic.post<ApiEnvelope<AiAnalyzeResponse>>("/reports/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  submit: (payload: SubmitPollutionReportPayload, isAnonymous: boolean) => {
    const client = isAnonymous ? apiPublic : api;
    return client.post<ApiEnvelope<SubmitPollutionReportResult>>("/reports", payload);
  },
};
