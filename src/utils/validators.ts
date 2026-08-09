import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên ít nhất 2 ký tự'),
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

/**
 * Khớp `RegisterCommandValidator` phía BE — validate trước để không tốn round-trip
 * và để hiện lỗi ngay khi người dùng rời ô nhập.
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
  .regex(/\d/, 'Cần ít nhất 1 chữ số')
  .regex(/[\W_]/, 'Cần ít nhất 1 ký tự đặc biệt');

export const resetPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otpCode: z.string().length(6, 'Mã OTP gồm 6 chữ số').regex(/^\d+$/, 'Mã OTP chỉ gồm chữ số'),
  newPassword: strongPasswordSchema,
});

/** Trả về lỗi đầu tiên của mật khẩu, hoặc null khi hợp lệ. */
export function validateStrongPassword(password: string): string | null {
  const result = strongPasswordSchema.safeParse(password);
  return result.success ? null : (result.error.issues[0]?.message ?? 'Mật khẩu không hợp lệ');
}

export const createReportSchema = z.object({
  title:       z.string().min(5, 'Tiêu đề ít nhất 5 ký tự').max(100),
  description: z.string().min(10, 'Mô tả ít nhất 10 ký tự').max(1000),
  category:    z.enum(['waste', 'water_pollution', 'air_pollution', 'noise', 'other']),
  severity:    z.enum(['low', 'medium', 'high', 'critical']),
});

export type LoginForm        = z.infer<typeof loginSchema>;
export type RegisterForm     = z.infer<typeof registerSchema>;
export type CreateReportForm = z.infer<typeof createReportSchema>;
