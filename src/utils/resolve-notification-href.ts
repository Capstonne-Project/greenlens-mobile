import type { Href } from 'expo-router';

import type { NotificationType } from '@/types/notification.types';
import type { UserRole } from '@/types/user.types';
import { getShellForRole } from '@/shared/role-router';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value.trim());
}

/**
 * Map notification type + role → Expo Router href.
 * `referenceId` is usually ReportId; for Inspector SLA/penalty it is InspectionId.
 */
export function resolveNotificationHref(
  type: NotificationType | string,
  referenceId: string | null | undefined,
  role: UserRole,
): Href | null {
  const shell = getShellForRole(role);
  const ref = isUuid(referenceId) ? referenceId.trim() : null;

  switch (shell) {
    case 'citizen':
      return resolveCitizenHref(type, ref);
    case 'fieldWorker':
      return resolveFieldWorkerHref(type, ref);
    case 'inspector':
      return resolveInspectorHref(type, ref);
    default:
      return null;
  }
}

function resolveCitizenHref(type: string, ref: string | null): Href | null {
  switch (type) {
    case 'BadgeEarned':
    case 'LevelUp':
      return '/(tabs)/profile' as Href;

    case 'NearbyReport':
      if (ref) {
        return {
          pathname: '/report/[id]',
          params: { id: ref, source: 'tab' },
        } as Href;
      }
      return '/(tabs)' as Href;

    case 'ReportStatusChanged':
    case 'NewComment':
    case 'ReportAutoClosed':
    case 'PenaltyIssued':
    case 'SlaBreachWarning':
      if (ref) {
        return {
          pathname: '/report/[id]',
          params: { id: ref, source: 'tab' },
        } as Href;
      }
      return '/(tabs)/reports' as Href;

    default:
      if (ref) {
        return {
          pathname: '/report/[id]',
          params: { id: ref, source: 'tab' },
        } as Href;
      }
      return '/(tabs)/notifications' as Href;
  }
}

function resolveFieldWorkerHref(type: string, ref: string | null): Href | null {
  switch (type) {
    case 'ContractExpiry':
      return '/(staff)/settings' as Href;

    case 'ReportAssigned':
    case 'ReportStatusChanged':
    case 'SlaBreachWarning':
    case 'NewComment':
    case 'AssignmentDeclined':
      if (ref) {
        return {
          pathname: '/assignment/[id]',
          params: { id: ref, assignmentId: ref },
        } as Href;
      }
      return '/(staff)/assignments' as Href;

    default:
      if (ref) {
        return {
          pathname: '/assignment/[id]',
          params: { id: ref, assignmentId: ref },
        } as Href;
      }
      return '/(staff)/notifications' as Href;
  }
}

function resolveInspectorHref(type: string, ref: string | null): Href | null {
  switch (type) {
    case 'InspectionAssigned':
    case 'PenaltyIssued':
    case 'SlaBreachWarning':
      if (ref) {
        return `/(inspector)/inspection/${ref}` as Href;
      }
      return '/(inspector)/(tabs)/queue' as Href;

    default:
      if (ref) {
        return `/(inspector)/inspection/${ref}` as Href;
      }
      return '/(inspector)/(tabs)/notifications' as Href;
  }
}
