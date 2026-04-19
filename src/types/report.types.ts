export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus   = 'pending' | 'verified' | 'in_progress' | 'resolved' | 'rejected';
export type ReportCategory = 'waste' | 'water_pollution' | 'air_pollution' | 'noise' | 'other';

export interface ReportLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  location: ReportLocation;
  imageUrls: string[];
  reportedBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  upvoteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportDto {
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  location: ReportLocation;
  imageUrls: string[];
}
