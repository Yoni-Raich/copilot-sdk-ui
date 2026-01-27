import React from 'react';
import {
  MessageSquarePlus,
  Search,
  Puzzle,
  FolderOpen,
  Trash2,
  MessageSquare,
  Settings,
  User,
  Server,
  ClipboardList,
  FileSearch,
  Zap,
  LogIn,
  LogOut,
  FolderPlus,
  ChevronRight,
} from 'lucide-react';
import { Session } from '../types';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSkills: () => void;
  onOpenWorkspace: () => void;
  onOpenMCP?: () => void;
  onOpenPlan?: () => void;
  onOpenReview?: () => void;
  onCompact?: () => void;
  workspace: string;
  isOpen: boolean;
  onToggle: () => void;
  isLoggedIn?: boolean;
  userName?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSkills,
  onOpenWorkspace,
  onOpenMCP,
  onOpenPlan,
  onOpenReview,
  onCompact,
  workspace,
  isOpen,
  onToggle,
  isLoggedIn = false,
  userName,
  onLogin,
  onLogout,
}: SidebarProps) {
  const getWorkspaceName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onToggle} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Copilot SDK
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Main Actions */}
          <div className="nav-item" onClick={onNewChat}>
            <MessageSquarePlus size={18} />
            New chat
          </div>

          <div className="nav-item">
            <Search size={18} />
            Search chats
          </div>

          {/* Quick Actions Section */}
          <div className="nav-section">
            <div className="nav-section-title">Quick Actions</div>

            <div className="nav-item" onClick={onOpenPlan}>
              <ClipboardList size={18} />
              Plan Mode
              <ChevronRight size={14} className="nav-item-arrow" />
            </div>

            <div className="nav-item" onClick={onOpenReview}>
              <FileSearch size={18} />
              Code Review
              <ChevronRight size={14} className="nav-item-arrow" />
            </div>

            <div className="nav-item" onClick={onCompact}>
              <Zap size={18} />
              Compact Context
            </div>
          </div>

          {/* Workspace Section */}
          <div className="nav-section">
            <div className="nav-section-title">Workspace</div>

            <div className="nav-item" onClick={onOpenWorkspace}>
              <FolderOpen size={18} />
              Change Directory
            </div>

            <div className="nav-item" onClick={onOpenSkills}>
              <Puzzle size={18} />
              Skills
              <ChevronRight size={14} className="nav-item-arrow" />
            </div>
          </div>

          {/* MCP Servers Section */}
          <div className="nav-section">
            <div className="nav-section-title">MCP Servers</div>

            <div className="nav-item" onClick={onOpenMCP}>
              <Server size={18} />
              Manage Servers
              <ChevronRight size={14} className="nav-item-arrow" />
            </div>
          </div>

          {/* Recent Chats */}
          {sessions.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Recent Chats</div>
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <MessageSquare size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.name}
                    </span>
                  </div>
                  <button
                    className="delete-btn btn-ghost btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item workspace-indicator" onClick={onOpenWorkspace}>
            <FolderOpen size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {getWorkspaceName(workspace)}
            </span>
          </div>

          {/* User Profile Section */}
          <div className="user-section">
            {isLoggedIn ? (
              <>
                <div className="user-profile">
                  <div className="user-avatar">
                    <User size={16} />
                  </div>
                  <span className="user-name">{userName || 'User'}</span>
                </div>
                <button
                  className="btn btn-ghost btn-icon logout-btn"
                  onClick={onLogout}
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div className="user-profile login-prompt" onClick={onLogin}>
                <div className="user-avatar">
                  <User size={16} />
                </div>
                <span className="user-name">Log in</span>
                <LogIn size={16} className="login-icon" />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
