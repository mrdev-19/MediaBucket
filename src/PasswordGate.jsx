import { useState, useEffect } from 'react';
import './PasswordGate.css';

const CORRECT_PASSWORD = 'Winter';
const SESSION_KEY = 'mb_auth';

export default function PasswordGate({ onUnlocked }) {
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [shake,    setShake]    = useState(false);

  // Persist session
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') onUnlocked();
  }, [onUnlocked]);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        onUnlocked();
      } else {
        setError('Incorrect password. Please try again.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPassword('');
      }
      setLoading(false);
    }, 600);
  }

  return (
    <div className="pg-root">
      <div className="bg-mesh" />

      {/* Floating particles */}
      <div className="pg-particles" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`pg-particle pg-particle--${i + 1}`} />
        ))}
      </div>

      <div className={`pg-card glass-card animate-scale-in ${shake ? 'pg-shake' : ''}`}>
        {/* Logo mark */}
        <div className="pg-logo-wrap">
          <div className="pg-logo-ring">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3l4-4 4 4-4 4-4-4z"
                    fill="url(#lg)" stroke="none"/>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a5b4fc"/>
                  <stop offset="1" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="pg-header">
          <h1 className="pg-title">
            Media<span className="text-gradient">Bucket</span>
          </h1>
          <p className="pg-subtitle">Secure video storage · Powered by Cloudflare R2</p>
        </div>

        <form onSubmit={handleSubmit} className="pg-form" id="pw-form" aria-label="Password login form">
          <div className="pg-input-wrap">
            <label htmlFor="pg-pw" className="pg-label">Access Password</label>
            <div className="pg-input-inner">
              <svg className="pg-input-icon" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="pg-pw"
                type={showPw ? 'text' : 'password'}
                className="input-field pg-input"
                placeholder="Enter password…"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                id="pg-toggle-pw"
                className="pg-pw-toggle"
                onClick={() => setShowPw(p => !p)}
                tabIndex={0}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            {error && <p className="pg-error" role="alert">{error}</p>}
          </div>

          <button
            type="submit"
            id="pg-submit"
            className="btn btn-primary btn-lg pg-submit"
            disabled={!password || loading}
          >
            {loading
              ? <><span className="animate-spin">⏳</span> Verifying…</>
              : <>Unlock Access <span className="pg-arrow">→</span></>
            }
          </button>
        </form>

        <p className="pg-footer">Protected media storage · Session expires on close</p>
      </div>
    </div>
  );
}
