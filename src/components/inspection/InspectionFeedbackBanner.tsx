import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface InspectionFeedbackBannerProps {
  errorMessage: string | null;
  successMessage: string | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

/** Banner phản hồi mutation — success tự ẩn, error giữ tới khi user đóng. */
export function InspectionFeedbackBanner({
  errorMessage,
  successMessage,
  onDismiss,
}: InspectionFeedbackBannerProps) {
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [successMessage, onDismiss]);

  const message = errorMessage ?? successMessage;
  if (!message) return null;

  const isError = Boolean(errorMessage);

  return (
    <View
      className="mb-3 flex-row items-start gap-2.5 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: isError ? '#FEE2E2' : colors.primaryLight }}
    >
      <Ionicons
        name={isError ? 'alert-circle' : 'checkmark-circle'}
        size={17}
        color={isError ? colors.error : colors.primaryDark}
        style={{ marginTop: 1 }}
      />
      <Text
        className="flex-1 text-xs leading-4 font-medium"
        style={{ color: isError ? '#991B1B' : colors.primaryDark }}
      >
        {message}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons
          name="close"
          size={15}
          color={isError ? '#991B1B' : colors.primaryDark}
        />
      </Pressable>
    </View>
  );
}
