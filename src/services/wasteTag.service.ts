import { api, apiPublic } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { WasteTagsResponse } from '@/types/waste-tag.types';

export const wasteTagService = {
  getTags: async () => {
    try {
      return await api.get<ApiEnvelope<WasteTagsResponse>>('/waste-tags');
    } catch {
      return apiPublic.get<ApiEnvelope<WasteTagsResponse>>('/waste-tags');
    }
  },
};
