import { useState } from 'react';
import { initR2 } from './r2Service';
import { useToast } from './ToastContext';
import './SettingsModal.css';

const CONFIG_KEY = 'mb_r2_config';

export function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function isCorsError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('cors') ||
    msg.includes('access-control') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    err?.name === 'TypeError'          // fetch CORS failures throw TypeError
  );
}

const CORS_JSON = `[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET","PUT","DELETE","HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]`;

export default function SettingsModal({ onClose, onConfigured }) {
  const toast = useToast();
  const saved = loadSavedConfig() || {};

  const [form, setForm] = useState({
    accountId:       saved.accountId       || '',
    accessKeyId:     saved.accessKeyId     || '',
    secretAccessKey: saved.secretAccessKey || '',
    bucket:          saved.bucket          || '',
  });

  const [saving,     setSaving]     = useState(false);
  const [reveal,     setReveal]     = useState(false);
  const [showCors,   setShowCors]   = useState(false);
  const [corsError,  setCorsError]  = useState(false);
  const [copied,     setCopied]     = useState(false);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    const { accountId, accessKeyId, secretAccessKey, bucket } = form;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      toast('Please fill in all fields.', 'warning');
      return;
    }

    setSaving(true);
    setCorsError(false);

    try {
      // Init the client (pure local operation — no network call)
      initR2(form);

      // Try a lightweight connectivity test (ListObjects with max-keys=1)
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const { getClient, getBucket } = await import('./r2Service');
      await getClient().send(new ListObjectsV2Command({ Bucket: getBucket(), MaxKeys: 1 }));

      // ✅ CORS is fine — save and proceed
      saveConfig(form);
      toast('Connected to Cloudflare R2 ✓', 'success');
      onConfigured(form);
      onClose();

    } catch (err) {
      if (isCorsError(err)) {
        // CORS is blocking — save creds anyway and show the fix guide
        saveConfig(form);
        initR2(form); // keep initialized so upload/download still works via presigned URLs
        setCorsError(true);
        setShowCors(true);
      } else {
        // Real auth / config error
        toast(`Connection error: ${err.message}`, 'error', 7000);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
  }

  function handleContinueAnyway() {
    // Credentials already saved in handleSave above
    toast('R2 credentials saved. Upload & download use presigned URLs — they will work once CORS is configured.', 'info', 6000);
    onConfigured(form);
    onClose();
  }

  async function copyCors() {
    try {
      await navigator.clipboard.writeText(CORS_JSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('CORS policy JSON copied!', 'success', 2500);
    } catch {
      toast('Copy failed — please select and copy manually.', 'warning');
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel glass-card animate-scale-in">
        <div className="modal-header">
          <div className="modal-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
          </div>
          <div>
            <h2 className="modal-title">R2 Configuration</h2>
            <p className="modal-subtitle">Connect your Cloudflare R2 bucket</p>
          </div>
          <button id="settings-close" className="btn btn-icon btn-secondary" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── CORS Error Panel ── */}
        {corsError && (
          <div className="cors-panel">
            <div className="cors-panel-header">
              <span className="cors-panel-icon">🚫</span>
              <div>
                <p className="cors-panel-title">CORS not configured on your R2 bucket</p>
                <p className="cors-panel-sub">Your credentials are saved. You just need to add a CORS policy to your bucket — takes 30 seconds.</p>
              </div>
            </div>

            <div className="cors-steps">
              <p className="cors-steps-title">How to fix:</p>
              <ol className="cors-steps-list">
                <li>Go to <strong>Cloudflare Dashboard</strong> → <strong>R2</strong> → <strong>{form.bucket || 'your-bucket'}</strong></li>
                <li>Click <strong>Settings</strong> tab → scroll to <strong>CORS Policy</strong></li>
                <li>Click <strong>Add CORS policy</strong> and paste the JSON below</li>
                <li>Click <strong>Save</strong>, then come back and click <em>Continue</em></li>
              </ol>
            </div>

            <div className="cors-json-wrap">
              <div className="cors-json-bar">
                <span className="cors-json-label">cors-policy.json</span>
                <button id="cors-copy-btn" className="btn btn-sm btn-secondary cors-copy-btn" onClick={copyCors}>
                  {copied ? '✓ Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="cors-json-code">{CORS_JSON}</pre>
            </div>

            <div className="cors-actions">
              <button id="cors-continue" className="btn btn-primary" onClick={handleContinueAnyway}>
                Continue anyway →
              </button>
              <button id="cors-retry" className="btn btn-secondary" onClick={handleSave}>
                Test again
              </button>
            </div>
          </div>
        )}

        {/* ── Credentials Form ── */}
        {!corsError && (
          <form onSubmit={handleSave} className="modal-form" id="r2-config-form">
            <div className="modal-fields">

              <Field label="Account ID" id="cfg-account-id" hint="Cloudflare Dashboard → R2 → top right">
                <input id="cfg-account-id" className="input-field" type="text"
                  placeholder="abc123def456..."
                  value={form.accountId}
                  onChange={e => update('accountId', e.target.value)}
                  autoComplete="off" spellCheck="false"
                />
              </Field>

              <Field label="Access Key ID" id="cfg-access-key" hint="R2 → Manage API Tokens → Create Token">
                <input id="cfg-access-key" className="input-field" type="text"
                  placeholder="Your R2 Access Key ID"
                  value={form.accessKeyId}
                  onChange={e => update('accessKeyId', e.target.value)}
                  autoComplete="off" spellCheck="false"
                />
              </Field>

              <Field label="Secret Access Key" id="cfg-secret-key">
                <div className="field-pw-wrap">
                  <input id="cfg-secret-key" className="input-field field-pw-input"
                    type={reveal ? 'text' : 'password'}
                    placeholder="Your R2 Secret Access Key"
                    value={form.secretAccessKey}
                    onChange={e => update('secretAccessKey', e.target.value)}
                    autoComplete="off" spellCheck="false"
                  />
                  <button type="button" id="cfg-toggle-secret" className="field-pw-btn"
                    onClick={() => setReveal(r => !r)} aria-label="Toggle secret visibility">
                    {reveal ? '🙈' : '👁'}
                  </button>
                </div>
              </Field>

              <Field label="Bucket Name" id="cfg-bucket">
                <input id="cfg-bucket" className="input-field" type="text"
                  placeholder="my-video-bucket"
                  value={form.bucket}
                  onChange={e => update('bucket', e.target.value)}
                  autoComplete="off" spellCheck="false"
                />
              </Field>
            </div>

            {/* CORS reminder */}
            <div className="modal-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                Your R2 bucket must have a <strong>CORS policy</strong> allowing this origin.{' '}
                <button type="button" id="cors-show-guide" className="link-btn" onClick={() => setShowCors(s => !s)}>
                  {showCors ? 'Hide guide ↑' : 'Show CORS setup guide ↓'}
                </button>
              </span>
            </div>

            {/* Inline CORS guide (collapsible) */}
            {showCors && (
              <div className="cors-inline animate-fade-up">
                <p className="cors-inline-title">📋 CORS Policy to add in Cloudflare R2 → Bucket → Settings</p>
                <div className="cors-json-wrap">
                  <div className="cors-json-bar">
                    <span className="cors-json-label">Paste in R2 → Settings → CORS Policy</span>
                    <button type="button" id="cors-inline-copy" className="btn btn-sm btn-secondary cors-copy-btn" onClick={copyCors}>
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="cors-json-code">{CORS_JSON}</pre>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" id="settings-cancel" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" id="settings-save" className="btn btn-primary" disabled={saving}>
                {saving
                  ? <><span className="animate-spin" style={{display:'inline-block'}}>⏳</span> Testing…</>
                  : 'Save & Connect'
                }
              </button>
            </div>
          </form>
        )}

        {/* Re-enter credentials when in CORS error state */}
        {corsError && (
          <div className="cors-edit-creds">
            <button type="button" id="cors-edit-creds" className="link-btn"
              onClick={() => { setCorsError(false); setShowCors(false); }}>
              ← Edit credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, id, hint, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field-label">
        {label}
        {hint && <span className="form-field-hint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
