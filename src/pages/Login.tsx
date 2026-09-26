import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, AlertCircle } from 'lucide-react';
import {
  signInWithGoogle,
  getSession,
  fetchCurrentProfile,
} from '../services/auth';
import './Login.css';

/// Login screen for the admin dashboard.
/// Only users whose profile.role === 'ADMIN' are allowed to proceed.
export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If the user already has a valid admin session, skip straight in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (!session) {
          if (!cancelled) setChecking(false);
          return;
        }
        const profile = await fetchCurrentProfile();
        if (!cancelled && profile?.role === 'ADMIN') {
          navigate('/dashboard', { replace: true });
        } else if (!cancelled) {
          setError('Access denied. Admin role required.');
          setChecking(false);
        }
      } catch (err) {
        console.error('Login check failed:', err);
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // Supabase OAuth redirects the browser away — control returns
      // to the useEffect above when the page reloads.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="login-root">
        <div className="login-spinner" />
      </div>
    );
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <Shield size={32} color="#fff" strokeWidth={2.2} />
        </div>

        <h1 className="login-title">StreamVanta Admin</h1>
        <p className="login-subtitle">
          Sign in with your admin Google account to continue.
        </p>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="login-button-spinner" />
          ) : (
            <>
              <LogIn size={18} />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="login-footer">
          Access is restricted to accounts with the ADMIN role.
        </p>
      </div>
    </div>
  );
}