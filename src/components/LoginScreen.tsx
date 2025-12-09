import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();

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

    try {
      if (isSignUp) {
        console.log('Attempting to sign up with email:', email);
        const { error } = await signUp(email, password);
        if (error) {
          console.error('Sign up error:', error);
          setError(error.message);
        } else {
          console.log('✅ Sign up successful');
          setMessage('Account created! Please check your email to verify your account.');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        console.log('Attempting to sign in with email:', email);
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Sign in error:', error);
          setError(error.message);
        } else {
          console.log('✅ Sign in successful');
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
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-aneya-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/aneya-logo.png" alt="aneya" className="h-32 mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-aneya-navy mb-2">
            Clinical Decision Support
          </h1>
          <p className="text-aneya-navy/70">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-aneya-navy/10">
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

            {/* Show Password Checkbox */}
            <div className="flex items-center">
              <input
                id="showPassword"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 text-aneya-teal focus:ring-aneya-teal border-aneya-navy/20 rounded"
                disabled={loading}
              />
              <label htmlFor="showPassword" className="ml-2 block text-sm text-aneya-navy">
                Show password
              </label>
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

          {/* Clinical Disclaimer */}
          <div className="mt-6 pt-6 border-t border-aneya-navy/10">
            <p className="text-xs text-aneya-navy/60 text-center">
              For healthcare professionals only. This system provides clinical decision support and does not replace professional medical judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
