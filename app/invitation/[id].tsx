import { useLocalSearchParams } from 'expo-router';

import { StaffInvitationScreen } from '@/components/invitation/StaffInvitationScreen';

export default function StaffInvitationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <StaffInvitationScreen invitationId={id} />;
}
