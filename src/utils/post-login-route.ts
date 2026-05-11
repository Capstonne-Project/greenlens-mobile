import type { Href } from 'expo-router';
import type { UserRole } from '@/types/user.types';

/** Citizen → app công dân; CleanupTeam → khu vực đội xử lý */
export function getPostLoginHref(role: UserRole): Href {
  switch (role) {
    case 'Citizen':
      return '/(tabs)' as Href;
    case 'CleanupTeam':
      return '/(staff)/home' as Href;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
