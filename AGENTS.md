<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Flex Canvas Custom Project Rules

- Build the multiplayer path with Supabase Auth, Liveblocks room auth/storage, React Konva, and custom Liveblocks Storage. Do not add a custom WebSocket server or Socket.io.
- Supabase owns auth, profiles, board metadata, memberships, and AI command logs only. Do not store every canvas object in Supabase.
- Liveblocks owns the canonical collaborative board object map: `objects: LiveMap<string, LiveObject<BoardObject>>`.
- React Konva owns canvas rendering and interaction.
- Human create/move/edit/delete operations are client-owned Liveblocks Storage mutations for low latency.
- AI commands are planned server-side and applied server-side through validated Liveblocks Storage mutations.
- Route quick suggestion commands through the same server-side OpenAI operation schema as freeform commands.
- Production deployment is blocked unless Supabase env vars, `LIVEBLOCKS_SECRET_KEY`, and `OPENAI_API_KEY` are configured.
