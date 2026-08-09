import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface CompressedVideo {
  uri: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
  durationSeconds?: number;
  /** false khi chạy Expo Go hoặc nén thất bại — caller nên cảnh báo dung lượng. */
  compressed: boolean;
}

export interface CompressVideoOptions {
  baseName?: string;
  /** Cạnh dài tối đa (px). 720 đủ đọc biển số / nhận diện hiện trường. */
  maxSize?: number;
  onProgress?: (percent: number) => void;
}

/** 720p ~ vài MB cho clip 30–60s — đủ làm bằng chứng, upload được trên 4G yếu. */
const DEFAULT_MAX_SIZE = 720;

/**
 * react-native-compressor là native module → không tồn tại trong Expo Go.
 * Kiểm tra runtime thay vì try/catch import để thông báo cho người dùng rõ ràng.
 */
export const isVideoCompressionAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Nén video trước khi upload R2. Chạy trên cả iOS và Android.
 *
 * Trong Expo Go trả về file gốc kèm `compressed: false` — luồng upload vẫn chạy
 * (không chặn dev), nhưng caller biết để cảnh báo nếu file quá lớn.
 */
export async function compressVideoForUpload(
  uri: string,
  options: CompressVideoOptions = {},
): Promise<CompressedVideo> {
  const { baseName = 'video', maxSize = DEFAULT_MAX_SIZE, onProgress } = options;
  const fileName = `${baseName}_${Date.now()}.mp4`;

  if (!isVideoCompressionAvailable) {
    if (__DEV__) {
      console.log('[compressVideo] skipped — Expo Go không hỗ trợ native compressor');
    }
    return { uri, mimeType: 'video/mp4', fileName, compressed: false };
  }

  try {
    const { Video, getVideoMetaData } = await import('react-native-compressor');

    const compressedUri = await Video.compress(
      uri,
      {
        compressionMethod: 'auto',
        maxSize,
        // Bỏ qua clip đã nhỏ sẵn — nén lại chỉ tốn thời gian và giảm chất lượng.
        minimumFileSizeForCompress: 2,
        progressDivider: 5,
      },
      (progress) => onProgress?.(Math.round(progress * 100)),
    );

    let sizeBytes: number | undefined;
    let durationSeconds: number | undefined;
    try {
      const meta = await getVideoMetaData(compressedUri);
      sizeBytes = meta.size;
      durationSeconds = Math.max(1, Math.round(meta.duration));
    } catch {
      // Metadata là bonus — thiếu cũng không chặn upload.
    }

    if (__DEV__) {
      console.log('[compressVideo]', { maxSize, sizeBytes, durationSeconds });
    }

    return {
      uri: compressedUri,
      mimeType: 'video/mp4',
      fileName,
      sizeBytes,
      durationSeconds,
      compressed: true,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[compressVideo] failed, dùng file gốc', error);
    }
    return { uri, mimeType: 'video/mp4', fileName, compressed: false };
  }
}
