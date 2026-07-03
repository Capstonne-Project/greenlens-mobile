import type { User, UserRole } from '@/types/user.types';

/** BE v3.0 role strings — field worker */
const FIELD_WORKER_API_ROLES = new Set([
  'Cleaner',
  'CompanyStaff',
  // Legacy
  'CleanupTeam',
  'Cleanup',
]);

const INSPECTOR_API_ROLES = new Set(['Inspector']);

/** Web-only roles — mobile không có shell riêng (Officer = legacy LEO) */
const WEB_ONLY_API_ROLES = new Set(['LEO', 'DEO', 'Admin', 'Officer', 'CompanyManager']);

/** BE trả role string; mobile chuẩn hóa về UserRole */
export type UserFromApi = Omit<User, 'role'> & { role: string };

function mapApiRoleToMobile(role: string): UserRole {
  if (FIELD_WORKER_API_ROLES.has(role)) {
    return role === 'CompanyStaff' ? 'CompanyStaff' : 'Cleaner';
  }
  if (INSPECTOR_API_ROLES.has(role)) return 'Inspector';
  if (role === 'Citizen') return 'Citizen';
  if (WEB_ONLY_API_ROLES.has(role)) return 'Citizen';
  return 'Citizen';
}

export function normalizeMobileUser(u: UserFromApi): User {
  return { ...u, role: mapApiRoleToMobile(u.role) };
}

export function isWebOnlyApiRole(role: string): boolean {
  return WEB_ONLY_API_ROLES.has(role);
}
