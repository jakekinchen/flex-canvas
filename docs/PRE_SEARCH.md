# Pre-Search Notes

## Phase 1: Define Constraints

1. Scale and load profile

- Launch target: small workshop teams, with assignment validation requiring 5+ concurrent authenticated users in one board.
- Six-month target: dozens to hundreds of boards, mostly spiky sessions during workshops.
- Realtime requirement: cursor updates, presence, object sync, and reconnect recovery are core product behavior.
- Decision: use Liveblocks managed realtime transport and Storage rather than a custom WebSocket server.

2. Budget and cost ceiling

- Keep fixed infrastructure small: Vercel, Supabase, Liveblocks, and OpenAI only.
- Trade money for time on managed collaboration infrastructure because conflict handling and reconnect behavior are high-risk in a one-week sprint.
- Use deterministic AI handlers for common board templates to reduce model calls and latency.

3. Time to ship

- MVP priority: multiplayer first, then board primitives, then AI commands.
- Long-term maintainability matters, but the one-week sprint favors a compact custom object model over broad feature abstraction.
- Iterate vertically: cursors, object sync, persistence, core tools, then AI.

4. Compliance and regulatory needs

- No health, financial, or regulated data is required for the assignment.
- Avoid storing sensitive canvas content in Supabase tables; Supabase stores auth, profiles, board metadata, memberships, and AI command logs only.
- Production hardening follow-up: retention controls, admin export/delete, and model prompt audit logs.

5. Team and skill constraints

- Solo AI-assisted build.
- Known stack: React, TypeScript, Next.js, Supabase, Playwright-style smoke testing.
- Learning tradeoff: use React Konva for custom canvas ownership while delegating realtime consistency to Liveblocks.

## Phase 2: Architecture Discovery

6. Hosting and deployment

- Decision: Vercel for the Next.js app.
- Rationale: fast deploys, simple env management, and public URL for assignment review.
- Gate: production deployment is blocked until Supabase env vars, `LIVEBLOCKS_SECRET_KEY`, and `OPENAI_API_KEY` are configured.

7. Authentication and authorization

- Decision: Supabase Auth with anonymous and email/password entry points.
- Authorization: board ownership, membership rows, and link-edit/link-view share modes in Supabase.
- Room access: `/api/liveblocks-auth` validates the Supabase session and board access before issuing Liveblocks room access.

8. Database and data layer

- Decision: Supabase Postgres for profiles, boards, board memberships, and AI command logs.
- Explicit boundary: do not store every canvas object in Supabase.
- Canonical board state: Liveblocks Storage `objects: LiveMap<string, LiveObject<BoardObject>>`.

9. Backend/API architecture

- Decision: Next.js App Router route handlers for board creation, profile updates, Liveblocks auth, and AI commands.
- No custom WebSocket server and no Socket.io.
- AI commands are planned server-side and applied server-side through validated Liveblocks Storage mutations.

10. Frontend framework and rendering

- Decision: Next.js App Router plus React and TypeScript.
- Canvas renderer: React Konva owns stage rendering, pan, zoom, hit testing, drag, resize, rotate, selection, and overlays.
- SEO is not a priority because the product is an authenticated app surface.

11. Third-party integrations

- Supabase: auth and metadata.
- Liveblocks: room auth, presence, and custom Storage.
- OpenAI: fallback AI planner using structured operation output.
- Vercel: app hosting.
- Risk: vendor pricing and quotas; mitigation is deterministic command coverage and command logging.

## Phase 3: Post-Stack Refinement

12. Security vulnerabilities

- Service role keys and OpenAI keys stay server-side only.
- RLS is enabled on public Supabase tables.
- Liveblocks room access is never granted directly from the client without `/api/liveblocks-auth`.
- Future hardening: rate limits for `/api/ai-command` and per-board AI quotas.

13. File structure and project organization

- `app/` contains pages and route handlers.
- `components/board/` contains the React Konva board, toolbar, presence, and AI panel.
- `lib/board/` contains object types, geometry, validation, viewport math, and Liveblocks mutations.
- `lib/ai/` contains deterministic handlers, prompt construction, schemas, and cost estimates.
- `lib/db/`, `lib/supabase/`, and `lib/liveblocks/` own service boundaries.

14. Naming conventions and code style

- TypeScript types use explicit domain names such as `BoardObject`, `BoardOperation`, and `AiCommandRequest`.
- Human and AI operations share the same operation names: `createStickyNote`, `createShape`, `createFrame`, `createConnector`, `moveObject`, `resizeObject`, `updateText`, and `changeColor`.
- ESLint, TypeScript, and `next build` are required verification gates.

15. Testing strategy

- Static gates: `npm run lint`, `npm run typecheck`, and `npm run build`.
- Browser smoke: `npm run test:smoke` for 5-user collaboration, sync, persistence, reconnect, AI commands, 500+ objects, and FPS.
- Visual smoke: `npm run test:visual` for desktop and mobile layout similarity.
- Production smoke: `npm run test:smoke:prod` and `npm run test:visual:prod` against the deployed Vercel URL.

16. Recommended tooling and DX

- Use Playwright-based scripts for real browser verification.
- Use Supabase CLI for schema application.
- Use Vercel CLI for deployment inspection and production env checks.
- Use Liveblocks dashboard/logs if room storage or presence behavior diverges from smoke results.

## Final Architecture Decision

The tldraw SDK path was removed to demonstrate more custom engineering. The app owns rendering, interaction, and board-object schema directly through React Konva and TypeScript while relying on Liveblocks for managed realtime transport and canonical Storage. Supabase remains limited to auth, profiles, board metadata, memberships, and AI command logs.
