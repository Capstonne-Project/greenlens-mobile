import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type OnboardingPageId = 'protect' | 'impact' | 'action';

export interface OnboardingPageData {
  id: OnboardingPageId;
  title: string;
  subtitle: string;
}

export interface AnimationWrapperProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  className?: string;
}

export interface FloatingIconProps {
  label: string;
  emoji: string;
  delay?: number;
  size?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export interface EarthIllustrationProps {
  variant?: OnboardingPageId;
  size?: number;
}

export interface RotatingEarthProps {
  size: number;
  durationMs?: number;
  spinning?: boolean;
}

export interface OnboardingPaginationProps {
  count: number;
  activeIndex: number;
}

export interface OnboardingPrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface OnboardingCardProps {
  title: string;
  subtitle: string;
  isActive?: boolean;
}

export interface BackgroundGradientProps {
  children: ReactNode;
  className?: string;
}

export interface OnboardingSceneProps {
  isActive: boolean;
  width: number;
  height: number;
}
