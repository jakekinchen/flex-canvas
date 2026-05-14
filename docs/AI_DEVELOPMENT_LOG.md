# AI Development Log

## What AI Helped Build

- Converted the project from a canvas-SDK concept into a custom React Konva board backed by Liveblocks Storage.
- Designed the `BoardOperation` schema used by OpenAI output normalization and server-side application.
- Implemented OpenAI-backed suggested prompts for sticky creation, rectangle creation, frame creation, SWOT, retrospective, sticky grids, selected-color changes, moving pink notes, grid layout, frame-fit resizing, even spacing, user journey maps, and board-state summaries.
- Built `/api/ai-command` so AI plans are authenticated, authorized, validated, applied server-side to Liveblocks Storage, and logged to Supabase.
- Added smoke coverage for multiplayer join, presence, cursors, object sync, human edits, AI commands, refresh persistence, reconnect, 500+ objects, and FPS.

## Prompting That Worked

- "Build the multiplayer path with Supabase Auth, Liveblocks room auth/storage, React Konva, and custom Liveblocks Storage. Do not add a custom WebSocket server or Socket.io."
- "Route quick suggestion commands through the same server-side OpenAI operation schema as freeform commands."
- "Make AI commands planned server-side and applied server-side through validated Liveblocks Storage mutations."
- "Verify the app with five browser users, named cursors, presence, sync latency, reconnect, 500+ objects, FPS, and a live OpenAI-backed command."
- The best prompts framed AI output as a small operation list instead of asking the model to describe UI changes.
- Suggested prompts reuse the same structured operation schema as freeform commands.
- Compact context works better than full-board context: selected objects, viewport objects, candidate sticky notes, and viewport bounds are enough for most commands.

## Manual Engineering and Review

- Human review kept the ownership boundaries strict: Supabase for auth and metadata, Liveblocks for canonical canvas objects, React Konva for rendering and interaction.
- The AI path was corrected away from client-side canvas mutation. Commands now apply through server-side Liveblocks Storage mutations.
- Manual validation focused on current repo truth: TypeScript, ESLint/build, production smoke artifacts, and exact source traces.

## Strengths and Limitations

- Strengths: fast schema iteration, useful prompt coverage, smoke-test scaffolding, and strong docs drafting.
- Limitations: model-generated plans still require validation and clamping; freeform AI should not directly mutate client state; production cost controls need quotas and dashboarding before broad launch.

## Code Analysis

- Approximate AI-assisted drafting: 70%.
- Approximate hand-written/reviewed correction and integration: 30%.
- The highest-risk code, including authorization boundaries, server-side AI mutation, operation validation, and smoke-test acceptance, was manually inspected and corrected against the assignment requirements.
