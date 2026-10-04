import { useState, useMemo } from 'react';
import './AuthModal.css';

export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onLogin,
  onRegister
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync mode if initialMode changes
  useState(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Compute password strength score (0 to 3)
  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (mode === 'register' && (!name || name.trim().length === 0)) {
      setError('Please provide your name.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(name.trim(), email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err.message || `${mode === 'login' ? 'Sign in' : 'Registration'} failed.`);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (!password) return '';
    if (strengthScore === 1) return 'Weak';
    if (strengthScore === 2) return 'Fair';
    if (strengthScore === 3) return 'Strong';
    return '';
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-header-lockup">
            <div className="auth-badge">
              <span>🔐</span> ARENA IDENTITY
            </div>
            <h2 className="auth-modal-title">
              {mode === 'login' ? 'Sign in to LM Arena' : 'Create an Account'}
            </h2>
            <p className="auth-modal-subtitle">
              {mode === 'login'
                ? 'Access your battle logs, persistent metrics, and personal matrix.'
                : 'Join the autonomous LLM evaluation network with persistent identity.'}
            </p>
          </div>

          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs-switcher">
          <button
            type="button"
            className={`auth-switch-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-switch-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-field-group">
              <label className="auth-field-label">Full Name / Alias</label>
              <div className="auth-input-shell">
                <span className="auth-field-icon">👤</span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus={mode === 'register'}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field-group">
            <label className="auth-field-label">Email Address</label>
            <div className="auth-input-shell">
              <span className="auth-field-icon">✉️</span>
              <input
                type="email"
                className="auth-input"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={mode === 'login'}
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label">
              <span>Password</span>
              {mode === 'register' && password && (
                <span style={{ color: strengthScore === 3 ? '#10b981' : strengthScore === 2 ? '#f59e0b' : '#ef4444' }}>
                  {getStrengthLabel()}
                </span>
              )}
            </label>
            <div className="auth-input-shell">
              <span className="auth-field-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength Meter in Register Mode */}
            {mode === 'register' && password.length > 0 && (
              <div className="auth-strength-container">
                <div className="auth-strength-meter">
                  <div className={`strength-segment ${strengthScore >= 1 ? (strengthScore === 1 ? 'active-weak' : strengthScore === 2 ? 'active-fair' : 'active-strong') : ''}`} />
                  <div className={`strength-segment ${strengthScore >= 2 ? (strengthScore === 2 ? 'active-fair' : 'active-strong') : ''}`} />
                  <div className={`strength-segment ${strengthScore >= 3 ? 'active-strong' : ''}`} />
                </div>
                <span className="auth-strength-label">
                  <span>Minimum 4+ characters</span>
                  <span>Uppercase &amp; numbers boost score</span>
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>⏳ Verifying...</span>
            ) : mode === 'login' ? (
              <span>🚀 Sign In &amp; Sync Matrix</span>
            ) : (
              <span>✨ Create Account &amp; Enter Arena</span>
            )}
          </button>

          <p className="auth-guest-notice">
            Or continue as an anonymous session with guest credentials.{' '}
            <button
              type="button"
              className="auth-guest-link"
              onClick={onClose}
            >
              Dismiss
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
