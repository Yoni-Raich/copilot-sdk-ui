import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Wrench, Check, Loader, AlertCircle } from 'lucide-react';
import { ToolCall } from '../types';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when running, collapse when complete
  useEffect(() => {
    if (toolCall.status === 'running') {
      setExpanded(true);
    }
  }, [toolCall.status]);

  const statusIcon = () => {
    switch (toolCall.status) {
      case 'running':
        return <Loader size={14} className="tool-call-status-icon spinning" />;
      case 'complete':
        return <Check size={14} className="tool-call-status-icon status-ok" />;
      case 'error':
        return <AlertCircle size={14} className="tool-call-status-icon status-error" />;
    }
  };

  const formatArgs = (args: string): string => {
    try {
      return JSON.stringify(JSON.parse(args), null, 2);
    } catch {
      return args;
    }
  };

  return (
    <div className={`tool-call-card ${toolCall.status}`}>
      <div
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <Wrench size={14} className="tool-call-icon" />
        <span className="tool-call-name">{toolCall.name}</span>
        {statusIcon()}
        <span className="tool-call-chevron">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>
      <div className={`tool-call-body ${expanded ? 'expanded' : ''}`}>
        {toolCall.arguments && (
          <div className="tool-call-section">
            <div className="tool-call-section-label">Arguments</div>
            <pre className="tool-call-args">{formatArgs(toolCall.arguments)}</pre>
          </div>
        )}
        {toolCall.result && (
          <div className="tool-call-section">
            <div className="tool-call-section-label">Result</div>
            <pre className="tool-call-result">{
              typeof toolCall.result === 'string' && toolCall.result.length > 500
                ? toolCall.result.substring(0, 500) + '...'
                : toolCall.result
            }</pre>
          </div>
        )}
      </div>
    </div>
  );
}
