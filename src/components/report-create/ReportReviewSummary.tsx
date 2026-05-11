import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { ReportImageDraft } from '@/types/pollution-report.types';

interface ReportReviewSummaryProps {
  images: ReportImageDraft[];
  address?: string;
  provinceName?: string;
  wardName?: string;
  latitude?: number;
  longitude?: number;
  categoryName?: string;
  capturedAt?: string;
  severityLabel?: string;
  severityAccent?: string;
  description: string;
  tags: string[];
  isAnonymous: boolean;
}

interface FieldRowProps {
  label: string;
  children: ReactNode;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatReportDate(value?: string): { date: string; time: string } | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date: `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

function buildReferenceCode(capturedAt?: string): string {
  if (!capturedAt) {
    return 'DRAFT';
  }

  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) {
    return 'DRAFT';
  }

  const yymmdd = `${date.getFullYear() % 100}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const hhmm = `${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `GL-${yymmdd}-${hhmm}`;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <View className="mt-3 flex-row items-start">
      <Text className="w-[36%] text-[12px] font-semibold uppercase tracking-[1.2px] text-textSecondary">
        {label}
      </Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}

function SectionHeading({ index, label }: { index: string; label: string }) {
  return (
    <View className="mt-6">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-sm font-bold tracking-[1px] text-textPrimary">{index}.</Text>
        <Text className="text-sm font-bold uppercase tracking-[1.6px] text-textPrimary">{label}</Text>
      </View>
      <View className="mt-2 h-px bg-border" />
    </View>
  );
}

export function ReportReviewSummary({
  images,
  address,
  provinceName,
  wardName,
  latitude,
  longitude,
  categoryName,
  capturedAt,
  severityLabel,
  severityAccent,
  description,
  tags,
  isAnonymous,
}: ReportReviewSummaryProps) {
  const recorded = formatReportDate(capturedAt);
  const referenceCode = buildReferenceCode(capturedAt);
  const adminLine = [wardName, provinceName].filter(Boolean).join(', ');
  const coordinateLine =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : undefined;

  return (
    <View className="rounded-2xl bg-white">
      <View className="h-1.5 rounded-t-2xl bg-primary" />

      <View className="px-6 pb-6 pt-6">
        <View className="items-center">
          <Text className="text-[10px] font-semibold uppercase tracking-[2.4px] text-textSecondary">
            GreenLens · Báo cáo môi trường
          </Text>
          <Text className="mt-3 text-center text-[22px] font-bold uppercase tracking-[1.4px] leading-7 text-textPrimary">
            Báo cáo ô nhiễm
          </Text>
          <Text className="mt-1 text-xs italic text-textSecondary">
            Bản xem lại trước khi gửi cơ quan chức năng
          </Text>
        </View>

        <View className="mt-5 flex-row items-center justify-between border-y border-border py-3">
          <View>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-textSecondary">
              Mã sơ bộ
            </Text>
            <Text className="mt-1 text-sm font-bold tracking-[1.2px] text-textPrimary">{referenceCode}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] font-semibold uppercase tracking-[1.4px] text-textSecondary">
              Ngày ghi nhận
            </Text>
            <Text className="mt-1 text-sm font-bold tracking-[0.6px] text-textPrimary">
              {recorded ? `${recorded.date} · ${recorded.time}` : '—'}
            </Text>
          </View>
        </View>

        <SectionHeading index="I" label="Thông tin báo cáo" />
        <FieldRow label="Người báo cáo">
          <Text className="text-[15px] leading-6 text-textPrimary">
            {isAnonymous ? 'Ẩn danh' : 'Có danh (gắn với tài khoản)'}
          </Text>
        </FieldRow>
        <FieldRow label="Loại ô nhiễm">
          <Text className="text-[15px] font-semibold leading-6 text-textPrimary">
            {categoryName ?? 'Chưa chọn'}
          </Text>
        </FieldRow>
        <FieldRow label="Mức độ">
          <View className="flex-row items-center gap-2">
            {severityAccent ? (
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: severityAccent }} />
            ) : null}
            <Text className="text-[15px] leading-6 text-textPrimary">{severityLabel ?? '—'}</Text>
          </View>
        </FieldRow>

        <SectionHeading index="II" label="Địa điểm" />
        <FieldRow label="Địa chỉ">
          <Text className="text-[15px] leading-6 text-textPrimary">
            {address?.trim() || 'Chưa có địa chỉ chi tiết'}
          </Text>
        </FieldRow>
        <FieldRow label="Hành chính">
          <Text className="text-[15px] leading-6 text-textPrimary">{adminLine || '—'}</Text>
        </FieldRow>
        <FieldRow label="Toạ độ">
          <Text className="text-[15px] leading-6 text-textPrimary">{coordinateLine ?? '—'}</Text>
        </FieldRow>

        <SectionHeading index="III" label="Nội dung mô tả" />
        <Text className="mt-3 text-[15px] leading-7 text-textPrimary">
          {description.trim() || 'Không có mô tả thêm.'}
        </Text>
        {tags.length ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <View key={tag} className="rounded-md border border-border bg-surface px-2 py-1">
                <Text className="text-xs font-medium text-textSecondary">#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <SectionHeading index="IV" label="Hình ảnh minh chứng" />
        {images.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingTop: 12 }}
          >
            {images.map((image, index) => (
              <View key={image.localUri} className="overflow-hidden rounded-lg border border-border">
                <Image source={{ uri: image.localUri }} style={{ width: 116, height: 116 }} contentFit="cover" />
                <View className="border-t border-border bg-surface px-2 py-1">
                  <Text className="text-center text-[10px] font-semibold tracking-[1px] text-textSecondary">
                    Hình {index + 1}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text className="mt-3 text-sm italic text-textSecondary">Không có hình ảnh đính kèm.</Text>
        )}

        <View className="mt-7 border-t border-border pt-4">
          <Text className="text-center text-[11px] italic leading-5 text-textSecondary">
            Người báo cáo xác nhận thông tin trên là chính xác và đồng ý gửi đến cơ quan chức năng.
          </Text>
          <Text className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[1.6px] text-textDisabled">
            GreenLens · Trang 1 / 1
          </Text>
        </View>
      </View>
    </View>
  );
}
