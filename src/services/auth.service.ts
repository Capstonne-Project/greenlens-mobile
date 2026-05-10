import { api, apiPublic } from './api';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  GoogleLoginDto,
  RefreshTokenRequestDto,
  RegisterResponse,
  RequestOtpDto,
  RequestOtpResponse,
  ResetPasswordDto,
  ResetPasswordResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@/types/auth.types';
import type { ApiEnvelope } from '@/types/api.types';
import type { AuthSessionPayload, LoginDto, RegisterDto } from '@/types/user.types';

export const authService = {
  /** §7 — không trả JWT; sau đó redirect OTP EmailVerification */
  register: (dto: RegisterDto) =>
    apiPublic.post<ApiEnvelope<RegisterResponse>>('/auth/register', dto),

  login: (dto: LoginDto) => apiPublic.post<ApiEnvelope<AuthSessionPayload>>('/auth/login', dto),

  requestOtp: (dto: RequestOtpDto) =>
    apiPublic.post<ApiEnvelope<RequestOtpResponse>>('/auth/request-otp', dto),

  verifyOtp: (dto: VerifyOtpDto) =>
    apiPublic.post<ApiEnvelope<VerifyOtpResponse>>('/auth/verify-otp', dto),

  forgotPassword: (dto: ForgotPasswordDto) =>
    apiPublic.post<ApiEnvelope<ForgotPasswordResponse>>('/auth/forgot-password', dto),

  resetPassword: (dto: ResetPasswordDto) =>
    apiPublic.post<ApiEnvelope<ResetPasswordResponse>>('/auth/reset-password', dto),

  /** §13 — Bearer */
  changePassword: (dto: ChangePasswordDto) =>
    api.post<ApiEnvelope<{ message?: string }>>('/auth/change-password', dto),

  /** §9 — rotation; chỉ dùng apiPublic để không gắn Bearer cũ */
  refreshToken: (body: RefreshTokenRequestDto) =>
    apiPublic.post<ApiEnvelope<AuthSessionPayload>>('/auth/refresh-token', body),

  googleLogin: (dto: GoogleLoginDto) =>
    apiPublic.post<ApiEnvelope<AuthSessionPayload>>('/auth/google-login', dto),
};
