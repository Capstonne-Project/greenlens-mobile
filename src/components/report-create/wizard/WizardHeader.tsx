import { TapScale } from "@/components/layout/TapScale";
import { WizardProgressBar } from "@/components/report-create/wizard/WizardProgressBar";
import { Text } from "@/components/ui/text";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface WizardHeaderProps {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  onClose: () => void;
}

export function WizardHeader({ title, subtitle, step, totalSteps, onClose }: WizardHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <TapScale onPress={onClose}>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </View>
        </TapScale>

        <View className="flex-1 px-3">
          <Text className="text-center text-base font-bold text-textPrimary">{title}</Text>
          {subtitle ? <Text className="mt-0.5 text-center text-xs text-textSecondary">{subtitle}</Text> : null}
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-bold text-primary">
            {step}/{totalSteps}
          </Text>
        </View>
      </View>
      <WizardProgressBar currentStep={step} totalSteps={totalSteps} />
    </View>
  );
}
