export interface Session {
  id: string;
  name: string;
  messages: Message[];
  workspace: string;
  messageCount?: number;
  createdAt: string;
  model?: string;
}

export interface FileAttachment {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  path: string;
  size: number;
  mime_type: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
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

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  status: 'running' | 'complete' | 'error';
  result?: string;
}
