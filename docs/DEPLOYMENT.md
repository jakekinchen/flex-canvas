# Deployment

## Supabase

Project created:

- Name: `collabboard`
- Ref: `ihfclglaczywvmbidktk`
- Region: `us-east-1`

Apply schema:

```bash
supabase link --project-ref ihfclglaczywvmbidktk
supabase db push
```

## Vercel

Configure:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LIVEBLOCKS_SECRET_KEY
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_REASONING_EFFORT
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CUSTOM_CANVAS_ENGINE
```

Deploy only after `LIVEBLOCKS_SECRET_KEY` is available and Supabase migrations have been pushed.
Keep `NEXT_PUBLIC_CUSTOM_CANVAS_ENGINE=true` for the merged custom React Konva and
Liveblocks Storage implementation. The code defaults this flag on; explicit false,
off, disabled, legacy, or tldraw values block board entry instead of maintaining a
second canvas path.

Current production URL:

- `https://collabboard-six-kappa.vercel.app`
- Public draft demo video: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-demo-draft.mp4`
- Public screenshots:
  - `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-desktop.png`
  - `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-board-desktop.png`
  - `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-mobile.png`
  - `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-mobile-proof.png`

Latest production smoke:

- Deployment: `https://collabboard-d82mrem4v-kelly-1224s-projects.vercel.app`
- Alias: `https://collabboard-six-kappa.vercel.app`
- Command: `COLLABBOARD_CLEANUP_USERS=1 COLLABBOARD_REPORT=test-results/collabboard-smoke-prod-latest.json npm run test:smoke:prod`
- Report: `test-results/collabboard-smoke-prod-latest.json`
- Result: passed 31 checks, including 5-user multiplayer, presence, cursor latency,
  sticky create/edit/move/recolor, simultaneous text-edit convergence, duplicate,
  copy/paste, rectangle resize/rotate, line, connector, frame create/edit, drag-select,
  deterministic AI, OpenAI-backed AI schema/server-mutation path, object sync latency,
  controlled AI latency, reconnect, 500+ object capacity, mobile layout, and FPS gates.
- Note: OpenAI-backed observed latency was 3,577 ms in that run. It is recorded as live
  hosted-model timing, not treated as an app-controlled latency gate.

Latest production visual similarity:

- Command: `npm run test:visual:prod -- --report test-results/reference-ui-similarity-prod-latest.json`
- Report: `test-results/reference-ui-similarity-prod-latest.json`
- Result: passed desktop 90.1623%, mobile 86.4051%, and 390px compact 88.3655%
  crops against the 85% threshold.

Custom-engine deployment note:

- The app no longer requires a canvas SDK license key.
- React Konva renders the board.
- Liveblocks custom Storage is the canonical board state.
- Human edits are client-owned for latency.
- AI edits are server-owned for authority, validation, logging, and consistency.
- Supabase stores auth and metadata only.
- No custom websocket server is used.
