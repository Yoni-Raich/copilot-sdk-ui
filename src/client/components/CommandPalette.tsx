import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquarePlus,
  History,
  Share2,
  Info,
  Palette,
  BarChart2,
  Database,
  FileText,
  ClipboardList,
  FileSearch,
  Zap,
  Server,
  LogIn,
  LogOut,
  FolderPlus,
  List,
  Settings,
  Terminal,
  Folder,
  User,
  Command,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  category: 'session' | 'settings' | 'workspace' | 'tools' | 'auth' | 'mcp';
  icon: React.ReactNode;
  shortcut?: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  // Session Commands
  { id: 'new', name: '/new', description: 'Start a new chat session', category: 'session', icon: <MessageSquarePlus size={16} /> },
  { id: 'resume', name: '/resume', description: 'Resume a previous session', category: 'session', icon: <History size={16} /> },
  { id: 'share', name: '/share', description: 'Export or share current session', category: 'session', icon: <Share2 size={16} /> },
  { id: 'session', name: '/session', description: 'View session info and details', category: 'session', icon: <Info size={16} /> },

  // Settings Commands
  { id: 'theme', name: '/theme', description: 'Change theme (auto/dark/light)', category: 'settings', icon: <Palette size={16} /> },
  { id: 'context', name: '/context', description: 'View context window usage', category: 'settings', icon: <BarChart2 size={16} /> },
  { id: 'usage', name: '/usage', description: 'View usage statistics', category: 'settings', icon: <Database size={16} /> },
  { id: 'settings', name: '/settings', description: 'Open settings modal', category: 'settings', icon: <Settings size={16} /> },

  // Workspace Commands
  { id: 'cwd', name: '/cwd', description: 'Show current working directory', category: 'workspace', icon: <Folder size={16} /> },
  { id: 'add-dir', name: '/add-dir', description: 'Add directory to workspace', category: 'workspace', icon: <FolderPlus size={16} /> },
  { id: 'list-dirs', name: '/list-dirs', description: 'List allowed directories', category: 'workspace', icon: <List size={16} /> },

  // Tools Commands
  { id: 'plan', name: '/plan', description: 'Enter plan mode for complex tasks', category: 'tools', icon: <ClipboardList size={16} /> },
  { id: 'review', name: '/review', description: 'Review code changes', category: 'tools', icon: <FileSearch size={16} /> },
  { id: 'compact', name: '/compact', description: 'Compact context to save tokens', category: 'tools', icon: <Zap size={16} /> },
  { id: 'skills', name: '/skills', description: 'Manage skills', category: 'tools', icon: <Command size={16} /> },

  // MCP Commands
  { id: 'mcp', name: '/mcp', description: 'Manage MCP servers', category: 'mcp', icon: <Server size={16} /> },
  { id: 'mcp-show', name: '/mcp show', description: 'List MCP servers', category: 'mcp', icon: <Server size={16} /> },
  { id: 'mcp-add', name: '/mcp add', description: 'Add MCP server', category: 'mcp', icon: <Server size={16} /> },

  // Auth Commands
  { id: 'user', name: '/user', description: 'View current user info', category: 'auth', icon: <User size={16} /> },
  { id: 'login', name: '/login', description: 'Log in to GitHub Copilot', category: 'auth', icon: <LogIn size={16} /> },
  { id: 'logout', name: '/logout', description: 'Log out from GitHub Copilot', category: 'auth', icon: <LogOut size={16} /> },
];

const CATEGORY_LABELS: Record<string, string> = {
  session: 'Session',
  settings: 'Settings',
  workspace: 'Workspace',
  tools: 'Tools',
  mcp: 'MCP Servers',
  auth: 'Authentication',
};

interface CommandPaletteProps {
  isOpen: boolean;
  inputValue: string;
  onClose: () => void;
  onSelect: (command: SlashCommand) => void;
  anchorRect?: DOMRect | null;
}

export default function CommandPalette({
  isOpen,
  inputValue,
  onClose,
  onSelect,
  anchorRect,
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Filter commands based on input
  const searchTerm = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : '';
  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(searchTerm) ||
    cmd.description.toLowerCase().includes(searchTerm)
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  // Flatten for keyboard navigation
  const flatCommands = Object.values(groupedCommands).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % flatCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            onSelect(flatCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatCommands, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || flatCommands.length === 0) return null;

  let currentGlobalIndex = 0;

  return (
    <div
      ref={paletteRef}
      className="command-palette"
      style={{
        bottom: anchorRect ? `calc(100vh - ${anchorRect.top}px + 8px)` : undefined,
        left: anchorRect ? anchorRect.left : undefined,
      }}
    >
      <div className="command-palette-header">
        <Terminal size={14} />
        <span>Commands</span>
      </div>
      <div className="command-palette-list">
        {Object.entries(groupedCommands).map(([category, commands]) => (
          <div key={category} className="command-group">
            <div className="command-group-title">{CATEGORY_LABELS[category]}</div>
            {commands.map((cmd) => {
              const index = currentGlobalIndex++;
              return (
                <div
                  key={cmd.id}
                  className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => onSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="command-icon">{cmd.icon}</span>
                  <div className="command-info">
                    <span className="command-name">{cmd.name}</span>
                    <span className="command-description">{cmd.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export { SLASH_COMMANDS, CATEGORY_LABELS };
