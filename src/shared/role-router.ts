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

/**
 * Href gốc của từng shell — LUÔN ghi đủ group segment.
 *
 * Group trong ngoặc bị xoá khỏi URL, nên `app/(tabs)/index` và
 * `app/(inspector)/(inspector-tabs)/index` đều rút gọn về `/`. Nếu điều hướng
 * bằng URL rút gọn, Expo Router có thể resolve sang shell sai (Citizen login
 * xong lại vào UI Inspector). Href có đủ group là duy nhất nên không nhập nhằng.
 *
 * Lưu ý: `index.tsx` được chuẩn hoá thành chính group — KHÔNG thêm `/index`.
 */
const SHELL_ROOT_HREF: Record<AppShell, Href> = {
  citizen: '/(tabs)' as Href,
  fieldWorker: '/(staff)/home' as Href,
  inspector: '/(inspector)/(inspector-tabs)' as Href,
};

export function getPostLoginHref(role: UserRole): Href {
  return SHELL_ROOT_HREF[getShellForRole(role)];
}

export function canAccessShell(role: UserRole, shell: AppShell): boolean {
  return getShellForRole(role) === shell;
}

export function isFieldWorkerRole(role: UserRole): boolean {
  return FIELD_WORKER_ROLES.has(role);
}
