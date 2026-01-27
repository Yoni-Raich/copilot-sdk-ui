import React, { useState, useEffect } from 'react';
import { X, Folder, File, ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { FileEntry } from '../types';

interface WorkspaceModalProps {
  currentWorkspace: string;
  onClose: () => void;
  onSelect: (workspace: string) => void;
}

export default function WorkspaceModal({
  currentWorkspace,
  onClose,
  onSelect,
}: WorkspaceModalProps) {
  const [currentPath, setCurrentPath] = useState(currentWorkspace);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputPath, setInputPath] = useState(currentWorkspace);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        // Sort: directories first, then alphabetically
        data.sort((a: FileEntry, b: FileEntry) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'directory' ? -1 : 1;
        });
        setFiles(data);
        setInputPath(path);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load directory');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const parts = currentPath.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      const newPath = parts.join('/') || '/';
      setCurrentPath(newPath);
    }
  };

  const navigateTo = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
    }
  };

  const handleSelectWorkspace = () => {
    onSelect(currentPath);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPath(inputPath);
  };

  const getPathParts = () => {
    return currentPath.split(/[/\\]/).filter(Boolean);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Select Workspace</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <form onSubmit={handleInputSubmit} style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Path</label>
              <input
                type="text"
                className="form-input"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/path/to/workspace"
              />
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={navigateUp}
              disabled={currentPath === '/' || currentPath.length <= 3}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setCurrentPath(currentWorkspace)}
              title="Go to current workspace"
            >
              <Home size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)', overflow: 'auto' }}>
              {getPathParts().map((part, i, arr) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={12} />}
                  <span
                    style={{
                      cursor: 'pointer',
                      color: i === arr.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    onClick={() => {
                      const newPath = arr.slice(0, i + 1).join('/');
                      setCurrentPath(currentPath.startsWith('/') ? '/' + newPath : newPath);
                    }}
                  >
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--error-color)', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div className="file-browser">
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : files.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Empty directory
              </div>
            ) : (
              files.map((entry) => (
                <div
                  key={entry.path}
                  className="file-item"
                  onClick={() => navigateTo(entry)}
                  style={{
                    opacity: entry.type === 'file' ? 0.6 : 1,
                    cursor: entry.type === 'directory' ? 'pointer' : 'default',
                  }}
                >
                  <span className="file-icon">
                    {entry.type === 'directory' ? <Folder size={18} /> : <File size={18} />}
                  </span>
                  <span className="file-name">{entry.name}</span>
                  {entry.type === 'directory' && <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Selected workspace:
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {currentPath}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSelectWorkspace}>
            Select Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
