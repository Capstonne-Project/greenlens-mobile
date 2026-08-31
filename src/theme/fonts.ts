import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_500Medium_Italic,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
} from '@expo-google-fonts/be-vietnam-pro';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';

/**
 * Bộ font "Field Journal" — dùng cho khu Dọn cộng đồng (list + chi tiết chương trình). Ban đầu
 * dùng Fraunces cho tiêu đề/italic nhưng font này thiếu glyph dấu nặng/ngã tổ hợp của tiếng Việt
 * (rớt dấu khi render "Dọn", "cộng"...) — đổi hẳn sang Be Vietnam Pro, font thiết kế riêng cho
 * tiếng Việt, đủ glyph ở mọi trọng lượng kể cả italic.
 */
export const fieldJournalFonts = {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  'BeVietnamPro_500Medium_Italic': BeVietnamPro_500Medium_Italic,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
};

/** Tên family dùng trong style.fontFamily — đặt tên riêng theo vai trò để dễ đổi font sau này. */
export const fonts = {
  display: 'BeVietnamPro_800ExtraBold',
  displayBold: 'BeVietnamPro_700Bold',
  displayBlack: 'BeVietnamPro_900Black',
  displayItalic: 'BeVietnamPro_500Medium_Italic',
  displayRegular: 'BeVietnamPro_400Regular',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
} as const;
