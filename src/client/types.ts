export interface Session {
  id: string;
  name: string;
  messages: Message[];
  workspace: string;
  messageCount?: number;
  createdAt: string;
  model?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
}
