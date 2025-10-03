import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('Invalid reset link');
      setVerifying(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/password-reset/verify/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired reset link');
      }

      setTokenValid(true);
      setUsername(data.username);
    } catch (err) {
      setError(err.message);
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/password-reset/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Reset Link</h1>
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error || 'This password reset link is invalid or has expired.'}
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2.5 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful!</h1>
            <p className="text-gray-600">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-600 mb-6">
          Enter a new password for <strong>{username}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 text-white py-2.5 rounded font-medium hover:bg-cyan-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-cyan-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
