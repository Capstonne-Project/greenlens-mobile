import { SafeScreen } from '@/components/layout/SafeScreen';
import { useAuthEarth } from '@/components/auth/AuthEarthProvider';
import { OnboardingScreen } from '@/components/onboarding';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';

export default function OnboardingRoute() {
  const { morphToHeader } = useAuthEarth();
  const locking = useRef(false);

  const goToLogin = useCallback(async () => {
    if (locking.current) return;
    locking.current = true;
    try {
      await morphToHeader();
      router.replace('/(auth)/login');
    } finally {
      locking.current = false;
    }
  }, [morphToHeader]);

  return (
    <SafeScreen edges={['top', 'bottom']} className="bg-transparent">
      <OnboardingScreen onComplete={goToLogin} onSkip={goToLogin} />
    </SafeScreen>
  );
}
