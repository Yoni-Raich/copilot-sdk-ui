import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Play, Save, FileText, Trash2 } from 'lucide-react';

interface Plan {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
}

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onExecutePlan: (plan: string) => void;
}

export default function PlanModal({
  isOpen,
  onClose,
  sessionId,
  onExecutePlan,
}: PlanModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'history'>('current');
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [planHistory, setPlanHistory] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchCurrentPlan();
      fetchPlanHistory();
    }
  }, [isOpen, sessionId]);

  const fetchCurrentPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/plan`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data);
      } else {
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error);
      setCurrentPlan(null);
    }
    setLoading(false);
  };

  const fetchPlanHistory = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlanHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch plan history:', error);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPlan.content.trim()) {
      setError('Plan content is required');
      return;
    }

    try {
      const res = await fetch(`/api/session/${sessionId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlan.title.trim() || 'Untitled Plan',
          content: newPlan.content.trim(),
        }),
      });

      if (res.ok) {
        const plan = await res.json();
        setCurrentPlan(plan);
        setNewPlan({ title: '', content: '' });
        setActiveTab('current');
      } else {
        // Demo mode - create locally
        const demoPlan: Plan = {
          id: Date.now().toString(),
          title: newPlan.title.trim() || 'Untitled Plan',
          content: newPlan.content.trim(),
          status: 'draft',
          createdAt: new Date().toISOString(),
        };
        setCurrentPlan(demoPlan);
        setPlanHistory(prev => [demoPlan, ...prev]);
        setNewPlan({ title: '', content: '' });
        setActiveTab('current');
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
      setError('Failed to create plan');
    }
  };

  const handleExecute = () => {
    if (currentPlan) {
      onExecutePlan(currentPlan.content);
      onClose();
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await fetch(`/api/session/${sessionId}/plans/${planId}`, { method: 'DELETE' });
      setPlanHistory(prev => prev.filter(p => p.id !== planId));
      if (currentPlan?.id === planId) {
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
      setPlanHistory(prev => prev.filter(p => p.id !== planId));
      if (currentPlan?.id === planId) {
        setCurrentPlan(null);
      }
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setCurrentPlan(plan);
    setActiveTab('current');
  };

  const getStatusBadge = (status: Plan['status']) => {
    const colors = {
      draft: 'var(--text-muted)',
      active: 'var(--accent-color)',
      completed: 'var(--success-color)',
    };
    return (
      <span className="status-badge" style={{ color: colors[status] }}>
        {status}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <ClipboardList size={20} />
            Plan Mode
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'current' ? 'active' : ''}`}
              onClick={() => setActiveTab('current')}
            >
              Current Plan
            </button>
            <button
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create New
            </button>
            <button
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          {activeTab === 'current' && (
            <div className="plan-view">
              {loading ? (
                <div className="loading-state">Loading plan...</div>
              ) : currentPlan ? (
                <>
                  <div className="plan-header">
                    <h3 className="plan-title">{currentPlan.title}</h3>
                    {getStatusBadge(currentPlan.status)}
                  </div>
                  <div className="plan-content">
                    <pre>{currentPlan.content}</pre>
                  </div>
                  <div className="plan-meta">
                    <span>Created: {new Date(currentPlan.createdAt).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="empty-state-small">
                  <ClipboardList size={32} />
                  <p>No active plan</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                    Create Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form className="plan-form" onSubmit={handleCreatePlan}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Plan Title (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Implement user authentication"
                  value={newPlan.title}
                  onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Plan Content</label>
                <textarea
                  className="form-input form-textarea plan-textarea"
                  placeholder="Describe your plan step by step...&#10;&#10;1. First, we'll...&#10;2. Then...&#10;3. Finally..."
                  value={newPlan.content}
                  onChange={e => setNewPlan({ ...newPlan, content: e.target.value })}
                  rows={12}
                />
              </div>

              <div className="form-hint">
                Tip: Be specific about the steps you want to take. The AI will follow your plan.
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('current')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  Save Plan
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="plan-history">
              {planHistory.length === 0 ? (
                <div className="empty-state-small">
                  <FileText size={32} />
                  <p>No plan history</p>
                </div>
              ) : (
                <div className="plan-list">
                  {planHistory.map(plan => (
                    <div key={plan.id} className="plan-item">
                      <div className="plan-item-info" onClick={() => handleSelectPlan(plan)}>
                        <div className="plan-item-title">{plan.title}</div>
                        <div className="plan-item-meta">
                          {new Date(plan.createdAt).toLocaleDateString()}
                          {getStatusBadge(plan.status)}
                        </div>
                      </div>
                      <div className="plan-item-actions">
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleDeletePlan(plan.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {currentPlan && activeTab === 'current' && (
            <button className="btn btn-primary" onClick={handleExecute}>
              <Play size={16} />
              Execute Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
