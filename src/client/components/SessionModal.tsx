import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Edit2, Save, FileText, Clock, Hash } from 'lucide-react';
import { Session } from '../types';

interface SessionInfo {
  id: string;
  name: string;
  copilotSessionId?: string;
  createdAt: string;
  workspace: string;
  model: string;
  messageCount: number;
  checkpoints?: string[];
  filesModified?: string[];
  currentPlan?: string;
}

interface SessionModalProps {
  session: Session | undefined;
  isOpen: boolean;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
}

export default function SessionModal({
  session,
  isOpen,
  onClose,
  onRename,
}: SessionModalProps) {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session) {
      fetchSessionInfo();
      setNewName(session.name);
    }
  }, [isOpen, session]);

  const fetchSessionInfo = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/session/${session.id}/info`);
      if (res.ok) {
        const data = await res.json();
        setSessionInfo(data);
      } else {
        // Fallback to basic session info
        setSessionInfo({
          id: session.id,
          name: session.name,
          createdAt: session.createdAt,
          workspace: session.workspace,
          model: session.model || 'Unknown',
          messageCount: session.messages?.length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch session info:', error);
      setSessionInfo({
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        workspace: session.workspace,
        model: session.model || 'Unknown',
        messageCount: session.messages?.length || 0,
      });
    }
    setLoading(false);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    if (session && newName.trim()) {
      onRename(session.id, newName.trim());
      setIsEditing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Session Info</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">Loading session info...</div>
          ) : sessionInfo ? (
            <div className="session-info">
              {/* Session Name */}
              <div className="info-row">
                <div className="info-label">
                  <FileText size={14} />
                  Name
                </div>
                <div className="info-value">
                  {isEditing ? (
                    <div className="edit-name-row">
                      <input
                        type="text"
                        className="form-input"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleSave}>
                        <Save size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="value-with-action">
                      <span>{sessionInfo.name}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsEditing(true)}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Session ID */}
              <div className="info-row">
                <div className="info-label">
                  <Hash size={14} />
                  Session ID
                </div>
                <div className="info-value">
                  <div className="value-with-action">
                    <code className="code-value">{sessionInfo.id}</code>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleCopy(sessionInfo.id, 'id')}
                    >
                      {copied === 'id' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Copilot Session ID */}
              {sessionInfo.copilotSessionId && (
                <div className="info-row">
                  <div className="info-label">
                    <Hash size={14} />
                    Copilot Session
                  </div>
                  <div className="info-value">
                    <div className="value-with-action">
                      <code className="code-value">{sessionInfo.copilotSessionId}</code>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleCopy(sessionInfo.copilotSessionId!, 'copilotId')}
                      >
                        {copied === 'copilotId' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="info-row">
                <div className="info-label">
                  <Clock size={14} />
                  Created
                </div>
                <div className="info-value">
                  {formatDate(sessionInfo.createdAt)}
                </div>
              </div>

              {/* Model */}
              <div className="info-row">
                <div className="info-label">Model</div>
                <div className="info-value">
                  <span className="badge">{sessionInfo.model}</span>
                </div>
              </div>

              {/* Message Count */}
              <div className="info-row">
                <div className="info-label">Messages</div>
                <div className="info-value">{sessionInfo.messageCount}</div>
              </div>

              {/* Workspace */}
              <div className="info-row">
                <div className="info-label">Workspace</div>
                <div className="info-value">
                  <code className="code-value">{sessionInfo.workspace}</code>
                </div>
              </div>

              {/* Checkpoints */}
              {sessionInfo.checkpoints && sessionInfo.checkpoints.length > 0 && (
                <div className="info-section">
                  <div className="info-section-title">Checkpoints</div>
                  <div className="checkpoint-list">
                    {sessionInfo.checkpoints.map((cp, i) => (
                      <div key={i} className="checkpoint-item">
                        <span className="checkpoint-number">{i + 1}</span>
                        <span>{cp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Modified */}
              {sessionInfo.filesModified && sessionInfo.filesModified.length > 0 && (
                <div className="info-section">
                  <div className="info-section-title">Files Modified</div>
                  <div className="files-list">
                    {sessionInfo.filesModified.map((file, i) => (
                      <div key={i} className="file-item-small">
                        <FileText size={12} />
                        <span>{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Plan */}
              {sessionInfo.currentPlan && (
                <div className="info-section">
                  <div className="info-section-title">Current Plan</div>
                  <div className="plan-preview">
                    <pre>{sessionInfo.currentPlan}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-small">No session selected</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
