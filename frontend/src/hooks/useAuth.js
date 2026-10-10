import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser, registerUser, logoutUser, ensureAuth } from '../api.js';
import { addToast } from '../components/Toast.jsx';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Load authenticated profile on startup
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err) {
      console.warn('Silent auth check fallback:', err.message);
      // Ensure guest account if token is invalid or missing
      try {
        await ensureAuth(true);
        const guestProfile = await getCurrentUser();
        setUser(guestProfile);
      } catch (e) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    try {
      const data = await loginUser({ email, password });
      setUser({ ...data.user, isGuest: false });
      setIsAuthModalOpen(false);
      addToast(`Welcome back, ${data.user.name || 'Evaluator'}!`, 'success');
      return data;
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    try {
      const data = await registerUser({ name, email, password });
      setUser({ ...data.user, isGuest: false });
      setIsAuthModalOpen(false);
      addToast(`Account created! Welcome to AI Judge, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
      addToast('Logged out of your session', 'info');
      // Create fresh guest session so app continues to function seamlessly
      await ensureAuth(true);
      const guestProfile = await getCurrentUser();
      setUser(guestProfile);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return {
    user,
    isGuest: !user || user.isGuest || user.email?.endsWith('@arena.local'),
    loading,
    isAuthModalOpen,
    authMode,
    setAuthMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    refreshUser: checkAuth
  };
}
