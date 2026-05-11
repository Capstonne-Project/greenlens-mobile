import type { ReportCategory } from '@/types/report.types';

/** Pin demo trên bản đồ — thay bằng API sau */
export interface CitizenMapPin {
  id: string;
  latitude: number;
  longitude: number;
  category: ReportCategory;
  clusterCount?: number;
  title: string;
  description: string;
  address: string;
  imageUrl: string;
  watchersCount: number;
}

export const CITIZEN_MAP_MOCK_PINS: CitizenMapPin[] = [
  {
    id: 'p1',
    latitude: 10.782,
    longitude: 106.698,
    category: 'waste',
    clusterCount: 4,
    title: 'XẢ RÁC BỪA BÃI NGHẸT CỐNG',
    description:
      'Rác chất đống đã được một thời gian nhưng chưa có đội hỗ trợ giải quyết sớm nhất vì nó…',
    address: 'Hiệp Phước, Nhà Bè, TP.HCM',
    imageUrl:
      'https://images.unsplash.com/photo-1530587191325-a3d037fd194d?w=800&q=80',
    watchersCount: 3,
  },
  {
    id: 'p2',
    latitude: 10.768,
    longitude: 106.712,
    category: 'air_pollution',
    clusterCount: 3,
    title: 'Khói bụi công trình',
    description: 'Khói xe và bụi từ công trình gây khó chịu ban ngày.',
    address: 'Quận 1, TP.HCM',
    imageUrl:
      'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&q=80',
    watchersCount: 12,
  },
  {
    id: 'p3',
    latitude: 10.792,
    longitude: 106.688,
    category: 'noise',
    title: 'Tiếng ồn ban đêm',
    description: 'Âm thanh lớn từ quán karaoke sau 22h.',
    address: 'Quận 3, TP.HCM',
    imageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
    watchersCount: 5,
  },
  {
    id: 'p4',
    latitude: 10.758,
    longitude: 106.682,
    category: 'water_pollution',
    title: 'Nước đen ven kênh',
    description: 'Nước có mùi hôi, nghi ngờ xả thải.',
    address: 'Quận 8, TP.HCM',
    imageUrl:
      'https://images.unsplash.com/photo-1540979388789-6d28e17d354b?w=800&q=80',
    watchersCount: 8,
  },
];

/** Cột biểu đồ 30 ngày (demo) */
export const AREA_STATS_BAR_HEIGHTS = [12, 18, 22, 14, 30, 24, 28, 20, 16, 35, 22, 18, 26, 20, 24, 28, 22, 18, 24, 32, 26, 22, 20, 18, 24, 28, 26, 22, 20, 36];
