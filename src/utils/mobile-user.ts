import type { User, UserRole } from '@/types/user.types';

const CLEANER_ROLES = new Set(['Cleaner', 'CleanupTeam', 'Cleanup']);

/** BE trả role string; mobile chuẩn hóa về Citizen | Cleaner */
export type UserFromApi = Omit<User, 'role'> & { role: string };

export function normalizeMobileUser(u: UserFromApi): User {
  const role: UserRole = CLEANER_ROLES.has(u.role) ? 'Cleaner' : 'Citizen';
  return { ...u, role };
}
