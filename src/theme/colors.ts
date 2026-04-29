export const colors = {
  primary:          '#10B981',
  primaryLight:     '#D1FAE5',
  primaryDark:      '#059669',

  white:            '#FFFFFF',
  background:       '#FFFFFF',
  surface:          '#F7F8FA',
  border:           '#E5E7EB',

  textPrimary:      '#111827',
  textSecondary:    '#6B7280',
  textDisabled:     '#D1D5DB',
  textOnPrimary:    '#FFFFFF',

  success:          '#10B981',
  warning:          '#F59E0B',
  error:            '#EF4444',
  info:             '#3B82F6',

  severityLow:      '#86EFAC',
  severityMedium:   '#FDE047',
  severityHigh:     '#FB923C',
  severityCritical: '#EF4444',
} as const;

export type ColorKey = keyof typeof colors;
