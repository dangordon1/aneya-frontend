/**
 * API Client for OTP Email Verification
 * Type-safe wrappers for authentication endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SendOTPResponse {
  success: boolean;
  message: string;
  expires_in_seconds: number;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  verified: boolean;
}

export interface ResendOTPResponse {
  success: boolean;
  message: string;
  expires_in_seconds: number;
  resend_count: number;
}

/**
 * Send OTP verification code to user's email
 */
export async function sendOTP(
  email: string,
  userId: string,
  name: string | undefined,
  role: 'doctor' | 'patient'
): Promise<SendOTPResponse> {
  const response = await fetch(`${API_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      user_id: userId,
      name,
      role,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send OTP' }));
    throw new Error(error.detail || 'Failed to send verification code');
  }

  return response.json();
}

/**
 * Verify OTP code entered by user
 */
export async function verifyOTP(
  userId: string,
  otp: string
): Promise<VerifyOTPResponse> {
  const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      otp,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Invalid verification code' }));
    throw new Error(error.detail || 'Verification failed');
  }

  return response.json();
}

/**
 * Resend OTP verification code
 */
export async function resendOTP(
  userId: string,
  email: string
): Promise<ResendOTPResponse> {
  const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      email,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to resend OTP' }));
    throw new Error(error.detail || 'Failed to resend verification code');
  }

  return response.json();
}
