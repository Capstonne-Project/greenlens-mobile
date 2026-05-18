import { useMemo } from 'react';
import { useMyAssignments } from './useMyAssignments';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';
import { colors } from '@/theme/colors';

export interface StaffMapPin {
  id: string;
  reportId: string;
  reportCode: string;
  latitude: number;
  longitude: number;
  address: string;
  categoryName: string;
  assignmentStatus: AssignmentStatus;
  severity: string;
  color: string;
  firstImageUrl: string | null;
}

const STATUS_COLOR: Record<AssignmentStatus, string> = {
  Assigned:   '#EF4444',
  InProgress: '#F97316',
  Completed:  colors.primary,
  Declined:   '#9CA3AF',
};

function itemToPin(item: AssignmentItem): StaffMapPin | null {
  if (!item.latitude || !item.longitude) return null;
  return {
    id:               item.assignmentId,
    reportId:         item.reportId,
    reportCode:       item.reportCode,
    latitude:         item.latitude,
    longitude:        item.longitude,
    address:          item.address,
    categoryName:     item.categoryName,
    assignmentStatus: item.assignmentStatus,
    severity:         item.severity,
    color:            STATUS_COLOR[item.assignmentStatus] ?? colors.textSecondary,
    firstImageUrl:    item.firstImageUrl ?? null,
  };
}

export function useStaffMapPins() {
  const { items, isLoading } = useMyAssignments({ pageSize: 200 });

  const pins = useMemo(
    () => items.map(itemToPin).filter((p): p is StaffMapPin => p !== null),
    [items],
  );

  return { pins, isLoading };
}
