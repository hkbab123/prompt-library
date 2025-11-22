import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const dataDir = path.join(__dirname, 'data');
const sessionsFile = path.join(dataDir, 'sessions.json');
const foldersFile = path.join(dataDir, 'folders.json');
const principlesFile = path.join(dataDir, 'principles.json');
const draftsFile = path.join(dataDir, 'drafts.json');
const publicDir = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

// ============= DATA HELPERS =============

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  
  const files = [
    { path: sessionsFile, default: '[]' },
    { path: foldersFile, default: '[]' },
    { path: principlesFile, default: '[]' }
  ];

  for (const file of files) {
    try {
      await fs.access(file.path);
    } catch {
      await fs.writeFile(file.path, file.default, 'utf8');
    }
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed reading ${filePath}:`, err);
    return filePath === principlesFile ? [] : [];
  }
}

async function writeJson(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ============= SESSIONS APIs =============

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await readJson(sessionsFile);
    const activeSessions = sessions
      .filter(s => !s.archived)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(({ id, title, createdAt, updatedAt, archived }) => ({
        id, title, createdAt, updatedAt, archived
      }));
    res.json({ sessions: activeSessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const sessions = await readJson(sessionsFile);
    const now = new Date().toISOString();
    const newSession = {
      id: randomUUID(),
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
      archived: false,
      messages: []
    };
    sessions.push(newSession);
    await writeJson(sessionsFile, sessions);
    res.status(201).json({ session: newSession });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const sessions = await readJson(sessionsFile);
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const sessions = await readJson(sessionsFile);
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = new Date().toISOString();
    const userMessage = {
      id: randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: now
    };

    session.messages.push(userMessage);

    // Get principles
    const principles = await readJson(principlesFile);

    // Call OpenAI with conversation history
    const assistantContent = await optimizeWithHistory(
      session.messages,
      content.trim(),
      principles
    );

    const assistantMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString()
    };

    session.messages.push(assistantMessage);
    session.updatedAt = assistantMessage.timestamp;

    // Auto-generate title from first user message
    if (session.messages.filter(m => m.role === 'user').length === 1) {
      const words = content.trim().split(/\s+/).slice(0, 8).join(' ');
      session.title = words.length > 50 ? words.slice(0, 50) + '...' : words;
    }

    await writeJson(sessionsFile, sessions);

    res.json({
      userMessage,
      assistantMessage,
      session: {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt
      }
    });
  } catch (err) {
    console.error('Message error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sessions/:id/archive', async (req, res) => {
  try {
    const { archived } = req.body;
    const sessions = await readJson(sessionsFile);
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.archived = archived === true;
    session.updatedAt = new Date().toISOString();
    await writeJson(sessionsFile, sessions);

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= FOLDERS APIs =============

app.get('/api/folders', async (req, res) => {
  try {
    const folders = await readJson(foldersFile);
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folders', async (req, res) => {
  try {
    const { id, name, parentId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folders = await readJson(foldersFile);

    if (id) {
      // Update existing folder
      const folder = folders.find(f => f.id === id);
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      folder.name = name.trim();
      if (parentId !== undefined) folder.parentId = parentId;
      await writeJson(foldersFile, folders);
      return res.json({ folder });
    }

    // Create new folder
    const newFolder = {
      id: randomUUID(),
      name: name.trim(),
      parentId: parentId || null,
      prompts: [],
      createdAt: new Date().toISOString()
    };

    folders.push(newFolder);
    await writeJson(foldersFile, folders);
    res.status(201).json({ folder: newFolder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folders/:id/prompts', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }

    const folders = await readJson(foldersFile);
    const folder = folders.find(f => f.id === req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const prompt = {
      id: randomUUID(),
      title: title?.trim() || content.trim().slice(0, 50),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    folder.prompts = folder.prompts || [];
    folder.prompts.push(prompt);
    await writeJson(foldersFile, folders);

    res.status(201).json({ prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= PRINCIPLES APIs =============

app.get('/api/principles', async (req, res) => {
  try {
    const principles = await readJson(principlesFile);
    res.json({ principles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/principles', async (req, res) => {
  try {
    const raw = req.body?.principles;
    let entries = [];
    if (typeof raw === 'string') {
      entries = raw.split('\n').map(item => item.trim()).filter(Boolean);
    } else if (Array.isArray(raw)) {
      entries = raw.map(item => item?.toString().trim()).filter(Boolean);
    }
    await writeJson(principlesFile, entries);
    res.json({ principles: entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= OPENAI INTEGRATION =============

async function optimizeWithHistory(history, latestMessage, principles = []) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set in environment');
  }

  const normalizedPrinciples = Array.isArray(principles)
    ? principles.map(text => text?.toString().trim()).filter(Boolean)
    : [];

  const principlesSection = normalizedPrinciples.length
    ? `\n\nPrinciples to follow:\n${normalizedPrinciples.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    : '';

  const systemPrompt = `You are a prompt engineering assistant that helps users refine and optimize their prompts. 
Follow these guidelines:
1. Clarify user identity, intent, and desired outcome
2. Set the tone, format, and constraints explicitly
3. Surface necessary contextual signals
4. Ask for step-by-step reasoning when needed
5. Include examples and validation cues
6. Request verification or ask clarifying questions${principlesSection}

If the user's prompt is missing critical information, ask clarifying questions. Otherwise, provide an optimized, production-ready version of their prompt.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errBody}`);
  }

  const body = await response.json();
  return body?.choices?.[0]?.message?.content?.trim() || 'No response from OpenAI.';
}

// ============= DATA MIGRATION =============

async function migrateOldDrafts() {
  try {
    await fs.access(draftsFile);
    const drafts = await readJson(draftsFile);
    
    if (!drafts || drafts.length === 0) return;

    console.log(`Migrating ${drafts.length} old drafts...`);

    const folders = await readJson(foldersFile);
    let importFolder = folders.find(f => f.name === 'Imported Drafts');
    
    if (!importFolder) {
      importFolder = {
        id: randomUUID(),
        name: 'Imported Drafts',
        parentId: null,
        prompts: [],
        createdAt: new Date().toISOString()
      };
      folders.push(importFolder);
    }

    for (const draft of drafts) {
      importFolder.prompts.push({
        id: randomUUID(),
        title: draft.text.slice(0, 50) + (draft.text.length > 50 ? '...' : ''),
        content: draft.text,
        createdAt: draft.createdAt || new Date().toISOString()
      });
    }

    await writeJson(foldersFile, folders);
    
    // Rename old drafts file
    await fs.rename(draftsFile, `${draftsFile}.migrated`);
    console.log('Migration complete!');
  } catch (err) {
    // No drafts file, skip migration
  }
}

// ============= START SERVER =============

ensureStorage()
  .then(() => migrateOldDrafts())
  .then(() => {
    const port = process.env.PORT || 4173;
    app.listen(port, () => {
      console.log(`✨ Prompt Pilot server running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
