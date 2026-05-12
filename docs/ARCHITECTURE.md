# Architecture

## Ownership

- React Konva owns canvas rendering and interaction: stage, layers, objects, dragging, transforms, pan, and zoom.
- Liveblocks custom Storage owns the canonical board state: `objects: LiveMap<string, LiveObject<BoardObject>>`.
- Liveblocks Presence owns cursor position, selected IDs, display name, and color.
- Supabase owns auth sessions, profiles, board metadata, board memberships, and AI command logs only.
- OpenAI never receives API keys from the client; `/api/ai-command` calls the Responses API server-side.

The previous tldraw SDK path was removed to demonstrate more custom engineering. This version owns the object schema directly instead of mapping SDK records. The merged custom engine is guarded by `NEXT_PUBLIC_CUSTOM_CANVAS_ENGINE`, which defaults to `true`; disabling it blocks board entry rather than reviving a second canvas implementation.

## Runtime Flow

1. User signs in through Supabase anonymous auth or email/password.
2. User creates or opens a board in Supabase.
3. Board page requests Liveblocks access through `/api/liveblocks-auth`.
4. The auth route validates the Supabase user and board access, then issues room access.
5. `CustomBoard` opens a Liveblocks room with `objects` storage and presence.
6. `BoardCanvas` renders objects through React Konva and mutates Liveblocks Storage for human actions.
7. Cursor and selection state are written to Liveblocks Presence only.
8. AI commands post command text plus viewport/selection context to `/api/ai-command`.
9. The server reads compact board state from Liveblocks Storage, runs deterministic handlers or OpenAI, validates operations, applies them server-side to Liveblocks Storage, logs the command to Supabase, and returns a summary.

## Board Schema

The canonical object model is defined in `lib/board/types.ts`:

- `sticky`
- `shape`
- `text`
- `frame`
- `connector`

All board objects include world-space `x`, `y`, `width`, `height`, `rotation`, `color`, `zIndex`, `createdAt`, `updatedAt`, and `updatedBy`.

## Write Model

- Human edits are client-owned for latency.
- AI edits are server-owned for authority, validation, logging, and consistency.
- All paths use the same `BoardOperation` schema.
- Missing object IDs for update, move, resize, color, or delete operations are ignored.
- Coordinates and dimensions are clamped before application.

## Rejected Paths

- No custom WebSocket server.
- No Socket.io.
- No Supabase object-by-object canvas storage.
- No tldraw dependency, license key, editor API, or record mapping.
