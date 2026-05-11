import { View } from 'react-native';

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgressBar({ currentStep, totalSteps }: WizardProgressBarProps) {
  return (
    <View className="flex-row gap-2 px-4 pb-3">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;

        return (
          <View
            key={`step-${step}`}
            className={`h-1.5 flex-1 overflow-hidden rounded-full ${
              isDone || isActive ? 'bg-primary' : 'bg-border'
            }`}
            style={{ opacity: isDone ? 0.45 : 1 }}
          />
        );
      })}
    </View>
  );
}

