import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WizardFooterProps {
  backLabel?: string;
  nextLabel: string;
  canGoBack: boolean;
  canGoNext: boolean;
  isBusy?: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function WizardFooter({
  backLabel = 'Quay lại',
  nextLabel,
  canGoBack,
  canGoNext,
  isBusy = false,
  onBack,
  onNext,
}: WizardFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-2xl"
          disabled={!canGoBack || isBusy}
          onPress={onBack}
        >
          <Text className="font-semibold text-textPrimary">{backLabel}</Text>
        </Button>
        <Button
          className="h-12 flex-1 rounded-2xl"
          disabled={!canGoNext || isBusy}
          onPress={onNext}
        >
          <Text className="font-semibold text-primary-foreground">
            {isBusy ? 'Đang xử lý...' : nextLabel}
          </Text>
        </Button>
      </View>
    </View>
  );
}

