import { useState, useCallback } from 'react';
import { ToastProvider } from './ToastContext';
import PasswordGate from './PasswordGate';
import Dashboard    from './Dashboard';
import { loadSavedConfig, saveConfig } from './SettingsModal';
import { initR2, ensureCors } from './r2Service';


// ── Bootstrap R2 credentials ──────────────────────────────────────────
// Priority: 1) .env variables  2) localStorage from Settings modal
const envConfig = {
  accountId:       import.meta.env.VITE_R2_ACCOUNT_ID,
  accessKeyId:     import.meta.env.VITE_R2_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  bucket:          import.meta.env.VITE_R2_BUCKET,
};

const hasEnvConfig = Object.values(envConfig).every(Boolean);

if (hasEnvConfig) {
  // Env vars present — use them and keep localStorage in sync so the
  // Settings modal shows the current values.
  try {
    initR2(envConfig);
    saveConfig(envConfig);          // mirrors to localStorage for modal display
    ensureCors();                   // set CORS on R2 bucket via Vercel serverless fn
  } catch (_) { /* ignore */ }
} else {
  // Fall back to manually saved config from the Settings modal
  const saved = loadSavedConfig();
  if (saved) {
    try {
      initR2(saved);
      ensureCors();                 // set CORS on R2 bucket via Vercel serverless fn
    } catch (_) { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(false);

  const handleUnlocked = useCallback(() => setAuthed(true), []);
  const handleLogout   = useCallback(() => {
    sessionStorage.removeItem('mb_auth');
    setAuthed(false);
  }, []);

  return (
    <ToastProvider>
      {authed
        ? <Dashboard onLogout={handleLogout} />
        : <PasswordGate onUnlocked={handleUnlocked} />
      }
    </ToastProvider>
  );
}
