import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const dataDir = path.join(__dirname, 'data');
const draftsFile = path.join(dataDir, 'drafts.json');
const principlesFile = path.join(dataDir, 'principles.json');
const publicDir = path.join(__dirname, 'public');

const standardChecklist = [
  'Clarify user identity, intent, and desired outcome',
  'Set the tone, format, and constraints explicitly',
  'Surface necessary contextual signals (audience, data, style)',
  'Ask for step-by-step reasoning or layered responses',
  'Include examples, validation cues, or guardrails',
  'Request verification/questions to refine clarity'
];

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(draftsFile);
  } catch {
    await fs.writeFile(draftsFile, '[]', 'utf8');
  }
  try {
    await fs.access(principlesFile);
  } catch {
    await fs.writeFile(principlesFile, '[]', 'utf8');
  }
}

async function readDrafts() {
  try {
    const raw = await fs.readFile(draftsFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading drafts:', err);
    await fs.writeFile(draftsFile, '[]', 'utf8');
    return [];
  }
}

async function writeDrafts(drafts) {
  await fs.writeFile(draftsFile, JSON.stringify(drafts, null, 2), 'utf8');
}

async function readPrinciples() {
  try {
    const raw = await fs.readFile(principlesFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading principles:', err);
    await fs.writeFile(principlesFile, '[]', 'utf8');
    return [];
  }
}

async function writePrinciples(principles) {
  await fs.writeFile(principlesFile, JSON.stringify(principles, null, 2), 'utf8');
}

async function collectRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Payload is not valid JSON.');
  }
}

function respondJson(res, status, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function mapContentType(ext) {
  switch (ext) {
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'text/html; charset=utf-8';
  }
}

async function serveStatic(pathname, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(path.join(publicDir, requested));
  if (!safe.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(safe);
    res.writeHead(200, { 'Content-Type': mapContentType(path.extname(safe)) });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
}

async function optimizeDraftMessage(draftText, principles = []) {
  if (!draftText || !draftText.trim()) {
    throw new Error('Draft text is required for optimization.');
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set in the environment.');
  }

  const checklist = standardChecklist
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');

  const normalizedPrinciples = Array.isArray(principles)
    ? principles.map((text) => text?.toString().trim()).filter(Boolean)
    : [];
  const principlesSection = normalizedPrinciples.length
    ? `Principles:\n${normalizedPrinciples
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n')}\n`
    : '';
  const clarificationPrompt = normalizedPrinciples.length
    ? 'If the draft misses any detail required by these principles, ask clarifying questions that call out what is missing before finalizing the prompt.'
    : 'If the draft feels short on information you would normally expect from a professional prompt, ask for clarifications before finalizing.';

  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.25,
    top_p: 0.85,
    messages: [
      {
        role: 'system',
        content: `You are a prompt engineer that packages drafts into structured prompts. Follow this checklist when you reformulate prompts:\n${checklist}\n${principlesSection}${clarificationPrompt}`
      },
      {
        role: 'user',
        content: `Refine the following draft prompt into a production-ready prompt. Highlight how each standard technique was respected and include a final prompt that can be delivered directly to the model. Respond with a JSON object like {"finalPrompt": "...", "notes": "..."}. Draft:\n${draftText}`
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errBody}`);
  }

  const body = await response.json();
  const message = body?.choices?.[0]?.message?.content?.trim();
  return {
    raw: message ?? 'No response returned from OpenAI.',
    usage: body?.usage ?? null
  };
}


const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  try {
    if (path === '/api/drafts' && req.method === 'GET') {
      const drafts = await readDrafts();
      respondJson(res, 200, { drafts });
      return;
    }

    if (path === '/api/drafts' && req.method === 'POST') {
      let payload;
      try {
        payload = await collectRequestBody(req);
      } catch (err) {
        respondJson(res, 400, { error: err.message });
        return;
      }
      const text = payload.text?.trim();
      if (!text) {
        respondJson(res, 400, { error: 'Draft text cannot be empty.' });
        return;
      }
      const drafts = await readDrafts();
      const now = new Date().toISOString();
      const record = {
        id: randomUUID(),
        text,
        createdAt: now,
        updatedAt: now
      };
      drafts.unshift(record);
      if (drafts.length > 20) {
        drafts.pop();
      }
      await writeDrafts(drafts);
      respondJson(res, 201, { draft: record });
      return;
    }

    if (path === '/api/principles' && req.method === 'GET') {
      const principles = await readPrinciples();
      respondJson(res, 200, { principles });
      return;
    }

    if (path === '/api/principles' && req.method === 'POST') {
      let payload;
      try {
        payload = await collectRequestBody(req);
      } catch (err) {
        respondJson(res, 400, { error: err.message });
        return;
      }

      const raw = payload?.principles;
      let entries = [];
      if (typeof raw === 'string') {
        entries = raw.split('\n').map((item) => item.trim()).filter(Boolean);
      } else if (Array.isArray(raw)) {
        entries = raw.map((item) => item?.toString().trim()).filter(Boolean);
      }
      await writePrinciples(entries);
      respondJson(res, 200, { principles: entries });
      return;
    }

    if (path === '/api/optimize' && req.method === 'POST') {
      let payload;
      try {
        payload = await collectRequestBody(req);
      } catch (err) {
        respondJson(res, 400, { error: err.message });
        return;
      }
      try {
        const principles = await readPrinciples();
        const result = await optimizeDraftMessage(payload.text, principles);
        respondJson(res, 200, result);
        return;
      } catch (err) {
        respondJson(res, 422, { error: err.message });
        return;
      }
    }

    if (req.method === 'GET') {
      await serveStatic(path, res);
      return;
    }

    res.writeHead(404);
    res.end('Route not found');
  } catch (err) {
    console.error(err);
    respondJson(res, 500, { error: 'Unexpected server error.' });
  }
});

ensureStorage().then(() => {
  const port = process.env.PORT || 4173;
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
});
