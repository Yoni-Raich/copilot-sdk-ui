import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Info } from 'lucide-react';

interface InstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspace: string;
}

export default function InstructionsModal({
    isOpen,
    onClose,
    workspace,
}: InstructionsModalProps) {
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchInstructions();
            setSuccess('');
            setError('');
        }
    }, [isOpen, workspace]);

    const fetchInstructions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workspace/instructions');
            if (res.ok) {
                const data = await res.json();
                setContent(data.content || '');
                setOriginalContent(data.content || '');
            } else {
                setError('Failed to load instructions');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to connect to server');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/workspace/instructions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                setSuccess('Instructions saved successfully');
                setOriginalContent(content);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError('Failed to save instructions');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to save instructions');
        }
        setSaving(false);
    };

    const hasChanges = content !== originalContent;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FileText size={20} />
                        Agent Instructions
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="info-banner" style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Info size={16} className="text-muted" />
                        <span className="text-muted">
                            These instructions are saved to <code>.github/copilot-instructions.md</code> in your workspace.
                            The AI will check this file for project-specific guidelines.
                        </span>
                    </div>

                    {loading ? (
                        <div className="loading-state">Loading instructions...</div>
                    ) : (
                        <div className="form-group" style={{ height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                className="form-input form-textarea"
                                style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}
                                placeholder="# Copilot Instructions..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    )}

                    {error && <div className="form-error" style={{ marginTop: '8px' }}>{error}</div>}
                    {success && <div className="form-success" style={{ marginTop: '8px', color: 'var(--success-color)' }}>{success}</div>}
                </div>

                <div className="modal-footer">
                    <div style={{ marginRight: 'auto', fontSize: '0.85rem' }} className="text-muted">
                        {hasChanges ? 'Unsaved changes' : 'All changes saved'}
                    </div>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Instructions'}
                    </button>
                </div>
            </div>
        </div>
    );
}
