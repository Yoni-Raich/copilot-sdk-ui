import express, { Request, Response } from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';

const app = express();
const wsInstance = expressWs(app);
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Available models from Copilot CLI
const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex', provider: 'OpenAI' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', provider: 'OpenAI' },
  { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', provider: 'OpenAI' },
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI' },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', provider: 'OpenAI' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'Google' },
];

// Types
interface Session {
  id: string;
  name: string;
  messages: Message[];
  workspace: string;
  createdAt: Date;
  copilotSessionId?: string;
  model: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Skill {
  name: string;
  description: string;
  path: string;
}

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: 'running' | 'stopped' | 'error';
}

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

interface Plan {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

// Store active sessions and their WebSocket connections
const sessions: Map<string, Session> = new Map();
const activeProcesses: Map<string, ChildProcess> = new Map();
const mcpServers: Map<string, MCPServer> = new Map();
const sessionPlans: Map<string, Plan[]> = new Map();
let currentWorkspace = process.cwd();
let currentModel = 'claude-sonnet-4';
let appSettings: AppSettings = {
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

// Helper to read skills from .claude/skills directory
async function getSkills(workspace: string): Promise<Skill[]> {
  const skillsDir = path.join(workspace, '.claude', 'skills');
  const skills: Skill[] = [];

  try {
    if (!existsSync(skillsDir)) {
      return skills;
    }

    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            skills.push({
              name: nameMatch?.[1] || entry.name,
              description: descMatch?.[1] || 'No description',
              path: skillPath,
            });
          }
        } catch {
          // Skip if SKILL.md doesn't exist
        }
      }
    }
  } catch (error) {
    console.error('Error reading skills:', error);
  }

  return skills;
}

// Get directory listing
async function getDirectoryListing(dirPath: string): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(dirPath, entry.name),
  }));
}

// API Routes

// Models
app.get('/api/models', (_req: Request, res: Response) => {
  res.json({ models: AVAILABLE_MODELS, current: currentModel });
});

app.post('/api/models', (req: Request, res: Response) => {
  const { model } = req.body;
  if (AVAILABLE_MODELS.find(m => m.id === model)) {
    currentModel = model;
    res.json({ model: currentModel });
  } else {
    res.status(400).json({ error: 'Invalid model' });
  }
});

// Sessions
app.get('/api/sessions', (_req: Request, res: Response) => {
  const sessionList = Array.from(sessions.values()).map(s => ({
    id: s.id,
    name: s.name,
    workspace: s.workspace,
    messageCount: s.messages.length,
    createdAt: s.createdAt,
    model: s.model,
  }));
  res.json(sessionList);
});

app.post('/api/sessions', (req: Request, res: Response) => {
  const { name, workspace, model } = req.body;
  const session: Session = {
    id: uuidv4(),
    name: name || 'New Chat',
    messages: [],
    workspace: workspace || currentWorkspace,
    createdAt: new Date(),
    model: model || currentModel,
  };
  sessions.set(session.id, session);
  res.json(session);
});

app.get('/api/sessions/:id', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

app.delete('/api/sessions/:id', (req: Request, res: Response) => {
  const proc = activeProcesses.get(req.params.id);
  if (proc) {
    proc.kill();
    activeProcesses.delete(req.params.id);
  }
  sessions.delete(req.params.id);
  res.json({ success: true });
});

// Skills
app.get('/api/skills', async (req: Request, res: Response) => {
  const workspace = (req.query.workspace as string) || currentWorkspace;
  const skills = await getSkills(workspace);
  res.json(skills);
});

app.post('/api/skills/create', async (req: Request, res: Response) => {
  const { name, workspace } = req.body;
  const skillsDir = path.join(workspace || currentWorkspace, '.claude', 'skills', name);

  try {
    await fs.mkdir(skillsDir, { recursive: true });

    const skillContent = `---
name: ${name}
description: Add your skill description here. Describe what the skill does and when it should be used.
---

# ${name}

Add your skill instructions here.

## Usage

Describe how to use this skill.

## Examples

Provide examples of using this skill.
`;

    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), skillContent);

    res.json({ success: true, path: skillsDir });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skills/import', async (req: Request, res: Response) => {
  const { url, workspace } = req.body;

  try {
    // Fetch skill from URL (assuming raw GitHub URL)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch skill from URL');
    }

    const content = await response.text();
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const nameMatch = frontmatterMatch?.[1].match(/name:\s*(.+)/);
    const skillName = nameMatch?.[1] || 'imported-skill';

    const skillsDir = path.join(workspace || currentWorkspace, '.claude', 'skills', skillName);
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), content);

    res.json({ success: true, name: skillName, path: skillsDir });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/skills/:name', async (req: Request, res: Response) => {
  const workspace = (req.query.workspace as string) || currentWorkspace;
  const skillPath = path.join(workspace, '.claude', 'skills', req.params.name);

  try {
    await fs.rm(skillPath, { recursive: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workspace
app.get('/api/workspace', (_req: Request, res: Response) => {
  res.json({ workspace: currentWorkspace });
});

app.post('/api/workspace', (req: Request, res: Response) => {
  const { workspace } = req.body;
  if (existsSync(workspace)) {
    currentWorkspace = workspace;
    res.json({ workspace: currentWorkspace });
  } else {
    res.status(400).json({ error: 'Directory does not exist' });
  }
});

app.get('/api/files', async (req: Request, res: Response) => {
  const dirPath = (req.query.path as string) || currentWorkspace;
  try {
    const files = await getDirectoryListing(dirPath);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/file', async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: 'Path required' });
    return;
  }
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/file', async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;
  try {
    await fs.writeFile(filePath, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Session Info
app.get('/api/session/:id/info', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({
    id: session.id,
    name: session.name,
    copilotSessionId: session.copilotSessionId,
    createdAt: session.createdAt,
    workspace: session.workspace,
    model: session.model,
    messageCount: session.messages.length,
  });
});

app.patch('/api/session/:id', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const { name } = req.body;
  if (name) {
    session.name = name;
  }
  res.json(session);
});

// Context Usage (simulated - actual implementation would need Copilot CLI integration)
app.get('/api/context', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const session = sessionId ? sessions.get(sessionId) : null;

  // Estimate token usage based on message content
  let messageTokens = 0;
  if (session) {
    session.messages.forEach(msg => {
      // Rough estimate: 4 characters per token
      messageTokens += Math.ceil(msg.content.length / 4);
    });
  }

  res.json({
    totalTokens: messageTokens + 2500 + 1000, // messages + system + other
    maxTokens: 128000,
    breakdown: {
      systemPrompt: 2500,
      messages: messageTokens,
      files: 0,
      tools: 500,
      other: 500,
    },
    compactSuggested: messageTokens > 80000,
  });
});

// Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(appSettings);
});

app.post('/api/settings', (req: Request, res: Response) => {
  appSettings = { ...appSettings, ...req.body };
  res.json(appSettings);
});

// MCP Servers
app.get('/api/mcp/servers', (_req: Request, res: Response) => {
  res.json(Array.from(mcpServers.values()));
});

app.post('/api/mcp/servers', (req: Request, res: Response) => {
  const { name, command, args, env } = req.body;
  const server: MCPServer = {
    id: uuidv4(),
    name,
    command,
    args,
    env,
    enabled: false,
    status: 'stopped',
  };
  mcpServers.set(server.id, server);
  res.json(server);
});

app.patch('/api/mcp/servers/:id', (req: Request, res: Response) => {
  const server = mcpServers.get(req.params.id);
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }
  const { enabled, name, command, args, env } = req.body;
  if (enabled !== undefined) server.enabled = enabled;
  if (name) server.name = name;
  if (command) server.command = command;
  if (args) server.args = args;
  if (env) server.env = env;
  server.status = server.enabled ? 'running' : 'stopped';
  res.json(server);
});

app.delete('/api/mcp/servers/:id', (req: Request, res: Response) => {
  mcpServers.delete(req.params.id);
  res.json({ success: true });
});

// Plans
app.get('/api/session/:id/plan', (req: Request, res: Response) => {
  const plans = sessionPlans.get(req.params.id) || [];
  const activePlan = plans.find(p => p.status === 'active' || p.status === 'draft');
  if (activePlan) {
    res.json(activePlan);
  } else {
    res.status(404).json({ error: 'No active plan' });
  }
});

app.post('/api/session/:id/plan', (req: Request, res: Response) => {
  const { title, content } = req.body;
  const plan: Plan = {
    id: uuidv4(),
    title: title || 'Untitled Plan',
    content,
    status: 'draft',
    createdAt: new Date(),
  };

  const plans = sessionPlans.get(req.params.id) || [];
  // Mark previous plans as completed
  plans.forEach(p => {
    if (p.status !== 'completed') p.status = 'completed';
  });
  plans.unshift(plan);
  sessionPlans.set(req.params.id, plans);

  res.json(plan);
});

app.get('/api/session/:id/plans', (req: Request, res: Response) => {
  const plans = sessionPlans.get(req.params.id) || [];
  res.json(plans);
});

app.delete('/api/session/:id/plans/:planId', (req: Request, res: Response) => {
  const plans = sessionPlans.get(req.params.id) || [];
  const filtered = plans.filter(p => p.id !== req.params.planId);
  sessionPlans.set(req.params.id, filtered);
  res.json({ success: true });
});

// Code Review (simulated - returns staged/unstaged files)
app.post('/api/review', async (req: Request, res: Response) => {
  const { workspace, scope } = req.body;
  const workspaceDir = workspace || currentWorkspace;

  try {
    // Try to get git status
    const gitProcess = spawn('git', ['status', '--porcelain'], {
      cwd: workspaceDir,
      shell: true,
    });

    let output = '';
    gitProcess.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    gitProcess.on('close', () => {
      const lines = output.trim().split('\n').filter(l => l);
      const results = lines.map(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        return {
          file,
          status: status.includes('M') ? 'warning' : 'ok',
          issues: [],
        };
      });

      res.json({
        results,
        summary: {
          total: results.length,
          warnings: results.filter(r => r.status === 'warning').length,
          errors: 0,
        },
      });
    });

    gitProcess.on('error', () => {
      // No git, return empty
      res.json({ results: [], summary: { total: 0, warnings: 0, errors: 0 } });
    });
  } catch {
    res.json({ results: [], summary: { total: 0, warnings: 0, errors: 0 } });
  }
});

// WebSocket for chat
wsInstance.app.ws('/ws/chat/:sessionId', (ws: WebSocket, req: any) => {
  const sessionId = req.params.sessionId;
  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      name: 'New Chat',
      messages: [],
      workspace: currentWorkspace,
      createdAt: new Date(),
      model: currentModel,
    };
    sessions.set(sessionId, session);
  }

  ws.on('message', async (msg: string) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === 'set_model') {
        session!.model = data.model;
        ws.send(JSON.stringify({ type: 'model_set', model: data.model }));
        return;
      }

      if (data.type === 'message') {
        const userMessage: Message = {
          id: uuidv4(),
          role: 'user',
          content: data.content,
          timestamp: new Date(),
        };
        session!.messages.push(userMessage);

        // Update session name if it's the first message
        if (session!.messages.length === 1) {
          session!.name = data.content.substring(0, 50) + (data.content.length > 50 ? '...' : '');
        }

        // Send user message back
        ws.send(JSON.stringify({ type: 'user_message', message: userMessage }));

        const workspacePath = session!.workspace.replace(/\\/g, '/');  // Normalize path

        // Build conversation history to include in prompt for context
        // This ensures the model remembers previous messages
        const previousMessages = session!.messages.slice(0, -1); // Exclude current message
        let fullPrompt = data.content;

        if (previousMessages.length > 0) {
          // Format conversation history
          const history = previousMessages.map(msg => {
            const role = msg.role === 'user' ? 'Human' : 'Assistant';
            // Truncate very long messages to save tokens
            const content = msg.content.length > 2000
              ? msg.content.substring(0, 2000) + '... [truncated]'
              : msg.content;
            return `${role}: ${content}`;
          }).join('\n\n');

          fullPrompt = `Here is our conversation history:\n\n${history}\n\nHuman: ${data.content}\n\nPlease respond to my latest message above, keeping our conversation context in mind.`;
        }

        // Escape the prompt for shell - handle special characters
        // Replace problematic characters
        const escapedPrompt = fullPrompt
          .replace(/\\/g, '\\\\')    // Escape backslashes first
          .replace(/"/g, '\\"')      // Escape double quotes
          .replace(/`/g, '\\`')      // Escape backticks
          .replace(/\$/g, '\\$')     // Escape dollar signs
          .replace(/!/g, '\\!')      // Escape exclamation marks
          .replace(/\n/g, '\\n')     // Escape newlines
          .replace(/\r/g, '');       // Remove carriage returns

        const command = `copilot --prompt "${escapedPrompt}" --silent --stream on --no-color --model ${session!.model} --add-dir "${workspacePath}"`;

        console.log('Running copilot with conversation history, messages:', previousMessages.length);

        // Start GitHub Copilot CLI process using shell to handle quoting properly
        const copilotProcess = spawn(command, [], {
          cwd: session!.workspace,
          shell: true,
          env: { ...process.env },
        });

        activeProcesses.set(sessionId, copilotProcess);

        let assistantContent = '';

        copilotProcess.stdout?.on('data', (chunk: Buffer) => {
          const text = chunk.toString();

          // Check for session ID in stdout as well (format may vary)
          // Copilot CLI may output session ID in different formats
          const sessionPatterns = [
            /Session ID: ([a-zA-Z0-9-]+)/i,
            /session[_-]?id[:\s]+([a-zA-Z0-9-]+)/i,
            /Resuming session ([a-zA-Z0-9-]+)/i,
            /Session: ([a-zA-Z0-9-]+)/i,
          ];

          for (const pattern of sessionPatterns) {
            const match = text.match(pattern);
            if (match && !session!.copilotSessionId) {
              session!.copilotSessionId = match[1];
              console.log('Captured session ID from stdout:', session!.copilotSessionId);
              break;
            }
          }

          assistantContent += text;
          ws.send(JSON.stringify({ type: 'stream', content: text }));
        });

        copilotProcess.stderr?.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          console.log('Copilot stderr:', text);

          // Check for session ID in stderr
          const sessionPatterns = [
            /Session ID: ([a-zA-Z0-9-]+)/i,
            /session[_-]?id[:\s]+([a-zA-Z0-9-]+)/i,
            /Resuming session ([a-zA-Z0-9-]+)/i,
            /Session: ([a-zA-Z0-9-]+)/i,
            /session=([a-zA-Z0-9-]+)/i,
          ];

          let foundSessionId = false;
          for (const pattern of sessionPatterns) {
            const match = text.match(pattern);
            if (match && !session!.copilotSessionId) {
              session!.copilotSessionId = match[1];
              console.log('Captured session ID from stderr:', session!.copilotSessionId);
              foundSessionId = true;
              break;
            }
          }

          // Stream stderr only if it doesn't contain session info
          if (!foundSessionId && !text.toLowerCase().includes('session')) {
            assistantContent += text;
            ws.send(JSON.stringify({ type: 'stream', content: text }));
          }
        });

        copilotProcess.on('close', (code) => {
          console.log('Copilot process closed with code:', code);
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: assistantContent || 'No response from Copilot CLI. Make sure GitHub Copilot CLI is installed (`npm install -g @github/copilot` or `winget install GitHub.Copilot`) and you are logged in (`copilot` then `/login`).',
            timestamp: new Date(),
          };
          session!.messages.push(assistantMessage);
          activeProcesses.delete(sessionId);
          ws.send(JSON.stringify({ type: 'complete', message: assistantMessage }));
        });

        copilotProcess.on('error', (error) => {
          console.error('Copilot process error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Failed to start Copilot CLI: ${error.message}. Make sure Copilot CLI is installed: npm install -g @github/copilot`
          }));
        });
      }

      if (data.type === 'cancel') {
        const proc = activeProcesses.get(sessionId);
        if (proc) {
          proc.kill();
          activeProcesses.delete(sessionId);
          ws.send(JSON.stringify({ type: 'cancelled' }));
        }
      }

      if (data.type === 'execute') {
        // Execute a command in the workspace
        const execProcess = spawn(data.command, {
          cwd: session!.workspace,
          shell: true,
        });

        execProcess.stdout?.on('data', (chunk: Buffer) => {
          ws.send(JSON.stringify({ type: 'exec_output', content: chunk.toString() }));
        });

        execProcess.stderr?.on('data', (chunk: Buffer) => {
          ws.send(JSON.stringify({ type: 'exec_error', content: chunk.toString() }));
        });

        execProcess.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'exec_complete', code }));
        });
      }
    } catch (error: any) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    const proc = activeProcesses.get(sessionId);
    if (proc) {
      proc.kill();
      activeProcesses.delete(sessionId);
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  Copilot SDK UI Server                   ║
╠══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                  ║
║  Workspace: ${currentWorkspace.substring(0, 40).padEnd(40)}  ║
║  Default Model: ${currentModel.padEnd(36)}  ║
║                                                          ║
║  Using GitHub Copilot CLI (copilot command)              ║
║  Install: npm install -g @github/copilot                 ║
╚══════════════════════════════════════════════════════════╝
  `);
});
