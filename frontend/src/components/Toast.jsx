import { useState, useEffect } from 'react';

/**
 * Toast — a global notification system.
 *
 * Usage: import { useToast, ToastContainer } from './components/Toast.jsx'
 *
 * const { addToast } = useToast();
 * addToast('Vote recorded!', 'success');   // 'success' | 'error' | 'info'
 */

// ─── Internal store (module-level, no context needed) ─────────────────────────
let _listeners = [];
let _toasts = [];
let _nextId = 1;

function notify() {
  _listeners.forEach((fn) => fn([..._toasts]));
}

export function addToast(message, type = 'info', duration = 3500) {
  const id = _nextId++;
  _toasts = [..._toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    notify();
  }, duration);
}

// ─── ToastContainer — renders the toast stack ─────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _listeners.push(setToasts);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
