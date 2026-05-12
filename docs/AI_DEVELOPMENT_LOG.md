# AI Development Log

## What AI Helped Build

- Converted the project from a canvas-SDK concept into a custom React Konva board backed by Liveblocks Storage.
- Designed the `BoardOperation` schema used by deterministic handlers, OpenAI output normalization, and server-side application.
- Implemented deterministic AI handlers for sticky creation, rectangle creation, frame creation, SWOT, retrospective, sticky grids, selected-color changes, moving pink notes, grid layout, frame-fit resizing, even spacing, user journey maps, and board-state summaries.
- Built `/api/ai-command` so AI plans are authenticated, authorized, validated, applied server-side to Liveblocks Storage, and logged to Supabase.
- Added smoke coverage for multiplayer join, presence, cursors, object sync, human edits, AI commands, refresh persistence, reconnect, 500+ objects, and FPS.

## Prompting That Worked

- The best prompts framed AI output as a small operation list instead of asking the model to describe UI changes.
- Deterministic handlers were used for common workshop templates so latency and cost stay predictable.
- Compact context works better than full-board context: selected objects, viewport objects, candidate sticky notes, and viewport bounds are enough for most commands.

## Manual Engineering and Review

- Human review kept the ownership boundaries strict: Supabase for auth and metadata, Liveblocks for canonical canvas objects, React Konva for rendering and interaction.
- The AI path was corrected away from client-side canvas mutation. Commands now apply through server-side Liveblocks Storage mutations.
- Manual validation focused on current repo truth: TypeScript, ESLint/build, production smoke artifacts, and exact source traces.

## Strengths and Limitations

- Strengths: fast schema iteration, quick deterministic command expansion, useful smoke-test scaffolding, and strong docs drafting.
- Limitations: model-generated plans still require validation and clamping; freeform AI should not directly mutate client state; production cost controls need quotas and dashboarding before broad launch.

Approximate effort split: AI-assisted implementation and docs were the majority of drafting, while architecture decisions, verification, corrections, and acceptance calls stayed manual.
