import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import SkillsModal from './components/SkillsModal';
import WorkspaceModal from './components/WorkspaceModal';
import InstructionsModal from './components/InstructionsModal';
import MCPModal from './components/MCPModal';
import { Session, Skill, Model } from './types';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workspace, setWorkspace] = useState<string>('');
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showMCPModal, setShowMCPModal] = useState(false);
  // pendingModal lets sidebar trigger modals rendered inside ChatView (which has WS access)
  const [pendingModal, setPendingModal] = useState<string | null>(null);
  // Start with sidebar closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('claude-sonnet-4');

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-close sidebar when switching to mobile
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  useEffect(() => {
    fetchSessions();
    fetchWorkspace();
    fetchSkills();
    fetchModels();
  }, []);

  useEffect(() => {
    if (workspace) {
      fetchSkills();
    }
  }, [workspace]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models);
      setCurrentModel(data.current);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspace');
      const data = await res.json();
      setWorkspace(data.workspace);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch(`/api/skills?workspace=${encodeURIComponent(workspace)}`);
      const data = await res.json();
      setSkills(data);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Chat', workspace, model: currentModel }),
      });
      const session = await res.json();
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const renameSession = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/session/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const updateWorkspace = async (newWorkspace: string) => {
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: newWorkspace }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
        setShowWorkspaceModal(false);
      }
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  };

  const updateModel = async (model: string) => {
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      setCurrentModel(model);
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  const handleCompact = useCallback(() => {
    // This will be handled by ChatView via WebSocket
    console.log('Compact context requested');
  }, []);

  // Close sidebar on mobile after action
  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleNewChat = useCallback(() => {
    createSession();
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="app-container">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
        onOpenSkills={() => { setShowSkillsModal(true); closeSidebarOnMobile(); }}
        onOpenWorkspace={() => { setShowWorkspaceModal(true); closeSidebarOnMobile(); }}
        onOpenInstructions={() => { setShowInstructionsModal(true); closeSidebarOnMobile(); }}
        onOpenMCP={() => { setShowMCPModal(true); closeSidebarOnMobile(); }}
        onOpenPlan={() => { setPendingModal('plan'); closeSidebarOnMobile(); }}
        onOpenReview={() => { setPendingModal('review'); closeSidebarOnMobile(); }}
        onCompact={() => { handleCompact(); closeSidebarOnMobile(); }}
        workspace={workspace}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <ChatView
        session={activeSession}
        sessionId={activeSessionId}
        workspace={workspace}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={createSession}
        models={models}
        currentModel={currentModel}
        onModelChange={updateModel}
        onSelectSession={setActiveSessionId}
        onRenameSession={renameSession}
        onOpenMCP={() => setShowMCPModal(true)}
        pendingModal={pendingModal}
        onModalOpened={() => setPendingModal(null)}
      />

      {showSkillsModal && (
        <SkillsModal
          skills={skills}
          workspace={workspace}
          onClose={() => setShowSkillsModal(false)}
          onRefresh={fetchSkills}
        />
      )}

      {showWorkspaceModal && (
        <WorkspaceModal
          currentWorkspace={workspace}
          onClose={() => setShowWorkspaceModal(false)}
          onSelect={updateWorkspace}
        />
      )}

      {showInstructionsModal && (
        <InstructionsModal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          workspace={workspace}
        />
      )}

      {showMCPModal && (
        <MCPModal
          isOpen={showMCPModal}
          onClose={() => setShowMCPModal(false)}
        />
      )}
    </div>
  );
}
