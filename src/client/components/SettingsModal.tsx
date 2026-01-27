import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Shield,
  Palette,
  Zap,
  FileText,
  Globe,
  Terminal,
  Monitor,
  Moon,
  Sun,
  Check,
} from 'lucide-react';

interface AppSettings {
  theme: 'auto' | 'dark' | 'light';
  streaming: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  permissions: {
    allowAllTools: boolean;
    allowAllPaths: boolean;
    allowAllUrls: boolean;
    noAskUser: boolean;
    disableParallelTools: boolean;
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  streaming: true,
  logLevel: 'info',
  permissions: {
    allowAllTools: false,
    allowAllPaths: false,
    allowAllUrls: false,
    noAskUser: false,
    disableParallelTools: false,
  },
};

export default function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
    setLoading(false);
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSettingsChange?.(newSettings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const updatePermission = (key: keyof AppSettings['permissions'], value: boolean) => {
    const newSettings = {
      ...settings,
      permissions: { ...settings.permissions, [key]: value },
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const applyTheme = (theme: 'auto' | 'dark' | 'light') => {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const handleThemeChange = (theme: 'auto' | 'dark' | 'light') => {
    updateSetting('theme', theme);
    applyTheme(theme);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Settings size={20} />
            Settings
          </h2>
          <div className="modal-header-actions">
            {saved && (
              <span className="save-indicator">
                <Check size={14} /> Saved
              </span>
            )}
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Palette size={16} />
              General
            </button>
            <button
              className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              <Shield size={16} />
              Permissions
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Loading settings...</div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="settings-section">
                  {/* Theme */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Palette size={16} />
                        Theme
                      </div>
                      <div className="setting-description">
                        Choose your preferred color theme
                      </div>
                    </div>
                    <div className="theme-selector">
                      <button
                        className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}
                        onClick={() => handleThemeChange('auto')}
                      >
                        <Monitor size={16} />
                        Auto
                      </button>
                      <button
                        className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                        onClick={() => handleThemeChange('dark')}
                      >
                        <Moon size={16} />
                        Dark
                      </button>
                      <button
                        className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                        onClick={() => handleThemeChange('light')}
                      >
                        <Sun size={16} />
                        Light
                      </button>
                    </div>
                  </div>

                  {/* Streaming */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Zap size={16} />
                        Streaming Responses
                      </div>
                      <div className="setting-description">
                        Show responses as they're generated
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.streaming}
                        onChange={e => updateSetting('streaming', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Log Level */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Terminal size={16} />
                        Log Level
                      </div>
                      <div className="setting-description">
                        Control console log verbosity
                      </div>
                    </div>
                    <select
                      className="form-select"
                      value={settings.logLevel}
                      onChange={e => updateSetting('logLevel', e.target.value as AppSettings['logLevel'])}
                    >
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="settings-section">
                  <div className="permissions-warning">
                    <Shield size={16} />
                    <span>
                      These settings control what the AI assistant can do. Enable with caution.
                    </span>
                  </div>

                  {/* Allow All Tools */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Terminal size={16} />
                        Allow All Tools
                      </div>
                      <div className="setting-description">
                        Skip confirmation for all tool calls
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.permissions.allowAllTools}
                        onChange={e => updatePermission('allowAllTools', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Allow All Paths */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <FileText size={16} />
                        Allow All Paths
                      </div>
                      <div className="setting-description">
                        Allow access to all filesystem paths
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.permissions.allowAllPaths}
                        onChange={e => updatePermission('allowAllPaths', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Allow All URLs */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Globe size={16} />
                        Allow All URLs
                      </div>
                      <div className="setting-description">
                        Allow fetching from any URL
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.permissions.allowAllUrls}
                        onChange={e => updatePermission('allowAllUrls', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* No Ask User */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Zap size={16} />
                        Autonomous Mode
                      </div>
                      <div className="setting-description">
                        Don't ask for confirmation (use with caution)
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.permissions.noAskUser}
                        onChange={e => updatePermission('noAskUser', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Disable Parallel Tools */}
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-label">
                        <Settings size={16} />
                        Disable Parallel Tools
                      </div>
                      <div className="setting-description">
                        Run tool calls sequentially instead of in parallel
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.permissions.disableParallelTools}
                        onChange={e => updatePermission('disableParallelTools', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
