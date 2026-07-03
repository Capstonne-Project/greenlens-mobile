import type { UserRole } from '@/types/user.types';

export interface FieldWorkerLabels {
  shellTitle: string;
  teamSectionTitle: string;
  taskListTitle: string;
  roleBadge: string;
}

const LABELS: Record<'Cleaner' | 'CompanyStaff', FieldWorkerLabels> = {
  Cleaner: {
    shellTitle: 'Đội dọn dẹp',
    teamSectionTitle: 'Nhóm của tôi',
    taskListTitle: 'Nhiệm vụ được giao',
    roleBadge: 'Cleaner',
  },
  CompanyStaff: {
    shellTitle: 'Nhân viên công ty',
    teamSectionTitle: 'Đội xử lý công ty',
    taskListTitle: 'Công việc được phân công',
    roleBadge: 'Company Staff',
  },
};

export function getFieldWorkerLabels(role: UserRole): FieldWorkerLabels {
  if (role === 'CompanyStaff') return LABELS.CompanyStaff;
  return LABELS.Cleaner;
}
