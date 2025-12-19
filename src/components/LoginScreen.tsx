import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const [loginMode, setLoginMode] = useState<'doctor' | 'patient'>('doctor');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Doctor-specific signup fields
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');

  // Patient-specific signup fields
  const [patientName, setPatientName] = useState('');

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  // Check for invitation token in URL (for patient invites)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      setLoginMode('patient');
      setIsSignUp(true);
      // Store token for later use
      sessionStorage.setItem('invitationToken', inviteToken);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setGoogleLoading(true);

    try {
      // Pass the role and profile data for new signups (Google will check if user exists)
      const roleToUse = isSignUp ? loginMode : undefined;

      // Build profile data if this is a signup
      let profileData: { name: string; specialty?: string; clinic_name?: string } | { name: string } | undefined = undefined;
      if (isSignUp) {
        if (loginMode === 'doctor') {
          const name = doctorName.trim();
          if (name) {
            profileData = {
              name,
              specialty: specialty.trim() || undefined,
              clinic_name: clinicName.trim() || undefined
            };
          }
        } else {
          const name = patientName.trim();
          if (name) {
            profileData = { name };
          }
        }
      }

      const { error } = await signInWithGoogle(roleToUse, profileData);
      if (error) {
        setError(error.message);
      }
      // If successful, auth state will update automatically (popup flow)
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Validate name fields for signup
    if (isSignUp && loginMode === 'doctor' && !doctorName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (isSignUp && loginMode === 'patient' && !patientName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        console.log('Attempting to sign up with email:', email, 'as', loginMode);

        // Build profile data based on role
        const profileData = loginMode === 'doctor'
          ? { name: doctorName.trim(), specialty: specialty.trim() || undefined, clinic_name: clinicName.trim() || undefined }
          : { name: patientName.trim() };

        const result = await signUp(email, password, loginMode, profileData);
        if (result.error) {
          console.error('Sign up error:', result.error);
          setError(result.error.message);
        } else if (result.session) {
          // Auto-logged in after signup
          console.log('✅ Account created & auto-logged in as', loginMode);
          setMessage(`Account created as ${loginMode}! A verification email has been sent to your inbox.`);
          // User will be redirected automatically by auth state change
        } else {
          // Signup succeeded but no session (shouldn't happen with Firebase)
          console.log('✅ Sign up successful');
          setMessage('Account created! Please check your email to verify your account, then sign in.');
          setIsSignUp(false); // Switch to sign-in mode
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        console.log('Attempting to sign in with email:', email, 'as', loginMode);
        const { error } = await signIn(email, password, loginMode);
        if (error) {
          console.error('Sign in error:', error);
          setError(error.message);
        } else {
          console.log('✅ Sign in successful as', loginMode);
        }
      }
    } catch (err) {
      console.error('Unexpected error during authentication:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    // Clear role-specific fields
    setDoctorName('');
    setSpecialty('');
    setClinicName('');
    setPatientName('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    console.log('🔑 Attempting password reset for:', email);

    try {
      const result = await resetPassword(email);
      console.log('🔑 Password reset result:', result);
      if (result.error) {
        console.error('🔑 Password reset error:', result.error);
        setError(result.error.message);
      } else {
        console.log('🔑 Password reset email sent successfully');
        setMessage('Password reset email sent! Check your inbox and follow the link to reset your password.');
      }
    } catch (err) {
      console.error('🔑 Unexpected error:', err);
      setError('Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const showForgotPasswordForm = () => {
    setIsForgotPassword(true);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const backToSignIn = () => {
    setIsForgotPassword(false);
    setError('');
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-aneya-navy flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/aneya-logo.png" alt="aneya" className="h-32 mx-auto mb-4" />
          <p className="text-white/80">
            {isForgotPassword
              ? 'Reset your password'
              : isSignUp
                ? `Create your ${loginMode} account`
                : `Sign in as ${loginMode}`}
          </p>
        </div>

        {/* Two-Tab Login Mode Selector */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => {
              setLoginMode('doctor');
              setError('');
              setMessage('');
            }}
            className={`flex-1 py-3 text-[15px] font-medium rounded-t-lg transition-colors ${
              loginMode === 'doctor'
                ? 'bg-aneya-teal text-white'
                : 'bg-gray-100 text-aneya-navy/70 hover:bg-gray-200'
            }`}
          >
            Doctor Login
          </button>
          <button
            onClick={() => {
              setLoginMode('patient');
              setError('');
              setMessage('');
            }}
            className={`flex-1 py-3 text-[15px] font-medium rounded-t-lg transition-colors ${
              loginMode === 'patient'
                ? 'bg-aneya-teal text-white'
                : 'bg-gray-100 text-aneya-navy/70 hover:bg-gray-200'
            }`}
          >
            Patient Login
          </button>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg rounded-t-none shadow-lg p-8 border border-aneya-navy/10">
          {isForgotPassword ? (
            /* Forgot Password Form */
            <>
              <p className="text-sm text-aneya-navy/70 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-aneya-navy mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {message && (
                  <div className="bg-aneya-teal/10 border border-aneya-teal text-aneya-navy px-4 py-3 rounded-lg text-sm">
                    {message}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-aneya-teal hover:bg-aneya-teal/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              {/* Back to Sign In */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="text-sm text-aneya-teal hover:text-aneya-teal/80 font-medium transition-colors"
                  disabled={loading}
                >
                  <span className="underline">Back to sign in</span>
                </button>
              </div>
            </>
          ) : (
            /* Regular Sign In / Sign Up Form */
            <>
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {googleLoading ? (
                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-aneya-navy mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-aneya-navy mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                {isSignUp && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-aneya-navy mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Doctor-specific Sign Up Fields */}
                {isSignUp && loginMode === 'doctor' && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-aneya-navy/70 mb-4">Doctor Information</p>
                    </div>
                    <div>
                      <label htmlFor="doctorName" className="block text-sm font-medium text-aneya-navy mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="doctorName"
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                        placeholder="Dr. John Smith"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="specialty" className="block text-sm font-medium text-aneya-navy mb-2">
                        Specialty
                      </label>
                      <input
                        id="specialty"
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                        placeholder="General Practice"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="clinicName" className="block text-sm font-medium text-aneya-navy mb-2">
                        Clinic/Hospital Name
                      </label>
                      <input
                        id="clinicName"
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                        placeholder="City Medical Center"
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                {/* Patient-specific Sign Up Fields */}
                {isSignUp && loginMode === 'patient' && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-aneya-navy/70 mb-4">Patient Information</p>
                    </div>
                    <div>
                      <label htmlFor="patientName" className="block text-sm font-medium text-aneya-navy mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="patientName"
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-4 py-3 border border-aneya-navy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-aneya-teal focus:border-transparent transition-all"
                        placeholder="John Smith"
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                {/* Show Password Checkbox */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="showPassword"
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      style={{ accentColor: '#1d9e99' }}
                      disabled={loading}
                    />
                    <label
                      htmlFor="showPassword"
                      className="ml-2 block text-sm text-aneya-navy cursor-pointer select-none"
                      onClick={() => !loading && setShowPassword(!showPassword)}
                    >
                      Show password
                    </label>
                  </div>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={showForgotPasswordForm}
                      className="text-sm text-aneya-teal hover:text-aneya-teal/80 font-medium transition-colors"
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {message && (
                  <div className="bg-aneya-teal/10 border border-aneya-teal text-aneya-navy px-4 py-3 rounded-lg text-sm">
                    {message}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-aneya-teal hover:bg-aneya-teal/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </form>

              {/* Toggle Sign Up/Sign In */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-aneya-teal hover:text-aneya-teal/80 font-medium transition-colors"
                  disabled={loading}
                >
                  {isSignUp ? (
                    <>Already have an account? <span className="underline">Sign in</span></>
                  ) : (
                    <>Don't have an account? <span className="underline">Sign up</span></>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="mt-6 pt-6 border-t border-aneya-navy/10">
            <p className="text-xs text-aneya-navy/60 text-center">
              {loginMode === 'doctor'
                ? 'For healthcare professionals only. This system provides clinical decision support and does not replace professional medical judgment.'
                : 'Manage your health appointments and connect with your doctors. Always consult your healthcare provider for medical advice.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
