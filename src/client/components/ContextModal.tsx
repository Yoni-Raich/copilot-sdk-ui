import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Zap, FileText, MessageSquare, Code, Brain } from 'lucide-react';

interface ContextUsage {
  totalTokens: number;
  maxTokens: number;
  breakdown: {
    systemPrompt: number;
    messages: number;
    files: number;
    tools: number;
    other: number;
  };
  compactSuggested: boolean;
}

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onCompact: () => void;
}

export default function ContextModal({
  isOpen,
  onClose,
  sessionId,
  onCompact,
}: ContextModalProps) {
  const [usage, setUsage] = useState<ContextUsage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchContextUsage();
    }
  }, [isOpen, sessionId]);

  const fetchContextUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/context?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      } else {
        // Mock data for demo
        setUsage({
          totalTokens: 45000,
          maxTokens: 128000,
          breakdown: {
            systemPrompt: 2500,
            messages: 35000,
            files: 5000,
            tools: 1500,
            other: 1000,
          },
          compactSuggested: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch context usage:', error);
      // Mock data
      setUsage({
        totalTokens: 45000,
        maxTokens: 128000,
        breakdown: {
          systemPrompt: 2500,
          messages: 35000,
          files: 5000,
          tools: 1500,
          other: 1000,
        },
        compactSuggested: false,
      });
    }
    setLoading(false);
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const getPercentage = (value: number, total: number) => {
    return Math.round((value / total) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--error-color)';
    if (percentage >= 70) return 'var(--warning-color)';
    return 'var(--accent-color)';
  };

  if (!isOpen) return null;

  const usagePercentage = usage ? getPercentage(usage.totalTokens, usage.maxTokens) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Context Window Usage</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">Loading context info...</div>
          ) : usage ? (
            <div className="context-info">
              {/* Main Usage Bar */}
              <div className="usage-summary">
                <div className="usage-header">
                  <span className="usage-label">Token Usage</span>
                  <span className="usage-value">
                    {formatNumber(usage.totalTokens)} / {formatNumber(usage.maxTokens)}
                  </span>
                </div>
                <div className="usage-bar-container">
                  <div
                    className="usage-bar"
                    style={{
                      width: `${usagePercentage}%`,
                      backgroundColor: getUsageColor(usagePercentage),
                    }}
                  />
                </div>
                <div className="usage-percentage">
                  {usagePercentage}% used
                </div>
              </div>

              {/* Warning */}
              {usagePercentage >= 80 && (
                <div className="context-warning">
                  <AlertTriangle size={16} />
                  <span>Context window is {usagePercentage >= 90 ? 'nearly full' : 'getting full'}. Consider compacting.</span>
                </div>
              )}

              {/* Breakdown */}
              <div className="breakdown-section">
                <h3 className="breakdown-title">Breakdown</h3>
                <div className="breakdown-list">
                  <div className="breakdown-item">
                    <div className="breakdown-icon">
                      <Brain size={16} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-label">System Prompt</span>
                      <span className="breakdown-value">{formatNumber(usage.breakdown.systemPrompt)} tokens</span>
                    </div>
                    <div className="breakdown-bar-mini">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${getPercentage(usage.breakdown.systemPrompt, usage.totalTokens)}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-icon">
                      <MessageSquare size={16} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-label">Messages</span>
                      <span className="breakdown-value">{formatNumber(usage.breakdown.messages)} tokens</span>
                    </div>
                    <div className="breakdown-bar-mini">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${getPercentage(usage.breakdown.messages, usage.totalTokens)}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-icon">
                      <FileText size={16} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-label">Files</span>
                      <span className="breakdown-value">{formatNumber(usage.breakdown.files)} tokens</span>
                    </div>
                    <div className="breakdown-bar-mini">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${getPercentage(usage.breakdown.files, usage.totalTokens)}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-icon">
                      <Code size={16} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-label">Tools</span>
                      <span className="breakdown-value">{formatNumber(usage.breakdown.tools)} tokens</span>
                    </div>
                    <div className="breakdown-bar-mini">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${getPercentage(usage.breakdown.tools, usage.totalTokens)}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-icon">
                      <Zap size={16} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-label">Other</span>
                      <span className="breakdown-value">{formatNumber(usage.breakdown.other)} tokens</span>
                    </div>
                    <div className="breakdown-bar-mini">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${getPercentage(usage.breakdown.other, usage.totalTokens)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state-small">No session selected</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onCompact}>
            <Zap size={16} />
            Compact Context
          </button>
        </div>
      </div>
    </div>
  );
}
