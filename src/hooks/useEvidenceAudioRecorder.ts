import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useState } from 'react';

export interface RecordedAudio {
  uri: string;
  fileName: string;
  mimeType: string;
  durationSeconds: number;
}

/** BE: MaxAudioBytes 10MB. Cắt ở 5 phút để chắc chắn không vượt. */
const MAX_DURATION_SECONDS = 300;

/**
 * Thu âm bằng chứng hiện trường (BR-INS-033, category Audio — tùy chọn).
 * Trả file để upload qua `POST /inspections/{id}/evidence`.
 */
export function useEvidenceAudioRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const durationSeconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const reachedLimit = durationSeconds >= MAX_DURATION_SECONDS;

  const start = useCallback(async () => {
    setRecordingError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setRecordingError('Cần cấp quyền micro để ghi âm bằng chứng.');
        return;
      }
      // Bắt buộc trên iOS để ghi âm khi app đang mở.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setRecordingError('Không thể bắt đầu ghi âm. Vui lòng thử lại.');
    }
  }, [recorder]);

  /** Dừng và trả file thu được (null nếu thất bại). */
  const stop = useCallback(async (): Promise<RecordedAudio | null> => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setRecordingError('Không lưu được bản ghi âm.');
        return null;
      }
      return {
        uri,
        fileName: `audio_evidence.${uri.split('.').pop() ?? 'm4a'}`,
        mimeType: 'audio/m4a',
        durationSeconds,
      };
    } catch {
      setRecordingError('Không thể dừng ghi âm.');
      return null;
    }
  }, [recorder, durationSeconds]);

  return {
    start,
    stop,
    isRecording: state.isRecording,
    durationSeconds,
    reachedLimit,
    maxDurationSeconds: MAX_DURATION_SECONDS,
    recordingError,
    clearRecordingError: useCallback(() => setRecordingError(null), []),
  };
}
