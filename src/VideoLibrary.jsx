import { useState, useEffect, useCallback } from 'react';
import { listVideos, getDownloadUrl, deleteVideo, formatBytes, formatDate } from './r2Service';
import { useToast } from './ToastContext';
import './VideoLibrary.css';

const PAGE_SIZE = 20;

export default function VideoLibrary({ refreshKey }) {
  const toast = useToast();

  const [videos,   setVideos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('date-desc');
  const [page,     setPage]     = useState(1);
  const [downloading, setDownloading] = useState({});
  const [deleting,    setDeleting]    = useState({});
  const [confirm,     setConfirm]     = useState(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await listVideos();
      setVideos(data);
    } catch (err) {
      setError(err.message);
      toast(`Failed to load videos: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchVideos(); }, [fetchVideos, refreshKey]);

  // Filter + sort
  const filtered = videos
    .filter(v => v.key.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'date-desc') return new Date(b.lastModified) - new Date(a.lastModified);
      if (sort === 'date-asc')  return new Date(a.lastModified) - new Date(b.lastModified);
      if (sort === 'name-asc')  return a.key.localeCompare(b.key);
      if (sort === 'name-desc') return b.key.localeCompare(a.key);
      if (sort === 'size-desc') return b.size - a.size;
      if (sort === 'size-asc')  return a.size - b.size;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, sort]);

  async function handleDownload(key) {
    setDownloading(d => ({ ...d, [key]: true }));
    try {
      const url = await getDownloadUrl(key);
      const a = document.createElement('a');
      a.href = url; a.download = key.split('/').pop();
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      toast(`Downloading "${key}"`, 'success');
    } catch (err) {
      toast(`Download failed: ${err.message}`, 'error');
    } finally {
      setDownloading(d => ({ ...d, [key]: false }));
    }
  }

  async function handleDelete(key) {
    setConfirm(null);
    setDeleting(d => ({ ...d, [key]: true }));
    try {
      await deleteVideo(key);
      setVideos(prev => prev.filter(v => v.key !== key));
      toast(`"${key}" deleted.`, 'success');
    } catch (err) {
      toast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleting(d => ({ ...d, [key]: false }));
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="lib-state">
        <div className="lib-spinner" />
        <p>Loading your videos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lib-state lib-state--error">
        <div className="lib-state-icon">⚠</div>
        <p>{error}</p>
        <button id="lib-retry" className="btn btn-secondary btn-sm" onClick={fetchVideos}>Retry</button>
      </div>
    );
  }

  return (
    <div className="lib-root">
      {/* Toolbar */}
      <div className="lib-toolbar">
        <div className="lib-search-wrap">
          <svg className="lib-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="lib-search"
            type="search"
            className="input-field lib-search-input"
            placeholder="Search videos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="lib-toolbar-right">
          <select
            id="lib-sort"
            className="input-field lib-sort-select"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="size-desc">Largest first</option>
            <option value="size-asc">Smallest first</option>
          </select>

          <button id="lib-refresh" className="btn btn-secondary btn-icon btn-sm" onClick={fetchVideos}
                  title="Refresh" aria-label="Refresh">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="lib-stats">
        <span className="badge badge-blue">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
        {search && <span className="badge badge-green">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="lib-empty">
          <div className="lib-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <p className="lib-empty-title">
            {search ? 'No videos match your search' : 'No videos yet'}
          </p>
          <p className="lib-empty-sub">
            {search ? 'Try a different search term.' : 'Upload your first video to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="lib-grid">
            {paginated.map(v => (
              <VideoCard
                key={v.key}
                video={v}
                downloading={downloading[v.key]}
                deleting={deleting[v.key]}
                onDownload={() => handleDownload(v.key)}
                onDelete={() => setConfirm(v.key)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="lib-pagination">
              <button id="lib-prev" className="btn btn-secondary btn-sm"
                      disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="lib-page-info">Page {page} of {totalPages}</span>
              <button id="lib-next" className="btn btn-secondary btn-sm"
                      disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm dialog */}
      {confirm && (
        <div className="confirm-overlay animate-fade-in" onClick={() => setConfirm(null)}>
          <div className="confirm-dialog glass-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3 className="confirm-title">Delete video?</h3>
            <p className="confirm-body">
              <strong>"{confirm}"</strong> will be permanently removed from your R2 bucket.
            </p>
            <div className="confirm-actions">
              <button id="confirm-cancel" className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button id="confirm-delete" className="btn btn-danger" onClick={() => handleDelete(confirm)}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, downloading, deleting, onDownload, onDelete }) {
  const name = video.key.split('/').pop();
  const ext  = name.split('.').pop().toUpperCase();

  return (
    <div className="vc glass-card" id={`vc-${name.replace(/[^a-z0-9]/gi,'-')}`}>
      {/* Thumbnail placeholder */}
      <div className="vc-thumb">
        <div className="vc-thumb-bg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
        <div className="vc-ext-badge">{ext}</div>
      </div>

      {/* Info */}
      <div className="vc-info">
        <p className="vc-name" title={video.key}>{name}</p>
        <div className="vc-meta">
          <span>{formatBytes(video.size)}</span>
          <span className="vc-dot">·</span>
          <span>{formatDate(video.lastModified)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="vc-actions">
        <button
          className="btn btn-sm btn-primary vc-btn-down"
          onClick={onDownload}
          disabled={downloading || deleting}
          title="Download"
        >
          {downloading
            ? <span className="animate-spin" style={{display:'inline-block',fontSize:'0.8rem'}}>⏳</span>
            : <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </>
          }
        </button>

        <button
          className="btn btn-sm btn-danger vc-btn-del"
          onClick={onDelete}
          disabled={downloading || deleting}
          title="Delete"
        >
          {deleting
            ? <span className="animate-spin" style={{display:'inline-block',fontSize:'0.8rem'}}>⏳</span>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
          }
        </button>
      </div>
    </div>
  );
}
