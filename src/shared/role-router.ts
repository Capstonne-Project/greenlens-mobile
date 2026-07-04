import type { Href } from 'expo-router';
import type { UserRole } from '@/types/user.types';

/** Shell navigation theo master plan §1 */
export type AppShell = 'citizen' | 'fieldWorker' | 'inspector';

const FIELD_WORKER_ROLES: ReadonlySet<UserRole> = new Set(['Cleaner', 'CompanyStaff']);

export function getShellForRole(role: UserRole): AppShell {
  if (role === 'Citizen') return 'citizen';
  if (FIELD_WORKER_ROLES.has(role)) return 'fieldWorker';
  if (role === 'Inspector') return 'inspector';
  return 'citizen';
}

export function getPostLoginHref(role: UserRole): Href {
  switch (getShellForRole(role)) {
    case 'citizen':
      return '/(tabs)' as Href;
    case 'fieldWorker':
      return '/(staff)/home' as Href;
    case 'inspector':
      return '/(inspector)' as Href;
  }
}

export function canAccessShell(role: UserRole, shell: AppShell): boolean {
  return getShellForRole(role) === shell;
}

export function isFieldWorkerRole(role: UserRole): boolean {
  return FIELD_WORKER_ROLES.has(role);
}
