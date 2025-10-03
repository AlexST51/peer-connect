import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        if (!formData.email || !formData.username || !formData.password) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || formData.username,
        });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setResetMessage(data.message);
      setResetEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {isLogin ? 'Log in' : 'Sign up'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
              required
              autoComplete="username"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Display Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
                  autoComplete="name"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 text-white py-2.5 rounded font-medium hover:bg-cyan-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        {isLogin && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-gray-500 hover:text-cyan-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
          >
            {isLogin ? 'or sign up' : 'or log in'}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reset Password</h2>
            
            {resetMessage ? (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {resetMessage}
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {!resetMessage && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-white text-gray-900"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                      setResetMessage('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            {resetMessage && (
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetMessage('');
                  setError('');
                }}
                className="w-full px-4 py-2.5 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
