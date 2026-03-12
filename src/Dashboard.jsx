import { useState, useCallback } from 'react';
import UploadPanel from './UploadPanel';
import VideoLibrary from './VideoLibrary';
import SettingsModal from './SettingsModal';
import { isInitialized } from './r2Service';
import { useToast } from './ToastContext';
import './Dashboard.css';

const TABS = [
  { id: 'library', label: 'Library',  icon: GridIcon  },
  { id: 'upload',  label: 'Upload',   icon: UploadIcon },
];

export default function Dashboard({ onLogout }) {
  const toast = useToast();
  const [tab, setTab]       = useState(isInitialized() ? 'library' : 'upload');
  const [showSettings, setShowSettings] = useState(!isInitialized());
  const [refreshKey,  setRefreshKey]    = useState(0);

  const onUploaded   = useCallback(() => { setRefreshKey(k => k + 1); setTab('library'); }, []);
  const onConfigured = useCallback(() => { setRefreshKey(k => k + 1); }, []);

  const configured = isInitialized();

  return (
    <div className="dash-root app-wrapper">
      <div className="bg-mesh" />

      {/* ── Navbar ── */}
      <header className="dash-nav">
        <div className="dash-nav-inner">
          {/* Brand */}
          <div className="dash-brand">
            <div className="dash-brand-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3l4-4 4 4-4 4-4-4z"
                      fill="url(#nb-lg)"/>
                <defs>
                  <linearGradient id="nb-lg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a5b4fc"/>
                    <stop offset="1" stopColor="#60a5fa"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="dash-brand-name">Media<span className="text-gradient">Bucket</span></span>
          </div>

          {/* Status indicator */}
          <div className="dash-status">
            <span className={`status-pill ${configured ? 'status-pill--on' : 'status-pill--off'}`}>
              <span className="status-pill-dot" />
              {configured ? 'R2 Connected' : 'Not configured'}
            </span>
          </div>

          {/* Nav actions */}
          <div className="dash-nav-actions">
            <button id="nav-settings" className="btn btn-secondary btn-sm" onClick={() => setShowSettings(true)}>
              <SettingsIcon size={14} />
              {configured ? 'Settings' : 'Connect R2'}
            </button>
            <button id="nav-logout" className="btn btn-secondary btn-sm" onClick={onLogout}>
              <LogoutIcon size={14} />
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="dash-main">
        <div className="dash-container">

          {/* Hero / Title */}
          <div className="dash-hero animate-fade-up">
            <h1 className="dash-hero-title">Your Video Storage</h1>
            <p className="dash-hero-sub">
              Powered by <strong>Cloudflare R2</strong> · Zero egress fees · Global edge delivery
            </p>
          </div>

          {/* Not configured banner */}
          {!configured && (
            <div className="dash-notice animate-fade-up">
              <div className="dash-notice-icon">⚙️</div>
              <div className="dash-notice-text">
                <strong>Connect your R2 bucket to get started.</strong>
                <span> Add your Cloudflare credentials above. Your credentials stay local to this browser.</span>
              </div>
              <button id="dash-connect-cta" className="btn btn-primary btn-sm" onClick={() => setShowSettings(true)}>
                Connect now
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="dash-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={tab === t.id}
                className={`dash-tab ${tab === t.id ? 'dash-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="dash-panel" role="tabpanel">
            {tab === 'library' ? (
              configured
                ? <VideoLibrary refreshKey={refreshKey} />
                : <div className="dash-panel-placeholder">
                    <p>Connect your R2 bucket to view your videos.</p>
                    <button id="panel-connect" className="btn btn-primary" onClick={() => setShowSettings(true)}>
                      Connect R2
                    </button>
                  </div>
            ) : (
              configured
                ? <UploadPanel onUploaded={onUploaded} />
                : <div className="dash-panel-placeholder">
                    <p>Connect your R2 bucket to start uploading.</p>
                    <button id="panel-connect-upload" className="btn btn-primary" onClick={() => setShowSettings(true)}>
                      Connect R2
                    </button>
                  </div>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onConfigured={onConfigured}
        />
      )}
    </div>
  );
}

// ── Icon components ──
function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function UploadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

function SettingsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
}

function LogoutIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
