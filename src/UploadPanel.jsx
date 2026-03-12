import { useState, useRef } from 'react';
import { uploadVideo } from './r2Service';
import { useToast } from './ToastContext';
import './UploadPanel.css';

const ACCEPTED = '.mp4,.mov,.mkv,.webm,.avi,.m4v,.flv,.wmv';
const MAX_MB = 5 * 1024; // 5 GB

export default function UploadPanel({ onUploaded }) {
  const toast = useToast();
  const inputRef = useRef(null);

  const [files, setFiles]       = useState([]); // [{file, id, progress, status}]
  const [dragging, setDragging] = useState(false);

  function addFiles(newFiles) {
    const items = Array.from(newFiles)
      .filter(f => /video\//i.test(f.type) || ACCEPTED.split(',').some(ext => f.name.toLowerCase().endsWith(ext.replace('.',''))))
      .map(f => ({ file: f, id: crypto.randomUUID(), progress: 0, status: 'pending' }));

    if (!items.length) { toast('Please select valid video files.', 'warning'); return; }

    const oversized = items.filter(i => i.file.size > MAX_MB * 1024 * 1024);
    if (oversized.length) {
      toast(`${oversized.map(i => i.file.name).join(', ')} exceed the 5 GB limit.`, 'error');
      return;
    }
    setFiles(prev => [...prev, ...items]);
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function uploadAll() {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length) return;

    for (const item of pending) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      try {
        await uploadVideo(item.file, progress => {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress } : f));
        });
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
        toast(`${item.file.name} uploaded`, 'success');
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
        toast(`Failed: ${err.message}`, 'error', 6000);
      }
    }
    onUploaded();
  }

  function clearDone() {
    setFiles(prev => prev.filter(f => f.status !== 'done'));
  }

  // Drag handlers
  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  const hasPending   = files.some(f => f.status === 'pending');
  const hasUploading = files.some(f => f.status === 'uploading');
  const hasDone      = files.some(f => f.status === 'done');

  return (
    <div className="upload-panel">
      {/* Drop zone */}
      <div
        id="upload-dropzone"
        className={`upload-dropzone ${dragging ? 'upload-dropzone--active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload drop zone. Click or drag and drop to add videos."
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id="upload-file-input"
          type="file"
          accept={ACCEPTED}
          multiple
          className="sr-only"
          onChange={e => addFiles(e.target.files)}
        />

        <div className="upload-dz-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
        </div>

        <div className="upload-dz-text">
          <p className="upload-dz-title">
            {dragging ? 'Release to upload' : 'Drag & drop videos here'}
          </p>
          <p className="upload-dz-sub">
            or <span className="upload-dz-link">browse files</span> · MP4, MOV, MKV, WebM and more · Max 5 GB each
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="upload-list">
          <div className="upload-list-header">
            <h3 className="upload-list-title">Queue ({files.length})</h3>
            <div className="upload-list-actions">
              {hasDone && (
                <button id="upload-clear-done" className="btn btn-sm btn-secondary" onClick={clearDone}>Clear done</button>
              )}
              <button
                id="upload-start"
                className="btn btn-sm btn-primary"
                onClick={uploadAll}
                disabled={!hasPending || hasUploading}
              >
                {hasUploading
                  ? <><span className="animate-spin" style={{display:'inline-block',fontSize:'0.8rem'}}>⏳</span> Uploading…</>
                  : `Upload ${files.filter(f => f.status === 'pending').length} file${files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          </div>

          <div className="upload-items">
            {files.map(item => (
              <UploadItem key={item.id} item={item} onRemove={() => removeFile(item.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadItem({ item, onRemove }) {
  const { file, progress, status } = item;
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

  const statusIcon = {
    pending:   <span className="status-dot status-dot--pending" />,
    uploading: <span className="animate-spin status-spin">⏳</span>,
    done:      <span className="status-icon status-icon--done">✓</span>,
    error:     <span className="status-icon status-icon--error">✕</span>,
  }[status];

  const statusLabel = {
    pending:   'Ready',
    uploading: `${progress}%`,
    done:      'Uploaded',
    error:     'Failed',
  }[status];

  return (
    <div className={`upload-item upload-item--${status}`}>
      <div className="upload-item-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>

      <div className="upload-item-info">
        <p className="upload-item-name" title={file.name}>{file.name}</p>
        {status === 'uploading' ? (
          <div className="upload-item-progress">
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width: `${progress}%`}} />
            </div>
            <span className="upload-item-pct">{progress}%</span>
          </div>
        ) : (
          <p className="upload-item-size">{sizeMB} MB</p>
        )}
      </div>

      <div className="upload-item-right">
        <span className="upload-item-status">{statusIcon} {statusLabel}</span>
        {status !== 'uploading' && (
          <button className="btn btn-icon btn-danger" style={{width:32,height:32}} onClick={onRemove} aria-label="Remove">✕</button>
        )}
      </div>
    </div>
  );
}
