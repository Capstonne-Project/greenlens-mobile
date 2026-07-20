import { useCallback, useEffect, useState } from 'react';

import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { useAuthStore } from '@/stores/auth.store';
import type { TeamProfile } from '@/types/cleanup-assignment.types';

interface UseTeamAccessResult {
  profile: TeamProfile | null;
  teamId: string;
  isLeader: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

export function useTeamAccess(): UseTeamAccessResult {
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await cleanupAssignmentService.getTeamProfile();
      setProfile(response.data.data);
    } catch {
      setProfile(null);
      setErrorMessage('Không thể xác minh quyền trưởng nhóm.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    profile,
    teamId: profile?.id ?? '',
    isLeader: profile?.members.some((member) => member.userId === userId && member.isLeader) ?? false,
    isLoading,
    errorMessage,
    refetch,
  };
}
