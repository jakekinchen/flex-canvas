# Pre-Search Notes

## Phase 1: Platform Decisions

- Realtime transport: use Liveblocks managed rooms, presence, and custom Storage. Do not build a custom WebSocket server or Socket.io layer.
- Auth and metadata: use Supabase Auth plus Postgres tables for profiles, boards, memberships, and AI command logs.
- Canvas engine: use React Konva for the custom board renderer, hit testing, drag, transform, pan, and zoom interactions.
- Canonical object state: keep board objects in Liveblocks Storage as `objects: LiveMap<string, LiveObject<BoardObject>>`.
- Database boundary: Supabase stores board metadata and memberships only; it does not store every canvas object.
- AI execution: route all AI planning through `/api/ai-command`; deterministic templates run first, OpenAI is the fallback for general commands.

## Phase 2: Architecture Decisions

- Human edits are client-owned Liveblocks mutations for low latency: create, move, edit text, resize, rotate, recolor, delete, duplicate, copy, and paste.
- AI edits are server-owned Liveblocks Storage mutations for authority, validation, logging, and shared consistency.
- All AI and deterministic handlers share the same `BoardOperation` schema: sticky notes, shapes, text, frames, connectors, move, resize, update text, color, and delete.
- Conflict model: last-write-wins is acceptable for the demo; every object includes `updatedAt` and `updatedBy` for debugging and future conflict UI.
- Room authorization: `/api/liveblocks-auth` validates the Supabase session and board membership before issuing room access.
- Production gate: Vercel deployment is blocked until Supabase env vars, `LIVEBLOCKS_SECRET_KEY`, and `OPENAI_API_KEY` are configured.

## Phase 3: Build and Verification Plan

- MVP board gate: pan/zoom, editable sticky notes, at least one shape, create/move/edit objects, realtime sync, named cursors, presence, auth, persistence, and public deployment.
- Full rubric expansion: rectangles, circles, lines, arrow connectors, standalone text, frames, resize/rotate transforms, multi-select, drag-select, duplicate, copy, paste, and color controls.
- AI command coverage: yellow sticky, blue rectangle at coordinates, named frame, move pink notes right, resize frame to contents, selected green, grid layout, pros/cons grid, evenly spaced elements, SWOT, user journey map, retrospective board, and board-state summary.
- Multiplayer scenarios: simultaneous editing, refresh persistence, rapid creation/movement, disconnect/reconnect, and 5+ users in one board.
- Performance targets: 60 FPS interaction sampling, object sync under 100 ms, cursor sync under 50 ms, 500+ stored objects, and 5+ concurrent users.
- Submission deliverables: GitHub repo with setup/architecture/deployed link, 3-5 minute demo video, this pre-search document, one-page AI development log, AI cost analysis, public deployed app with 5+ auth users, and social post.

The tldraw SDK path was removed to demonstrate more custom engineering. The app now owns rendering, interaction, and board-object schema directly while relying on Liveblocks for managed realtime transport.
