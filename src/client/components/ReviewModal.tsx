import React, { useState, useEffect } from 'react';
import { X, FileSearch, Play, CheckCircle, XCircle, AlertTriangle, GitBranch, FileText, Loader } from 'lucide-react';

interface ReviewResult {
  file: string;
  status: 'ok' | 'warning' | 'error';
  issues: {
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }[];
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  workspace: string;
  onRunReview: (scope: string) => void;
}

type ReviewScope = 'staged' | 'unstaged' | 'all' | 'pr';

export default function ReviewModal({
  isOpen,
  onClose,
  sessionId,
  workspace,
  onRunReview,
}: ReviewModalProps) {
  const [scope, setScope] = useState<ReviewScope>('staged');
  const [isReviewing, setIsReviewing] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; warnings: number; errors: number } | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setHasReviewed(false);
      setResults([]);
      setSummary(null);
    }
  }, [isOpen]);

  const handleRunReview = async () => {
    setIsReviewing(true);
    setHasReviewed(true);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          workspace,
          scope,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSummary(data.summary);
      } else {
        // Demo results
        await new Promise(resolve => setTimeout(resolve, 1500));
        const demoResults: ReviewResult[] = [
          {
            file: 'src/components/Button.tsx',
            status: 'ok',
            issues: [],
          },
          {
            file: 'src/utils/helpers.ts',
            status: 'warning',
            issues: [
              { line: 42, severity: 'warning', message: 'Consider using optional chaining here' },
              { line: 78, severity: 'info', message: 'This function could be simplified' },
            ],
          },
          {
            file: 'src/api/client.ts',
            status: 'error',
            issues: [
              { line: 15, severity: 'error', message: 'Missing error handling for async operation' },
              { line: 23, severity: 'warning', message: 'Unused variable \'response\'' },
            ],
          },
        ];
        setResults(demoResults);
        setSummary({
          total: 3,
          warnings: 2,
          errors: 1,
        });
      }
    } catch (error) {
      console.error('Failed to run review:', error);
      setResults([]);
    }

    setIsReviewing(false);
  };

  const handleExecuteReview = () => {
    onRunReview(scope);
    onClose();
  };

  const getStatusIcon = (status: ReviewResult['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle size={16} className="status-ok" />;
      case 'warning':
        return <AlertTriangle size={16} className="status-warning" />;
      case 'error':
        return <XCircle size={16} className="status-error" />;
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle size={14} className="status-error" />;
      case 'warning':
        return <AlertTriangle size={14} className="status-warning" />;
      case 'info':
        return <CheckCircle size={14} className="status-info" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <FileSearch size={20} />
            Code Review
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {/* Scope Selector */}
          <div className="review-scope-section">
            <label className="form-label">Review Scope</label>
            <div className="scope-options">
              <button
                className={`scope-option ${scope === 'staged' ? 'active' : ''}`}
                onClick={() => setScope('staged')}
              >
                <GitBranch size={16} />
                Staged Changes
              </button>
              <button
                className={`scope-option ${scope === 'unstaged' ? 'active' : ''}`}
                onClick={() => setScope('unstaged')}
              >
                <FileText size={16} />
                Unstaged Changes
              </button>
              <button
                className={`scope-option ${scope === 'all' ? 'active' : ''}`}
                onClick={() => setScope('all')}
              >
                <FileSearch size={16} />
                All Changes
              </button>
              <button
                className={`scope-option ${scope === 'pr' ? 'active' : ''}`}
                onClick={() => setScope('pr')}
              >
                <GitBranch size={16} />
                PR Changes
              </button>
            </div>
          </div>

          {/* Run Button */}
          {!hasReviewed && (
            <div className="review-action">
              <button
                className="btn btn-primary btn-large"
                onClick={handleRunReview}
                disabled={isReviewing}
              >
                {isReviewing ? (
                  <>
                    <Loader size={16} className="spinning" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Review
                  </>
                )}
              </button>
              <p className="review-hint">
                Preview changes before sending to AI for detailed review
              </p>
            </div>
          )}

          {/* Results */}
          {hasReviewed && !isReviewing && (
            <div className="review-results">
              {/* Summary */}
              {summary && (
                <div className="review-summary">
                  <div className="summary-item">
                    <span className="summary-value">{summary.total}</span>
                    <span className="summary-label">Files</span>
                  </div>
                  <div className="summary-item warning">
                    <span className="summary-value">{summary.warnings}</span>
                    <span className="summary-label">Warnings</span>
                  </div>
                  <div className="summary-item error">
                    <span className="summary-value">{summary.errors}</span>
                    <span className="summary-label">Errors</span>
                  </div>
                </div>
              )}

              {/* File List */}
              <div className="review-files">
                {results.length === 0 ? (
                  <div className="empty-state-small">
                    <CheckCircle size={32} className="status-ok" />
                    <p>No changes to review</p>
                  </div>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="review-file">
                      <div className="review-file-header">
                        {getStatusIcon(result.status)}
                        <span className="review-file-name">{result.file}</span>
                        <span className="review-file-issues">
                          {result.issues.length} {result.issues.length === 1 ? 'issue' : 'issues'}
                        </span>
                      </div>
                      {result.issues.length > 0 && (
                        <div className="review-file-issues-list">
                          {result.issues.map((issue, i) => (
                            <div key={i} className={`review-issue ${issue.severity}`}>
                              {getSeverityIcon(issue.severity)}
                              <span className="issue-line">Line {issue.line}</span>
                              <span className="issue-message">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {hasReviewed && results.length > 0 && (
            <button className="btn btn-primary" onClick={handleExecuteReview}>
              <FileSearch size={16} />
              Send to AI for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
