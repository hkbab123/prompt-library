# Prompt Pilot Chat

Prompt Pilot is a small local chat-style project that lets you collect draft prompts, store them locally, and hand them off to OpenAI for a prompt engineering upgrade. It keeps the draft history in `data/drafts.json`, applies a checklist of standard optimization techniques, and surfaces the cleaned prompt plus reasoning.

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

## How it works

- `server.js` exposes three routes:
  - `GET /api/drafts` – returns the most recent 20 drafts from `data/drafts.json`.
  - `POST /api/drafts` – saves a new draft (title, text, timestamp) and keeps the list capped at 20.
  - `POST /api/optimize` – forwards the provided draft text to `chat/completions` with a prompt-engineering checklist and returns whatever OpenAI responds with.
- Calls to OpenAI are gated by `OPENAI_API_KEY`.
- A principles panel lets you record prompt expectations; those principles are fetched and sent with every optimization so the assistant can ask clarifying questions when information is missing.
- The server loads `.env` via `dotenv` so keys stay local and can be managed alongside your repository.
- Static assets are served from `public/` so you can open the single-page app from your browser.

## Front end workflow

1. Capture your draft in the textarea and hit **Save Draft** to persist it locally.
2. Reopen saved drafts from the list or continue iterating inside the textarea.
3. Document the principles that must be satisfied—those rules are sent to the optimizer so it can ask for clarifications when the draft is missing required context.
4. Click **Optimize & Generate** to ask OpenAI to reformulate the draft using structured prompt-engineering techniques. The response is shown in the large output panel.

## Storage

Drafts are stored in `data/drafts.json`. Each entry includes an `id`, the `text`, and timestamps. The server truncates the list to the most recent 20 drafts so the file stays small.

## Notes

- The project currently uses the `gpt-4o-mini` model; you can change the model name inside `server.js` as needed.
- If OpenAI returns a non-JSON blob, the raw text is displayed directly in the UI for you to inspect.
