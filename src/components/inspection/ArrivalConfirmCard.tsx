import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { ARRIVAL_DISTANCE_THRESHOLD_M } from '@/types/inspection.types';

interface ArrivalConfirmCardProps {
  /** Khoảng cách tới hiện trường (m) — null khi chưa lấy được GPS. */
  distanceMeters: number | null;
  /** false khi không có toạ độ nào để gửi — BE yêu cầu lat/lng bắt buộc. */
  hasCoords: boolean;
  isLocating: boolean;
  locationError: string | null;
  note: string;
  onChangeNote: (value: string) => void;
  /** Cuộn màn hình cha để ô ghi chú không bị bàn phím che — tùy chọn. */
  onFocusNote?: TextInputProps['onFocus'];
  onRetryLocation: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

/**
 * GPS mềm (BR-INS-033): ≤200m thì note tùy chọn, >200m bắt buộc giải trình.
 * Không chặn xác nhận khi lệch xa — chỉ yêu cầu lý do.
 */
export function ArrivalConfirmCard({
  distanceMeters,
  hasCoords,
  isLocating,
  locationError,
  note,
  onChangeNote,
  onFocusNote,
  onRetryLocation,
  onConfirm,
  submitting,
}: ArrivalConfirmCardProps) {
  const isFar = distanceMeters !== null && distanceMeters > ARRIVAL_DISTANCE_THRESHOLD_M;
  const noteRequired = isFar || distanceMeters === null;
  const noteMissing = noteRequired && note.trim().length === 0;
  const canConfirm = !submitting && !isLocating && !noteMissing && hasCoords;

  return (
    <View>
      <View
        className="mb-3 flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3.5"
        style={{ backgroundColor: isFar ? '#FEF3C7' : colors.surface }}
      >
        <Ionicons
          name={isLocating ? 'navigate-outline' : isFar ? 'warning-outline' : 'navigate'}
          size={18}
          color={isFar ? colors.warning : colors.primary}
          style={{ marginTop: 1 }}
        />
        <View className="flex-1">
          {isLocating ? (
            <Text className="text-sm text-textSecondary">Đang xác định vị trí…</Text>
          ) : locationError ? (
            <>
              <Text className="text-sm font-semibold text-textPrimary">
                Không lấy được vị trí
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-textSecondary">
                {locationError} Bạn vẫn có thể xác nhận kèm lý do giải trình.
              </Text>
              <Pressable onPress={onRetryLocation} hitSlop={6} className="mt-1.5">
                <Text className="text-xs font-bold text-primary">Thử lấy vị trí lại</Text>
              </Pressable>
            </>
          ) : distanceMeters === null ? (
            <Text className="text-sm text-textSecondary">
              Hồ sơ không có toạ độ hiện trường — cần nhập lý do giải trình.
            </Text>
          ) : (
            <>
              <Text className="text-sm font-bold text-textPrimary">
                Cách hiện trường khoảng {Math.round(distanceMeters).toLocaleString('vi-VN')}m
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-textSecondary">
                {isFar
                  ? `Vượt ${ARRIVAL_DISTANCE_THRESHOLD_M}m — bắt buộc nhập lý do giải trình.`
                  : 'Trong phạm vi cho phép. Ghi chú là tùy chọn.'}
              </Text>
            </>
          )}
        </View>
      </View>

      <TextInput
        value={note}
        onChangeText={onChangeNote}
        onFocus={onFocusNote}
        multiline
        placeholder={noteRequired ? 'Lý do giải trình (bắt buộc)' : 'Ghi chú (tùy chọn)'}
        placeholderTextColor={colors.textSecondary}
        className="mb-3 min-h-[72px] rounded-2xl bg-surface px-3.5 py-3 text-sm text-textPrimary"
        textAlignVertical="top"
      />

      <Pressable
        accessibilityRole="button"
        disabled={!canConfirm}
        onPress={onConfirm}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{ backgroundColor: canConfirm ? colors.primary : colors.textDisabled }}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
        )}
        <Text className="text-sm font-bold text-white">Xác nhận đã đến hiện trường</Text>
      </Pressable>

      {!hasCoords && !isLocating ? (
        <Text className="mt-2 text-xs" style={{ color: colors.warning }}>
          Cần cấp quyền vị trí để xác nhận — hồ sơ không có toạ độ hiện trường thay thế.
        </Text>
      ) : noteMissing && !isLocating ? (
        <Text className="mt-2 text-xs" style={{ color: colors.warning }}>
          Cần nhập lý do giải trình để tiếp tục.
        </Text>
      ) : null}
    </View>
  );
}
