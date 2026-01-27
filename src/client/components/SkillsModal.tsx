import React, { useState } from 'react';
import { X, Plus, Download, Trash2, ExternalLink } from 'lucide-react';
import { Skill } from '../types';

interface SkillsModalProps {
  skills: Skill[];
  workspace: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SkillsModal({
  skills,
  workspace,
  onClose,
  onRefresh,
}: SkillsModalProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'create' | 'import'>('installed');
  const [newSkillName, setNewSkillName] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createSkill = async () => {
    if (!newSkillName.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSkillName.trim(), workspace }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Skill "${newSkillName}" created successfully!`);
        setNewSkillName('');
        onRefresh();
        setTimeout(() => setActiveTab('installed'), 1500);
      } else {
        setError(data.error || 'Failed to create skill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create skill');
    } finally {
      setLoading(false);
    }
  };

  const importSkill = async () => {
    if (!importUrl.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim(), workspace }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Skill "${data.name}" imported successfully!`);
        setImportUrl('');
        onRefresh();
        setTimeout(() => setActiveTab('installed'), 1500);
      } else {
        setError(data.error || 'Failed to import skill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import skill');
    } finally {
      setLoading(false);
    }
  };

  const deleteSkill = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"?`)) return;

    try {
      const res = await fetch(`/api/skills/${name}?workspace=${encodeURIComponent(workspace)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete skill');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Skills Manager</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'installed' ? 'active' : ''}`}
              onClick={() => setActiveTab('installed')}
            >
              Installed ({skills.length})
            </button>
            <button
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create New
            </button>
            <button
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              Import URL
            </button>
          </div>

          {error && (
            <div style={{ color: 'var(--error-color)', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ color: 'var(--success-color)', marginBottom: '16px', fontSize: '14px' }}>
              {success}
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="skills-list">
              {skills.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  No skills installed. Create or import one to get started.
                </div>
              ) : (
                skills.map((skill) => (
                  <div key={skill.name} className="skill-item">
                    <div className="skill-info">
                      <div className="skill-name">{skill.name}</div>
                      <div className="skill-description">{skill.description}</div>
                    </div>
                    <div className="skill-actions">
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => deleteSkill(skill.name)}
                        title="Delete skill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Create a new skill using the skill-creator template. The skill will be initialized with a basic SKILL.md file that you can customize.
              </p>
              <div className="form-group">
                <label className="form-label">Skill Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="my-awesome-skill"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createSkill()}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={createSkill}
                disabled={loading || !newSkillName.trim()}
                style={{ width: '100%' }}
              >
                <Plus size={16} />
                {loading ? 'Creating...' : 'Create Skill'}
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Import a skill from a URL. Paste the raw GitHub URL of a SKILL.md file to import it.
              </p>
              <div className="form-group">
                <label className="form-label">Skill URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://raw.githubusercontent.com/user/repo/main/skills/my-skill/SKILL.md"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && importSkill()}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={importSkill}
                disabled={loading || !importUrl.trim()}
                style={{ width: '100%' }}
              >
                <Download size={16} />
                {loading ? 'Importing...' : 'Import Skill'}
              </button>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Example URLs:
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <a
                    href="https://github.com/hoodini/ai-agents-skills"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Browse community skills <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
