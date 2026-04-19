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

export const createReportSchema = z.object({
  title:       z.string().min(5, 'Tiêu đề ít nhất 5 ký tự').max(100),
  description: z.string().min(10, 'Mô tả ít nhất 10 ký tự').max(1000),
  category:    z.enum(['waste', 'water_pollution', 'air_pollution', 'noise', 'other']),
  severity:    z.enum(['low', 'medium', 'high', 'critical']),
});

export type LoginForm        = z.infer<typeof loginSchema>;
export type RegisterForm     = z.infer<typeof registerSchema>;
export type CreateReportForm = z.infer<typeof createReportSchema>;
