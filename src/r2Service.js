// r2Service.js
// All R2 operations are proxied through /api/r2 (Vercel serverless function).
// The browser never calls Cloudflare R2 directly → no CORS issues.
// Presigned PUT URLs (uploads) still go directly to R2, but CORS on the
// bucket is set automatically by the ensure-cors action on startup.

let _config = null;   // stored for UI display only (Settings modal)

export function initR2(config) {
  _config = config;
}

export function isInitialized() {
  return !!_config;
}

export function getStoredConfig() {
  return _config;
}

// ── API helper ───────────────────────────────────────────────────────────
async function api(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`/api/r2?${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

// ── Public API ───────────────────────────────────────────────────────────

/** Set CORS on the R2 bucket via the server-side proxy. */
export async function ensureCors() {
  try {
    await api('ensure-cors');
    console.log('[MediaBucket] R2 CORS ensured ✓');
  } catch (err) {
    console.warn('[MediaBucket] ensure-cors (non-fatal):', err.message);
  }
}

/** List all video objects in the bucket. */
export async function listVideos() {
  const { items } = await api('list');
  return items;
}

/** Get a presigned download URL for a key. */
export async function getDownloadUrl(key) {
  const { url } = await api('presign-get', { key });
  return url;
}

/** Upload a video via presigned PUT URL with progress reporting. */
export async function uploadVideo(file, onProgress) {
  // Get a presigned PUT URL from the server
  const { url } = await api('presign-put', {
    key:  file.name,
    type: file.type || 'application/octet-stream',
  });

  // Upload directly to R2 using the presigned URL (XHR for progress)
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload  = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });

  return file.name;
}

/** Delete an object from the bucket. */
export async function deleteVideo(key) {
  await api('delete', { key });
}

// ── Utilities ─────────────────────────────────────────────────────────────

export function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
