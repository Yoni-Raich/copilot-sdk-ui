import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  MessageSquarePlus,
  Share2,
  Info,
  Palette,
  BarChart2,
  Database,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  History,
} from 'lucide-react';

// Session Menu Dropdown
interface SessionMenuProps {
  onNewChat: () => void;
  onShareSession: () => void;
  onViewSessionInfo: () => void;
}

export function SessionMenu({
  onNewChat,
  onShareSession,
  onViewSessionInfo,
}: SessionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="header-dropdown" ref={dropdownRef}>
      <button
        className="header-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Session"
      >
        <History size={18} />
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="header-dropdown-menu">
          <div className="dropdown-header">Session</div>
          <div
            className="dropdown-item"
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
          >
            <MessageSquarePlus size={16} />
            <span>New Chat</span>
            <span className="shortcut">Ctrl+N</span>
          </div>
          <div className="dropdown-divider" />
          <div
            className="dropdown-item"
            onClick={() => {
              onShareSession();
              setIsOpen(false);
            }}
          >
            <Share2 size={16} />
            <span>Share / Export</span>
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              onViewSessionInfo();
              setIsOpen(false);
            }}
          >
            <Info size={16} />
            <span>Session Info</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Dropdown
interface SettingsDropdownProps {
  currentTheme: 'auto' | 'dark' | 'light';
  onThemeChange: (theme: 'auto' | 'dark' | 'light') => void;
  onOpenContext: () => void;
  onOpenUsage: () => void;
  onOpenSettings: () => void;
}

export function SettingsDropdown({
  currentTheme,
  onThemeChange,
  onOpenContext,
  onOpenUsage,
  onOpenSettings,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'dark':
        return <Moon size={16} />;
      case 'light':
        return <Sun size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  return (
    <div className="header-dropdown" ref={dropdownRef}>
      <button
        className="header-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
      >
        <Settings size={18} />
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="header-dropdown-menu settings-menu">
          <div className="dropdown-header">Settings</div>

          {/* Theme Submenu */}
          <div className="dropdown-submenu">
            <div className="dropdown-item submenu-trigger">
              <Palette size={16} />
              <span>Theme</span>
              <span className="current-value">{currentTheme}</span>
            </div>
            <div className="theme-options">
              <button
                className={`theme-btn ${currentTheme === 'auto' ? 'active' : ''}`}
                onClick={() => {
                  onThemeChange('auto');
                }}
                title="Auto"
              >
                <Monitor size={14} />
              </button>
              <button
                className={`theme-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  onThemeChange('dark');
                }}
                title="Dark"
              >
                <Moon size={14} />
              </button>
              <button
                className={`theme-btn ${currentTheme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  onThemeChange('light');
                }}
                title="Light"
              >
                <Sun size={14} />
              </button>
            </div>
          </div>

          <div className="dropdown-divider" />

          <div
            className="dropdown-item"
            onClick={() => {
              onOpenContext();
              setIsOpen(false);
            }}
          >
            <BarChart2 size={16} />
            <span>Context Usage</span>
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              onOpenUsage();
              setIsOpen(false);
            }}
          >
            <Database size={16} />
            <span>Usage Stats</span>
          </div>

          <div className="dropdown-divider" />

          <div
            className="dropdown-item"
            onClick={() => {
              onOpenSettings();
              setIsOpen(false);
            }}
          >
            <Settings size={16} />
            <span>All Settings</span>
          </div>

          {/* User section */}
        </div>
      )}
    </div>
  );
}
