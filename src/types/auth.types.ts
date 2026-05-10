/** Theo docs/MOBILE_AUTH_INTEGRATION.md — OTP purpose (PascalCase JSON) */
export type OtpPurpose = 'EmailVerification' | 'PasswordReset';

export interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
}

export interface RequestOtpDto {
  email: string;
  purpose: OtpPurpose;
}

export interface RequestOtpResponse {
  message: string;
}

export interface VerifyOtpDto {
  email: string;
  otpCode: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpResponse {
  message: string;
  isVerified: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordDto {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface GoogleLoginDto {
  idToken: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}
