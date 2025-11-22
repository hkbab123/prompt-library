# Prompt Pilot Chat

Prompt Pilot is a ChatGPT-style conversational interface for prompt engineering. Create chat sessions, optimize prompts with AI assistance, and organize your best prompts in a searchable library. Features a dark futuristic UI with glassmorphism effects and mobile-responsive design.

## Getting started

1. Install a compatible Node.js runtime (>=18).
2. In a shell inside this folder run:
   ```sh
   npm install
   ```
   There are no production dependencies, but this initializes the package metadata hooks.
3. Copy `.env.example` to `.env` and add your OpenAI key:
   ```sh
   cp .env.example .env
   # edit .env to replace the placeholder value with your actual key
   ```
   Alternatively you can still export `OPENAI_API_KEY` instead of using a `.env` file if you prefer.
4. Run the server:
   ```sh
   npm start
   ```
5. Open http://localhost:4173 in your browser.

## Features

### Chat Interface
- **ChatGPT-style conversations**: Create multiple chat sessions with continuous message history
- **Session management**: Create, resume, archive, and switch between chat sessions
- **Auto-generated titles**: Sessions automatically get descriptive titles from your first message
- **Real-time optimization**: AI-powered prompt engineering with conversation context

### Prompt Library
- **Folder organization**: Create custom folders to organize your best prompts
- **One-click save**: Save assistant responses directly to your library
- **Quick access**: Click any saved prompt to copy it to your clipboard
- **Hierarchical structure**: Organize prompts in user-defined categories

### Prompt Principles
- **Configurable guidelines**: Set principles that guide AI optimization
- **Contextual refinement**: AI asks clarifying questions based on your principles
- **Persistent settings**: Principles are saved and applied to all sessions

### UI/UX
- **Dark futuristic theme**: Glassmorphism effects with gradient accents
- **Mobile responsive**: Collapsible sidebar with touch-friendly controls
- **Keyboard shortcuts**: Enter to send, Shift+Enter for newlines, Esc to close modals
- **Auto-scroll**: Messages automatically scroll into view

## How it works

### Backend (Express + Node.js)
- **Session APIs**: Create, list, load, and archive chat sessions
- **Message APIs**: Send messages with full conversation context to OpenAI
- **Folder APIs**: Manage prompt library with folders and saved prompts
- **Principles APIs**: Store and retrieve prompt engineering principles
- **Data persistence**: JSON file storage with atomic writes
- **Migration**: Automatically migrates old drafts to the new folder structure

### Frontend (Vanilla JS)
- **State management**: Centralized state for sessions, folders, and UI
- **Real-time updates**: Optimistic UI updates with error handling
- **Modal system**: Settings, folder creation, and prompt saving dialogs
- **Toast notifications**: User feedback for actions and errors

### API Endpoints

**Sessions**
- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Load session with messages
- `POST /api/sessions/:id/messages` - Send message and get AI response
- `PUT /api/sessions/:id/archive` - Archive session

**Folders**
- `GET /api/folders` - List all folders with prompts
- `POST /api/folders` - Create or update folder
- `POST /api/folders/:id/prompts` - Save prompt to folder

**Principles**
- `GET /api/principles` - Get saved principles
- `POST /api/principles` - Save principles

## Storage

Data is stored in JSON files in the `data/` directory:
- `sessions.json` - Chat sessions with full message history
- `folders.json` - Prompt library structure and saved prompts
- `principles.json` - Prompt engineering principles
- `drafts.json.migrated` - Backup of old drafts (if migrated)

## Notes

- Uses `gpt-4o-mini` model (configurable in `server.js`)
- Conversation history is maintained for contextual responses
- Data files use atomic writes (write to .tmp then rename) to prevent corruption
- Old drafts from previous version are automatically migrated to folders

## Future Enhancements

- Streaming AI responses for real-time feedback
- Markdown rendering for formatted assistant messages
- Drag-and-drop to reorganize prompts between folders
- Session rename functionality
- Export/import sessions and library
- Search functionality across sessions and library
- Keyboard navigation for sidebar items

---

## Deployment on Coolify via Nixpacks

This is a Node.js HTTP server using ES modules. It serves static files from `./public` and stores JSON data in `./data`.
Data in `./data` is ephemeral in containers and will be lost on restarts or redeployments.

### Requirements
- Node.js 18 or newer for local development
- Environment variables:
  - `OPENAI_API_KEY` (required)
  - `PORT` (optional, defaults to 4173)

### Local Development
```sh
npm ci
cp .env.example .env
# Fill in OPENAI_API_KEY in .env
npm run dev
# Visit http://localhost:4173
```

### Deploy to Coolify (Git Repository + Nixpacks)

1. **Push changes to your Git repository** (GitHub, GitLab, etc.)
2. **In Coolify**: Create New Application → Git Repository
3. **Select repository and branch** (e.g., `main` or your deployment branch)
4. **Builder**: Nixpacks (auto-detected)
5. **Root directory**: `/` (or your app subdirectory if nested)
6. **Expose Port**: `4173` (must match the internal app port)
7. **Environment Variables**:
   - `OPENAI_API_KEY`: your OpenAI API key
   - `PORT`: `4173`
8. **Build & Start Commands**: Leave empty — Nixpacks uses `npm start` automatically
9. **Deploy** and monitor logs for "Server listening on http://localhost:4173"

### Deployment Notes

- **Data Persistence**: `./data` is NOT persisted across deployments. If you need persistence later, add a Coolify volume and mount it to `/app/data`.
- **Node Version**: The app requires Node.js ≥18. This is specified in `package.json` and `nixpacks.toml`. If deployment fails due to Node version issues, verify the `engines` field or set `NIXPACKS_NODE_VERSION=18` in Coolify environment variables.
- **Health Check**: The app listens on the port specified by the `PORT` environment variable. Ensure Coolify's exposed port matches this.

### Troubleshooting

- **Check Coolify logs** for startup messages: "Server listening on..."
- **Verify `OPENAI_API_KEY`** is set correctly in the service environment variables
- **Static assets not loading?** Ensure `public/` directory is committed to the repository
- **Build failures?** Check that `package-lock.json` is committed (required for `npm ci`)
