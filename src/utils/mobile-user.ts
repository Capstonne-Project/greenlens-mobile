import type { User, UserRole } from '@/types/user.types';

/** BE có thể trả thêm role; mobile chỉ dùng Citizen | CleanupTeam */
export type UserFromApi = Omit<User, 'role'> & { role: string };

export function normalizeMobileUser(u: UserFromApi): User {
  const role: UserRole = u.role === 'CleanupTeam' || u.role === 'Cleanup' ? 'CleanupTeam' : 'Citizen';
  return { ...u, role };
}
