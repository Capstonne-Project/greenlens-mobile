export interface WasteTag {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  iconUrl: string | null;
  description: string | null;
  displayOrder: number;
}

export interface WasteTagsResponse {
  tags: WasteTag[];
}

export const MAX_WASTE_TAG_SELECTION = 10;
