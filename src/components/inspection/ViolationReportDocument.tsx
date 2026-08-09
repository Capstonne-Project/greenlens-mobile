import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { ROMAN_NUMERALS, type ChecklistCategoryState } from '@/utils/inspection-checklist';
import { VIOLATION_REPORT_SECTIONS, type ViolationReportValues } from '@/utils/violation-report-template';

/** Đỏ dùng riêng cho số La Mã — không phải màu hệ thống, chỉ là dấu hiệu thị giác của biên bản. */
const NUMERAL_COLOR = '#DC2626';

interface ViolatorInfo {
  name?: string | null;
  address?: string | null;
  /** CCCD/CMND hoặc mã số thuế — BE gộp chung 1 field `violatorIdentity`. */
  identity?: string | null;
}

interface ViolationReportDocumentProps {
  reportCode: string;
  /** Thời điểm chốt biên bản — ISO string. */
  submittedAt: string;
  /** Đội/người lập biên bản — BE chỉ trả tên đội, không có tên người lập riêng. */
  preparedByName?: string | null;
  violator: ViolatorInfo;
  sections: ViolationReportValues;
  /** Ảnh/Video/Ghi âm/Tài liệu — đính kèm như phần bằng chứng của biên bản. */
  evidenceStates: ChecklistCategoryState[];
}

/** Một dòng dữ kiện dạng bảng — nhãn xám nhạt phía trên, giá trị đậm phía dưới. */
function FactRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View
      className="py-3"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
    >
      <Text className="text-xs text-textSecondary">{label}</Text>
      <Text className="mt-1 text-sm font-bold text-textPrimary">{value}</Text>
    </View>
  );
}

/** Một mục nội dung đánh số La Mã — số đỏ cột trái, tiêu đề in hoa + nội dung bên phải. */
function NumberedSection({ numeral, title, children }: { numeral: string; title: string; children: React.ReactNode }) {
  return (
    <View
      className="flex-row gap-3 py-4"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Text className="w-6 text-sm font-extrabold" style={{ color: NUMERAL_COLOR }}>
        {numeral}
      </Text>
      <View className="flex-1">
        <Text className="text-xs font-extrabold uppercase tracking-wide text-textPrimary">{title}</Text>
        {children}
      </View>
    </View>
  );
}

/** Biên bản ghi nhận hiện trường — trình bày như văn bản chính thức khi checklist đã chốt. */
export function ViolationReportDocument({
  reportCode,
  submittedAt,
  preparedByName,
  violator,
  sections,
  evidenceStates,
}: ViolationReportDocumentProps) {
  const filledSections = VIOLATION_REPORT_SECTIONS.filter((section) => sections[section.key]?.trim());
  const numeralOffset = filledSections.length;
  const submittedDate = new Date(submittedAt);
  const hasViolatorInfo = Boolean(
    violator.name?.trim() || violator.address?.trim() || violator.identity?.trim(),
  );

  return (
    <View className="rounded-3xl bg-white p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
      <Text className="text-right text-sm text-textSecondary">
        Ngày {submittedDate.getDate()} tháng {submittedDate.getMonth() + 1} năm {submittedDate.getFullYear()}
      </Text>

      <View className="mt-4 border-b pb-4" style={{ borderBottomColor: colors.border }}>
        <Text className="text-center text-xl font-extrabold uppercase tracking-wide text-textPrimary">
          Biên bản ghi nhận hiện trường
        </Text>
        <Text className="mt-2 text-center text-sm italic text-textSecondary">Số hồ sơ: {reportCode}</Text>
      </View>

      {hasViolatorInfo ? (
        <View className="mt-5">
          <Text className="mb-1 text-xs font-extrabold uppercase tracking-wide text-textPrimary">
            Đối tượng vi phạm
          </Text>
          <FactRow label="Họ tên / Tên cơ sở" value={violator.name?.trim() || '—'} />
          <FactRow label="Địa chỉ" value={violator.address?.trim() || '—'} />
          <FactRow label="CCCD / Mã số thuế" value={violator.identity?.trim() || '—'} isLast />
        </View>
      ) : null}

      <View className="mt-4">
        {filledSections.length > 0 ? (
          VIOLATION_REPORT_SECTIONS.filter((section) => sections[section.key]?.trim()).map(
            (section, index) => (
              <NumberedSection
                key={section.key}
                numeral={ROMAN_NUMERALS[index] ?? String(index + 1)}
                title={section.label}
              >
                <Text className="mt-1.5 text-sm leading-5 text-textPrimary">
                  {sections[section.key].trim()}
                </Text>
              </NumberedSection>
            ),
          )
        ) : (
          <Text className="py-3 text-sm italic text-textSecondary">Chưa có nội dung ghi nhận.</Text>
        )}
      </View>

      {evidenceStates.length > 0 ? (
        <View className="mt-5">
          <Text className="mb-1 text-xs font-extrabold uppercase tracking-wide text-textPrimary">
            Bằng chứng đính kèm
          </Text>
          {evidenceStates.map((state, index) => {
            const numeral = ROMAN_NUMERALS[numeralOffset + index] ?? String(numeralOffset + index + 1);
            const isImageCategory = state.category === 'ScenePhoto';
            return (
              <NumberedSection key={state.category} numeral={numeral} title={state.label}>
                {state.note?.trim() ? (
                  <Text className="mt-1.5 text-sm leading-5 text-textPrimary">{state.note.trim()}</Text>
                ) : null}
                {state.files.length > 0 ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {state.files.map((file, fileIndex) =>
                      isImageCategory ? (
                        <View key={file.id}>
                          <Image
                            source={{ uri: file.mediaUrl! }}
                            className="rounded-xl bg-surface"
                            style={{ width: 88, height: 88 }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                          <Text className="mt-1 text-[11px] text-textSecondary">
                            {state.label} {fileIndex + 1}
                          </Text>
                        </View>
                      ) : (
                        <View
                          key={file.id}
                          className="w-full flex-row items-center gap-2 rounded-xl px-3 py-2.5"
                          style={{ borderWidth: 1, borderColor: colors.border }}
                        >
                          <Ionicons name={state.icon} size={16} color={NUMERAL_COLOR} />
                          <Text className="flex-1 text-xs text-textPrimary" numberOfLines={1}>
                            {file.description?.trim() || `${state.label} ${fileIndex + 1}`}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                ) : (
                  <Text className="mt-1 text-xs italic text-textSecondary">Không có tệp đính kèm.</Text>
                )}
              </NumberedSection>
            );
          })}
        </View>
      ) : null}

      <View className="mt-6 flex-row justify-between">
        <View style={{ width: '46%' }}>
          <Text className="text-xs font-extrabold uppercase tracking-wide text-textPrimary">
            Người lập biên bản
          </Text>
          <Text className="mt-0.5 text-xs italic text-textSecondary">(Ký, ghi rõ họ tên)</Text>
        </View>
        <View style={{ width: '46%' }}>
          <Text className="text-xs font-extrabold uppercase tracking-wide text-textPrimary">
            Đối tượng vi phạm
          </Text>
          <Text className="mt-0.5 text-xs italic text-textSecondary">(Ký, ghi rõ họ tên)</Text>
        </View>
      </View>

      {preparedByName?.trim() ? (
        <View className="mt-8 flex-row justify-between">
          <View style={{ width: '46%', borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text className="mt-2 text-sm text-textPrimary">{preparedByName.trim()}</Text>
          </View>
          <View style={{ width: '46%', borderTopWidth: 1, borderTopColor: colors.border }} />
        </View>
      ) : (
        <View className="mt-8 flex-row justify-between">
          <View style={{ width: '46%', borderTopWidth: 1, borderTopColor: colors.border }} />
          <View style={{ width: '46%', borderTopWidth: 1, borderTopColor: colors.border }} />
        </View>
      )}
    </View>
  );
}
