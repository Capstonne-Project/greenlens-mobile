import type { OnboardingPageData } from './types';

/** Onboarding-only palette (gradients need hex; do not hardcode in className). */
export const onboardingColors = {
  primary: '#22C55E',
  secondary: '#3B82F6',
  background: '#F6FFF8',
  accent: '#84CC16',
  text: '#111827',
  subtitle: '#6B7280',
  white: '#FFFFFF',
  ocean: '#38BDF8',
  deepOcean: '#0EA5E9',
  land: '#16A34A',
  landLight: '#4ADE80',
  cloud: 'rgba(255,255,255,0.92)',
  glass: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glow: 'rgba(34,197,94,0.18)',
  softBlue: 'rgba(59,130,246,0.12)',
  softLime: 'rgba(132,204,22,0.16)',
} as const;

export const ONBOARDING_PAGES: OnboardingPageData[] = [
  {
    id: 'protect',
    title: 'Protect Our Planet',
    subtitle: 'Small sustainable actions today create a healthier Earth for tomorrow.',
  },
  {
    id: 'impact',
    title: 'Track Your Eco Impact',
    subtitle: 'Monitor your habits, reduce waste, and measure your positive environmental impact.',
  },
  {
    id: 'action',
    title: 'Every Action Matters',
    subtitle: 'Join thousands of people making the world greener every day.',
  },
];

export const ECO_ICONS = [
  { id: 'recycle', emoji: '♻️', label: 'Recycling', angle: -110 },
  { id: 'plant', emoji: '🌱', label: 'Plants', angle: -35 },
  { id: 'water', emoji: '💧', label: 'Water', angle: 25 },
  { id: 'solar', emoji: '☀️', label: 'Solar', angle: 95 },
  { id: 'stats', emoji: '📊', label: 'Statistics', angle: 155 },
] as const;

/** TODO: Replace View-based Earth placeholders with branded illustration assets when ready. */
export const ILLUSTRATION_ASSET_TODO =
  'TODO: Drop final Earth / nature illustrations into assets/images/onboarding/ and wire via expo-image.';

/**
 * Real Earth textures (local):
 * - earth-day-map.jpg — Blue Marble style (via three-globe example pack)
 * - earth-clouds.png — cloud overlay (three.js planet textures)
 * - earth-water.png / earth-topology.jpg — optional overlays
 */
export const EARTH_ASSETS = {
  dayMap: require('../../../assets/images/onboarding/earth-day-map.jpg'),
  clouds: require('../../../assets/images/onboarding/earth-clouds.png'),
} as const;
