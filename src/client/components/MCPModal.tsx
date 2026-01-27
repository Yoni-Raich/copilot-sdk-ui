import React, { useState, useEffect } from 'react';
import { X, Server, Plus, Trash2, Power, PowerOff, Settings, Edit2, Save, ExternalLink } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: 'running' | 'stopped' | 'error';
}

interface MCPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MCPModal({ isOpen, onClose }: MCPModalProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newServer, setNewServer] = useState({
    name: '',
    command: '',
    args: '',
    env: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchServers();
    }
  }, [isOpen]);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      } else {
        // Demo data
        setServers([
          {
            id: '1',
            name: 'filesystem',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed'],
            enabled: true,
            status: 'running',
          },
          {
            id: '2',
            name: 'github',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '***' },
            enabled: false,
            status: 'stopped',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
      setServers([]);
    }
    setLoading(false);
  };

  const handleToggle = async (serverId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setServers(prev =>
          prev.map(s => (s.id === serverId ? { ...s, enabled, status: enabled ? 'running' : 'stopped' } : s))
        );
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      // Optimistic update for demo
      setServers(prev =>
        prev.map(s => (s.id === serverId ? { ...s, enabled, status: enabled ? 'running' : 'stopped' } : s))
      );
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return;

    try {
      const res = await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' });
      if (res.ok) {
        setServers(prev => prev.filter(s => s.id !== serverId));
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
      setServers(prev => prev.filter(s => s.id !== serverId));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newServer.name.trim() || !newServer.command.trim()) {
      setFormError('Name and command are required');
      return;
    }

    try {
      const serverData = {
        name: newServer.name.trim(),
        command: newServer.command.trim(),
        args: newServer.args.trim() ? newServer.args.split(' ') : [],
        env: newServer.env.trim()
          ? Object.fromEntries(
              newServer.env.split('\n').map(line => {
                const [key, ...value] = line.split('=');
                return [key.trim(), value.join('=').trim()];
              })
            )
          : undefined,
      };

      const res = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });

      if (res.ok) {
        const added = await res.json();
        setServers(prev => [...prev, added]);
        setNewServer({ name: '', command: '', args: '', env: '' });
        setActiveTab('list');
      } else {
        // Demo: add locally
        const demoServer: MCPServer = {
          id: Date.now().toString(),
          name: serverData.name,
          command: serverData.command,
          args: serverData.args,
          env: serverData.env,
          enabled: false,
          status: 'stopped',
        };
        setServers(prev => [...prev, demoServer]);
        setNewServer({ name: '', command: '', args: '', env: '' });
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Failed to add server:', error);
      setFormError('Failed to add server');
    }
  };

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'running':
        return 'var(--success-color)';
      case 'error':
        return 'var(--error-color)';
      default:
        return 'var(--text-muted)';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Server size={20} />
            MCP Servers
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Servers
            </button>
            <button
              className={`tab ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              Add Server
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="mcp-list">
              {loading ? (
                <div className="loading-state">Loading servers...</div>
              ) : servers.length === 0 ? (
                <div className="empty-state-small">
                  <Server size={32} />
                  <p>No MCP servers configured</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('add')}>
                    <Plus size={16} />
                    Add Server
                  </button>
                </div>
              ) : (
                servers.map(server => (
                  <div key={server.id} className="mcp-item">
                    <div className="mcp-status">
                      <div
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(server.status) }}
                        title={server.status}
                      />
                    </div>
                    <div className="mcp-info">
                      <div className="mcp-name">{server.name}</div>
                      <div className="mcp-command">
                        <code>{server.command} {server.args?.join(' ')}</code>
                      </div>
                    </div>
                    <div className="mcp-actions">
                      <button
                        className={`btn btn-ghost btn-icon toggle-btn ${server.enabled ? 'enabled' : ''}`}
                        onClick={() => handleToggle(server.id, !server.enabled)}
                        title={server.enabled ? 'Disable' : 'Enable'}
                      >
                        {server.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDelete(server.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <form className="mcp-form" onSubmit={handleAdd}>
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">Server Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., filesystem"
                  value={newServer.name}
                  onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Command</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., npx"
                  value={newServer.command}
                  onChange={e => setNewServer({ ...newServer, command: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Arguments (space-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem /path"
                  value={newServer.args}
                  onChange={e => setNewServer({ ...newServer, args: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Environment Variables (KEY=value, one per line)</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="GITHUB_TOKEN=your-token"
                  value={newServer.env}
                  onChange={e => setNewServer({ ...newServer, env: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-info">
                <ExternalLink size={14} />
                <a href="https://modelcontextprotocol.io/docs/servers" target="_blank" rel="noopener noreferrer">
                  Browse available MCP servers
                </a>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('list')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  Add Server
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
