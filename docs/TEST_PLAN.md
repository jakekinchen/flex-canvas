# Test Plan

## Automated

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:visual`
- `npm run test:smoke`
- `npm run test:smoke:prod`

## Multiplayer and Performance Smoke

`scripts/smoke-collabboard.mjs` creates a fresh board, signs in 5 browser users, verifies presence,
measures cursor propagation, creates/edits/moves/recolors human-authored objects, duplicates and
copy/pastes selection, creates rectangles/lines/connectors from the toolbar, verifies drag-select,
runs suggested and freeform OpenAI-backed AI board commands, asserts the server-side AI path handled
each AI command, exercises simultaneous OpenAI-backed commands, reloads a second browser for
persistence, tests offline reconnect recovery, creates a 500+ object sticky grid, checks Liveblocks
custom Storage object count, and measures pan/zoom FPS.

Default targets mirror the assignment:

- 5+ concurrent users.
- OpenAI-backed command execution is tested live for schema validity, server-side Storage mutation,
  realtime sync, and observed latency.
- Object sync latency under 100 ms, measured from first local object render probe to second browser render probe.
- Cursor propagation under 50 ms, measured from the source browser pointer event to the receiving cursor label update.
- 500+ stored custom board objects in Liveblocks Storage.
- 60 FPS during pan/zoom sampling.

Useful overrides:

- `FLEX_CANVAS_VISUAL_THRESHOLD=85 npm run test:visual`
- `COLLABBOARD_BASE_URL=http://localhost:3000 npm run test:smoke`
- `COLLABBOARD_SKIP_CAPACITY=1 npm run test:smoke`
- `COLLABBOARD_SKIP_RECONNECT=1 npm run test:smoke`
- `COLLABBOARD_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:smoke`

Latest production custom-engine run:

- Public Vercel URL: `https://collabboard-six-kappa.vercel.app`
- Production alias: `https://collabboard-six-kappa.vercel.app`.
- Report: `test-results/collabboard-smoke-prod-latest.json`
- Completed: `2026-05-14T21:29:51.721Z`
- Passed: 31 checks with no failures, including 5-user join, presence, cursor latency, sticky
  create/edit/move/recolor, simultaneous text-edit convergence, duplicate, copy/paste, rectangle
  resize/rotate, line, connector, frame create/edit, drag-select, suggested sticky command,
  simultaneous OpenAI-backed commands, OpenAI-backed live command, SWOT template, board-state
  command, object sync latency, refresh persistence, mobile layout, reconnect recovery, 500+
  object capacity, and FPS.
- The OpenAI-backed SWOT template completed in 22,011 ms; live upstream timing is recorded but not
  treated as an app-controlled latency gate.
- Latest production visual report: `test-results/reference-ui-similarity-prod-latest.json`; desktop
  crop 90.1623%, mobile phone crop 86.4051%, and 390px compact mobile crop 88.3655%.

Latest local visual similarity run:

- Command: `npm run test:visual -- --base-url http://localhost:3020 --report test-results/reference-ui-similarity-local.json`
- Report: `test-results/reference-ui-similarity-local.json`
- Passed: desktop crop 90.1623%, mobile phone crop 86.4038%, and 390px compact mobile crop 88.3655%
  against the 85% acceptance threshold.

Latest full local smoke run:

- Command: `COLLABBOARD_CLEANUP_USERS=1 COLLABBOARD_REPORT=test-results/flex-canvas-smoke-local.json npm run test:smoke -- --base-url http://localhost:3020`
- Report: `test-results/flex-canvas-smoke-local.json`
- Completed: `2026-05-14T21:25:47.508Z`
- Passed: 5-user join, presence, cursor latency, sticky create/edit/move/recolor, duplicate, copy/paste,
  simultaneous text-edit convergence, rectangle resize/rotate, line, connector, frame create/edit,
  drag-select, suggested sticky command, simultaneous OpenAI-backed commands, OpenAI-backed live command,
  SWOT template, board-state command, object sync latency, refresh persistence, mobile layout, reconnect recovery,
  500+ object capacity, and FPS.
- The SWOT template command completed through OpenAI in 24,409 ms; live upstream timing is recorded
  but not treated as an app-controlled latency gate.

## Multiplayer Manual Gate

- Two authenticated users can join the same board.
- Five authenticated users can join the same board.
- Each user has a visible cursor/name label.
- Presence list updates when users join and leave.
- Object creation syncs without refresh.
- Object movement syncs without refresh.
- Text edits sync without refresh.
- Refresh preserves board state.
- Closing all browsers and reopening preserves board state.

## AI Manual Gate

Live AI:

- "Create a purple circle at position 360, 160"

Suggested prompts:

- "Add a yellow sticky note that says User Research"
- "Create a blue rectangle at position 100, 200"
- "Change the selected sticky note color to green"
- "Move all pink sticky notes to the right side"
- "Arrange selected sticky notes in a grid"
- "Space selected elements evenly"
- "Resize selected frame to fit contents"
- "Create a 2x3 sticky grid for pros and cons"
- "Create a SWOT analysis template"
- "Create a user journey map with 5 stages"
- "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns"
- "Get board state"

AI-generated objects must be applied server-side to Liveblocks Storage and appear in a second browser in real time.

## Deployment Gate

- Vercel project has all required env vars.
- Supabase migrations are applied.
- Liveblocks room auth succeeds on the deployed URL.
- Auth works on the deployed URL.
- React Konva board renders on the deployed URL.
- AI command endpoint works on the deployed URL and mutates Liveblocks Storage server-side.
