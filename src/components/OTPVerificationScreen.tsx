/**
 * OTP Verification Screen
 *
 * Displays a 6-digit OTP input interface for email verification during signup.
 * Features:
 * - 6 separate input boxes with auto-focus and auto-advance
 * - Paste support for 6-digit codes
 * - 10-minute countdown timer
 * - Resend functionality with cooldown
 * - Error and success messages
 */

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { verifyOTP, resendOTP } from '../lib/api';

interface OTPVerificationScreenProps {
  email: string;
  userId: string;
  name?: string;
  role: 'doctor' | 'patient';
  onVerified: () => void;
  onCancel: () => void;
}

export default function OTPVerificationScreen({
  email,
  userId,
  name,
  role,
  onVerified,
  onCancel,
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please request a new code.');
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setError('Verification code has expired. Please request a new code.');
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle single digit input
  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newOtp.every((digit) => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  // Handle paste
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setError('');

      // Focus last input
      inputRefs.current[5]?.focus();

      // Auto-submit
      handleVerify(pastedData);
    } else {
      setError('Please paste a valid 6-digit code');
    }
  };

  // Verify OTP
  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await verifyOTP(userId, otpCode);

      if (response.verified) {
        setSuccess('Email verified successfully! Logging you in...');
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please try again.');
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || resendCount >= 3) {
      return;
    }

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await resendOTP(userId, email);

      setSuccess('New verification code sent to your email!');
      setResendCount(response.resend_count);
      setTimeLeft(response.expires_in_seconds);
      setResendCooldown(60); // 60-second cooldown
      setCanResend(false);

      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-aneya-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-aneya-navy mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We've sent a 6-digit verification code to:
          </p>
          <p className="font-semibold text-aneya-navy mt-1">{email}</p>
        </div>

        {/* OTP Input Boxes */}
        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`
                  w-12 h-14 text-center text-2xl font-bold rounded-lg
                  border-2 transition-colors
                  ${
                    error
                      ? 'border-red-500 focus:border-red-600'
                      : success
                      ? 'border-green-500 focus:border-green-600'
                      : 'border-gray-300 focus:border-aneya-teal'
                  }
                  focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:ring-opacity-50
                `}
                disabled={isVerifying || success !== ''}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center text-sm">
            {timeLeft > 0 ? (
              <p className={`${timeLeft < 60 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                Code expires in {formatTime(timeLeft)}
              </p>
            ) : (
              <p className="text-red-600 font-semibold">Code expired</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={otp.some((d) => !d) || isVerifying || success !== ''}
          className="w-full bg-aneya-teal text-white py-3 rounded-lg font-semibold
                     hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors mb-4"
        >
          {isVerifying ? 'Verifying...' : 'Verify Email'}
        </button>

        {/* Resend Button */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={
              resendCooldown > 0 ||
              resendCount >= 3 ||
              isResending ||
              (!canResend && timeLeft > 0)
            }
            className="text-aneya-teal hover:underline disabled:text-gray-400 disabled:no-underline
                       disabled:cursor-not-allowed text-sm font-medium"
          >
            {isResending
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend code (${resendCooldown}s)`
              : resendCount >= 3
              ? 'Maximum resends reached'
              : 'Resend code'}
          </button>
          {resendCount > 0 && resendCount < 3 && (
            <p className="text-xs text-gray-500 mt-1">
              {3 - resendCount} resend{3 - resendCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full mt-6 text-gray-600 hover:text-gray-800 text-sm"
        >
          Cancel and return to login
        </button>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>
            If you continue to have issues, please contact support or try signing up again.
          </p>
        </div>
      </div>
    </div>
  );
}
