import { Text } from '@/components/ui/text';
import type { AiDetectedBox, AiTrashSubtype } from '@/types/pollution-report.types';
import { Image } from 'expo-image';
import { Image as RNImage, View } from 'react-native';
import { useEffect, useState } from 'react';

interface AiDetectionPreviewProps {
  imageUri: string;
  boxes: AiDetectedBox[];
}

const TRASH_SUBTYPE_LABEL: Record<AiTrashSubtype, string> = {
  CONSTRUCTION: 'Xây dựng',
  ELECTRONIC: 'Điện tử',
  HAZARDOUS: 'Nguy hại',
  HOUSEHOLD: 'Sinh hoạt',
  MEDICAL: 'Y tế',
  ORGANIC: 'Hữu cơ',
  RECYCLABLE: 'Tái chế',
};

// Màu riêng cho từng subtype — đủ tương phản trên nền ảnh, không trùng bg-primary của app.
const SUBTYPE_COLOR: Record<AiTrashSubtype, string> = {
  CONSTRUCTION: '#A16207',
  ELECTRONIC: '#2563EB',
  HAZARDOUS: '#DC2626',
  HOUSEHOLD: '#0D9488',
  MEDICAL: '#DB2777',
  ORGANIC: '#65A30D',
  RECYCLABLE: '#7C3AED',
};
const UNKNOWN_COLOR = '#94A3B8';

function colorForSubtype(subtype: string | null | undefined): string {
  if (subtype && subtype in SUBTYPE_COLOR) return SUBTYPE_COLOR[subtype as AiTrashSubtype];
  return UNKNOWN_COLOR;
}

const PREVIEW_HEIGHT = 220;

/** Ảnh đã phân tích kèm bounding box màu theo subtype (chỉ viền, không nhãn) + legend chú giải màu ↔ loại rác. */
export function AiDetectionPreview({ imageUri, boxes }: AiDetectionPreviewProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled) setNaturalSize({ width, height });
      },
      () => {
        if (!cancelled) setNaturalSize(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const scale =
    naturalSize && containerWidth > 0
      ? Math.min(containerWidth / naturalSize.width, PREVIEW_HEIGHT / naturalSize.height)
      : 0;
  const renderedWidth = naturalSize ? naturalSize.width * scale : 0;
  const offsetX = containerWidth > 0 ? (containerWidth - renderedWidth) / 2 : 0;

  const legendEntries = Array.from(
    new Set(boxes.map((b) => b.subtype).filter((s): s is AiTrashSubtype => Boolean(s))),
  );

  return (
    <View className="gap-2">
      <View
        className="overflow-hidden rounded-2xl bg-surface"
        style={{ height: PREVIEW_HEIGHT }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Image source={{ uri: imageUri }} style={{ flex: 1 }} contentFit="contain" />

        {scale > 0
          ? boxes.map((box, index) => (
              <View
                key={index}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: offsetX + box.x1 * scale,
                  top: box.y1 * scale,
                  width: (box.x2 - box.x1) * scale,
                  height: (box.y2 - box.y1) * scale,
                  borderWidth: 2,
                  borderColor: colorForSubtype(box.subtype),
                  borderRadius: 6,
                }}
              />
            ))
          : null}
      </View>

      {legendEntries.length > 0 ? (
        <View className="flex-row flex-wrap gap-x-3 gap-y-1.5 px-1">
          {legendEntries.map((subtype) => (
            <View key={subtype} className="flex-row items-center gap-1.5">
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  backgroundColor: SUBTYPE_COLOR[subtype],
                }}
              />
              <Text className="text-xs font-medium text-textSecondary">
                {TRASH_SUBTYPE_LABEL[subtype]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
