import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Square, Menu, Sparkles, ChevronDown, Paperclip, X, File, Image as ImageIcon, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Session, Message, Model, FileAttachment } from '../types';
import CommandPalette, { SlashCommand, SLASH_COMMANDS } from './CommandPalette';
import { SessionMenu, SettingsDropdown } from './HeaderDropdowns';
import SessionModal from './SessionModal';
import ContextModal from './ContextModal';
import SettingsModal from './SettingsModal';
import MCPModal from './MCPModal';
import PlanModal from './PlanModal';
import ReviewModal from './ReviewModal';

interface ChatViewProps {
  session: Session | undefined;
  sessionId: string | null;
  workspace: string;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  models: Model[];
  currentModel: string;
  onModelChange: (model: string) => void;
  onSelectSession?: (id: string) => void;
  onRenameSession?: (id: string, name: string) => void;
}

export default function ChatView({
  session,
  sessionId,
  workspace,
  onToggleSidebar,
  onNewChat,
  models,
  currentModel,
  onModelChange,
  onSelectSession,
  onRenameSession,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // File attachments state
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileList | null>(null);

  // Command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);

  // Modal states
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<'auto' | 'dark' | 'light'>('dark');

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Smart auto-scroll: Only scroll if user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, streamContent, userScrolledUp, scrollToBottom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserScrolledUp(!isAtBottom);
  }, []);

  useEffect(() => {
    if (session) {
      setMessages(session.messages || []);
    } else {
      setMessages([]);
    }
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle command palette visibility
  useEffect(() => {
    if (input.startsWith('/') && !input.includes(' ')) {
      setShowCommandPalette(true);
      if (inputRef.current) {
        setInputRect(inputRef.current.getBoundingClientRect());
      }
    } else {
      setShowCommandPalette(false);
    }
  }, [input]);

  const connectWebSocket = useCallback((sid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${sid}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'user_message':
          setMessages(prev => [...prev, data.message]);
          break;
        case 'stream':
          setStreamContent(prev => prev + data.content);
          break;
        case 'complete':
          // Fallback: If server message is empty but we have streamed content, use it
          // This prevents "disappearing" messages if the server payload is malformed
          const finalMsg = data.message;
          if (!finalMsg.content && streamContent) {
            console.warn('ChatView: Received empty completion message, using stream buffer');
            finalMsg.content = streamContent;
          }
          setMessages(prev => [...prev, finalMsg]);
          setStreamContent('');
          setIsStreaming(false);
          // Force scroll to bottom on completion to show final result
          setUserScrolledUp(false);
          break;
        case 'cancelled':
          setStreamContent('');
          setIsStreaming(false);
          break;
        case 'error':
          console.error('WebSocket error:', data.error);
          setStreamContent(prev => prev + '\n\nError: ' + data.error);
          setIsStreaming(false);
          break;
        case 'model_set':
          console.log('Model set to:', data.model);
          break;
        case 'tool_start':
          setStreamContent(prev => `${prev}\n\n> 🔧 **Tool Call:** \`${data.tool}\`\n> \n> Arguments:\n> \`\`\`json\n> ${data.arguments}\n> \`\`\`\n\n`);
          break;
        case 'tool_complete':
          setStreamContent(prev => `${prev}\n\n> ✅ **Tool Result:** \`${data.tool}\`\n\n`);
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (sessionId) {
      connectWebSocket(sessionId);
    }

    return () => {
      wsRef.current?.close();
    };
  }, [sessionId, connectWebSocket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    if (!sessionId) {
      onNewChat();
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsStreaming(true);
      const attachmentIds = pendingAttachments.map(att => att.id);
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: input.trim(),
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      }));
      setInput('');
      setPendingAttachments([]); // Clear attachments after sending
    }
  };

  const handleCancel = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Ensure we're not composing (IME)
      if (e.nativeEvent.isComposing) return;
      
      if (input.trim() && !isStreaming) {
         if (!sessionId) {
            onNewChat();
         } else if (wsRef.current?.readyState === WebSocket.OPEN) {
            setIsStreaming(true);
            const attachmentIds = pendingAttachments.map(att => att.id);
            wsRef.current.send(JSON.stringify({
               type: 'message',
               content: input.trim(),
               attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
            }));
            setInput('');
            setPendingAttachments([]); // Clear attachments after sending
            // Reset height
            if (inputRef.current) inputRef.current.style.height = 'auto';
         }
      }
    }
    // Handle Escape to close command palette
    if (e.key === 'Escape' && showCommandPalette) {
      setShowCommandPalette(false);
      setInput('');
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Initial adjustment and window resize
  useEffect(() => {
    adjustTextareaHeight();
    window.addEventListener('resize', adjustTextareaHeight);
    return () => window.removeEventListener('resize', adjustTextareaHeight);
  }, []);

  const handleInputFocus = () => {
    // slight delay to allow keyboard to appear, then scroll
    setTimeout(() => {
      setUserScrolledUp(false);
      scrollToBottom();
    }, 300);
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setShowModelDropdown(false);
    // Also update the current session's model via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'set_model', model: modelId }));
    }
  };

  const handleCommandSelect = (command: SlashCommand) => {
    setShowCommandPalette(false);
    setInput('');

    // Handle different commands
    switch (command.id) {
      case 'new':
        onNewChat();
        break;
      case 'resume':
        setShowResumeModal(true);
        break;
      case 'session':
        setShowSessionModal(true);
        break;
      case 'context':
        setShowContextModal(true);
        break;
      case 'settings':
        setShowSettingsModal(true);
        break;
      case 'mcp':
      case 'mcp-show':
      case 'mcp-add':
        setShowMCPModal(true);
        break;
      case 'plan':
        setShowPlanModal(true);
        break;
      case 'review':
        setShowReviewModal(true);
        break;
      case 'theme':
        // Cycle through themes
        const themes: ('auto' | 'dark' | 'light')[] = ['auto', 'dark', 'light'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        handleThemeChange(nextTheme);
        break;
      case 'compact':
        // Send compact command to session
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'message',
            content: '/compact',
          }));
        }
        break;
      case 'skills':
        // Open skills modal (handled by parent)
        break;
      default:
        // For other commands, send as message
        if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
          setIsStreaming(true);
          wsRef.current.send(JSON.stringify({
            type: 'message',
            content: command.name,
          }));
        }
    }
  };

  const handleThemeChange = (theme: 'auto' | 'dark' | 'light') => {
    setCurrentTheme(theme);
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const handleCompact = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: '/compact',
      }));
    }
    setShowContextModal(false);
  };

  const handleExecutePlan = (plan: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      setIsStreaming(true);
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: `/plan execute\n${plan}`,
      }));
    }
  };

  const handleRunReview = (scope: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      setIsStreaming(true);
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: `/review ${scope}`,
      }));
    }
  };

  const handleRenameSession = (id: string, name: string) => {
    onRenameSession?.(id, name);
  };

  const handleShareSession = () => {
    // Export session as JSON
    if (session) {
      const exportData = {
        id: session.id,
        name: session.name,
        messages: messages,
        workspace: session.workspace,
        model: session.model,
        createdAt: session.createdAt,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!sessionId) {
      setUploadQueue(files);
      onNewChat();
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const attachment: FileAttachment = await response.json();
        setPendingAttachments(prev => [...prev, attachment]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      // TODO: Show error notification to user
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Effect to handle queued uploads once session is created
  useEffect(() => {
    if (sessionId && uploadQueue) {
      handleFileUpload(uploadQueue);
      setUploadQueue(null);
    }
  }, [sessionId, uploadQueue]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const currentModelInfo = models.find(m => m.id === currentModel);

  // Debug models
  useEffect(() => {
    if (models.length === 0) {
      console.warn('ChatView: No models provided');
    }
  }, [models]);

  const renderMessage = (message: Message) => (
    <div key={message.id} className="message">
      <div className="message-header">
        <div className={`message-avatar ${message.role}`}>
          {message.role === 'user' ? 'U' : <Sparkles size={14} />}
        </div>
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'Copilot'}
        </span>
      </div>
      <div className="message-content">
        {/* Display attachments if present */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map(attachment => (
              <div key={attachment.id} className="message-attachment">
                {isImageFile(attachment.mime_type) ? (
                  <div className="attachment-image-wrapper">
                    <img
                      src={`/api/uploads/${attachment.id}`}
                      alt={attachment.original_filename}
                      className="attachment-image"
                    />
                    <div className="attachment-image-caption">
                      {attachment.original_filename}
                    </div>
                  </div>
                ) : (
                  <a
                    href={`/api/uploads/${attachment.id}`}
                    download={attachment.original_filename}
                    className="attachment-file-link"
                  >
                    <File size={16} />
                    <span className="attachment-file-name">{attachment.original_filename}</span>
                    <span className="attachment-file-size">({formatFileSize(attachment.size)})</span>
                    <Download size={14} className="attachment-download-icon" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <ReactMarkdown
          components={{
            pre: ({ children }) => <pre>{children}</pre>,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );

  return (
    <main className="main-content">
      <header className="main-header">
        <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>
        <span className="header-title">
          {session?.name || 'Copilot SDK'}
        </span>
        <div className="header-actions">
          {/* Session Menu Dropdown */}
          <SessionMenu
            onNewChat={onNewChat}
            onResumeSession={() => setShowResumeModal(true)}
            onShareSession={handleShareSession}
            onViewSessionInfo={() => setShowSessionModal(true)}
          />

          {/* Settings Dropdown */}
          <SettingsDropdown
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            onOpenContext={() => setShowContextModal(true)}
            onOpenUsage={() => setShowContextModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
          />

          {/* Model Selector */}
          <div className="model-selector" ref={dropdownRef}>
            <button
              className="model-selector-btn"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              <span className="model-name">{currentModelInfo?.name || currentModel}</span>
              <ChevronDown size={16} />
            </button>
            {showModelDropdown && (
              <div className="model-dropdown">
                <div className="model-dropdown-header">Select Model</div>
                {models.length === 0 && (
                   <div className="empty-state-model" style={{padding: '16px', textAlign: 'center'}}>
                     No models available
                   </div>
                )}
                {['Anthropic', 'OpenAI', 'Google'].map(provider => {
                  const providerModels = models.filter(m => m.provider === provider);
                  if (providerModels.length === 0) return null;
                  return (
                    <div key={provider} className="model-group">
                      <div className="model-group-title">{provider}</div>
                      {providerModels.map(model => (
                        <div
                          key={model.id}
                          className={`model-option ${model.id === currentModel ? 'active' : ''}`}
                          onClick={() => handleModelSelect(model.id)}
                        >
                          {model.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* Catch-all for other providers */}
                {(() => {
                  const knownProviders = ['Anthropic', 'OpenAI', 'Google'];
                  const otherModels = models.filter(m => !knownProviders.includes(m.provider));
                  if (otherModels.length === 0) return null;
                  return (
                    <div key="other" className="model-group">
                      <div className="model-group-title">Other</div>
                      {otherModels.map(model => (
                        <div
                          key={model.id}
                          className={`model-option ${model.id === currentModel ? 'active' : ''}`}
                          onClick={() => handleModelSelect(model.id)}
                        >
                          {model.name}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="chat-container">
        <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {messages.length === 0 && !streamContent ? (
            <div className="empty-state">
              <h2>What can I help with?</h2>
              <p className="empty-state-model">Using {currentModelInfo?.name || currentModel}</p>
              <p className="empty-state-hint">Type / to see available commands</p>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              {isStreaming && !streamContent && (
                <div className="message">
                  <div className="message-header">
                    <div className="message-avatar assistant">
                      <Sparkles size={14} />
                    </div>
                    <span className="message-role">Copilot</span>
                  </div>
                  <div className="message-content">
                    <div className="thinking-indicator">
                      <div className="thinking-animation">
                        <div className="thinking-circle"></div>
                        <div className="thinking-circle"></div>
                        <div className="thinking-circle"></div>
                      </div>
                      <span className="thinking-text">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {isStreaming && streamContent && (
                <div className="message">
                  <div className="message-header">
                    <div className="message-avatar assistant">
                      <Sparkles size={14} />
                    </div>
                    <span className="message-role">Copilot</span>
                    <div className="streaming-indicator">
                      <div className="streaming-dot" />
                      <div className="streaming-dot" />
                      <div className="streaming-dot" />
                    </div>
                  </div>
                  <div className="message-content">
                    <ReactMarkdown>{streamContent}</ReactMarkdown>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="input-container">
          {/* File Attachments Preview */}
          {pendingAttachments.length > 0 && (
            <div className="attachments-preview">
              {pendingAttachments.map(attachment => (
                <div key={attachment.id} className="attachment-chip">
                  {isImageFile(attachment.mime_type) ? (
                    <div className="attachment-thumbnail">
                      <img src={`/api/uploads/${attachment.id}`} alt={attachment.original_filename} />
                    </div>
                  ) : (
                    <div className="attachment-icon">
                      <File size={16} />
                    </div>
                  )}
                  <div className="attachment-info">
                    <span className="attachment-name">{attachment.original_filename}</span>
                    <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="input-wrapper" onSubmit={handleSubmit}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileInputChange}
              style={{ display: 'none' }}
              accept="*/*"
            />
            
            {/* Attach button */}
            <button
              type="button"
              className="attach-button"
              onClick={handleAttachClick}
              disabled={isStreaming || isUploading}
              aria-label="Attach files"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask anything (type / for commands)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              rows={1}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                className="send-button active"
                onClick={handleCancel}
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className={`send-button ${input.trim() ? 'active' : ''}`}
                disabled={!input.trim()}
              >
                <Send size={16} />
              </button>
            )}
          </form>

          {/* Command Palette */}
          <CommandPalette
            isOpen={showCommandPalette}
            inputValue={input}
            onClose={() => setShowCommandPalette(false)}
            onSelect={handleCommandSelect}
            anchorRect={inputRect}
          />
        </div>
      </div>

      {/* Modals */}
      <SessionModal
        session={session}
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onRename={handleRenameSession}
      />

      <ContextModal
        isOpen={showContextModal}
        onClose={() => setShowContextModal(false)}
        sessionId={sessionId}
        onCompact={handleCompact}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <MCPModal
        isOpen={showMCPModal}
        onClose={() => setShowMCPModal(false)}
      />

      <PlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        sessionId={sessionId}
        onExecutePlan={handleExecutePlan}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        sessionId={sessionId}
        workspace={workspace}
        onRunReview={handleRunReview}
      />
    </main>
  );
}
