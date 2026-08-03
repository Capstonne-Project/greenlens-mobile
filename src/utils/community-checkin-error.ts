import axios from 'axios';

export const CHECKIN_TOO_FAR_CODE = 'COMMUNITY_CHECKIN_TOO_FAR';

export function getCommunityCheckInErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { code?: string } | undefined;
    return body?.code;
  }
  return undefined;
}

export function isCheckInTooFarError(error: unknown): boolean {
  return getCommunityCheckInErrorCode(error) === CHECKIN_TOO_FAR_CODE;
}
