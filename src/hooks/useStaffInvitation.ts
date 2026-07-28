import { useCallback, useEffect, useState } from 'react';

import { invitationService } from '@/services/invitation.service';
import type { InvitationDto } from '@/types/invitation.types';

type LoadState = 'loading' | 'ready' | 'not-found';

interface UseStaffInvitationResult {
  invitation: InvitationDto | null;
  loadState: LoadState;
  isExpired: boolean;
  isAccepting: boolean;
  isDeclining: boolean;
  actionError: string | null;
  accept: () => Promise<boolean>;
  decline: () => Promise<boolean>;
}

function isExpiredInvitation(invitation: InvitationDto): boolean {
  if (invitation.status !== 'Pending') return true;
  const expiresAt = new Date(invitation.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export function useStaffInvitation(invitationId: string | undefined): UseStaffInvitationResult {
  const [invitation, setInvitation] = useState<InvitationDto | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setLoadState('not-found');
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    invitationService
      .getMy()
      .then((res) => {
        if (cancelled) return;
        const found = res.data.data.find((item) => item.invitationId === invitationId);
        setInvitation(found ?? null);
        setLoadState(found ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('not-found');
      });

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const accept = useCallback(async (): Promise<boolean> => {
    if (!invitationId) return false;
    setIsAccepting(true);
    setActionError(null);
    try {
      await invitationService.accept(invitationId);
      setInvitation((prev) => (prev ? { ...prev, status: 'Accepted' } : prev));
      return true;
    } catch (error) {
      setActionError(resolveActionErrorMessage(error));
      return false;
    } finally {
      setIsAccepting(false);
    }
  }, [invitationId]);

  const decline = useCallback(async (): Promise<boolean> => {
    if (!invitationId) return false;
    setIsDeclining(true);
    setActionError(null);
    try {
      await invitationService.decline(invitationId);
      setInvitation((prev) => (prev ? { ...prev, status: 'Declined' } : prev));
      return true;
    } catch (error) {
      setActionError(resolveActionErrorMessage(error));
      return false;
    } finally {
      setIsDeclining(false);
    }
  }, [invitationId]);

  return {
    invitation,
    loadState,
    isExpired: invitation ? isExpiredInvitation(invitation) : false,
    isAccepting,
    isDeclining,
    actionError,
    accept,
    decline,
  };
}

function resolveActionErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 404) return 'Lời mời không tồn tại hoặc không thuộc về bạn.';
  if (status === 422) return 'Lời mời đã hết hạn hoặc đã được xử lý.';
  return 'Đã xảy ra lỗi, vui lòng thử lại.';
}
