# Submission Checklist

## Required Links

- GitHub repo: not configured in this local checkout; add the public repository URL before submission.
- Public app: `https://collabboard-six-kappa.vercel.app`
- Latest production deployment: `https://collabboard-ntdh9j7nu-kelly-1224s-projects.vercel.app`
- Production smoke report: `test-results/collabboard-smoke-prod-latest.json`
- Expanded local smoke report: `test-results/collabboard-smoke-20260512213412.json`
- Production visual similarity report: `test-results/reference-ui-similarity-prod-latest.json`
- Local visual similarity report: `test-results/reference-ui-similarity-local.json`
- Full local smoke report: `test-results/flex-canvas-smoke-local.json`
- Demo video URL: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-demo-draft.mp4`
- Demo video draft: `output/demo/flex-canvas-demo-draft.mp4`
- Demo video notes: `docs/DEMO_VIDEO.md`
- Setup guide: `README.md`
- Architecture overview: `docs/ARCHITECTURE.md`
- Pre-search notes: `docs/PRE_SEARCH.md`
- AI development log: `docs/AI_DEVELOPMENT_LOG.md`
- AI cost analysis: `docs/AI_COST_ANALYSIS.md`
- Test plan: `docs/TEST_PLAN.md`

## Final Gates

- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm run test:visual`.
- [x] Run `npm run test:smoke`.
- [x] Run `npm run test:smoke:prod` after the latest code is deployed.
- [x] Confirm deployed Vercel env vars through successful production auth, Liveblocks, OpenAI, and smoke coverage.
- [x] Confirm at least 5 authenticated smoke users can join one board.
- [x] Generate a 3-5 minute local demo video draft.
- [x] Publish the draft demo video at the deployed app URL.
- [ ] Replace the draft demo with a freshly recorded polished screen demo if desired.
- [ ] Publish the social post.

## Demo Video Script

1. Show sign-in and board creation.
2. Open the same board in two browser users.
3. Show presence list, named cursors, and cursor movement.
4. Create and edit a sticky note.
5. Move, recolor, duplicate, copy, and paste an object.
6. Create a rectangle, line, arrow connector, text object, and frame.
7. Drag-select multiple objects and resize/rotate one selected object.
8. Run deterministic AI commands: SWOT, retrospective, user journey, grid, and selected color change.
9. Run one OpenAI-backed command.
10. Refresh the second browser to show persistence.
11. Mention architecture boundaries: Supabase auth/metadata, Liveblocks Storage/presence, React Konva rendering, server-side AI mutation.

## Social Post Draft

Built Flex Canvas for @GauntletAI: a realtime collaborative whiteboard with Supabase Auth, Liveblocks custom Storage/presence, React Konva rendering, and server-side AI board operations. It supports multiplayer cursors, editable sticky notes, shapes, frames, connectors, selection actions, deterministic workshop templates, OpenAI-backed commands, and 500+ object smoke coverage.
