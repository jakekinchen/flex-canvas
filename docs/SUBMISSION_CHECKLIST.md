# Submission Checklist

## Required Links

- GitHub repo: `https://github.com/kellyclaudeai/flex-canvas`
- GitHub transfer status: requested to `jakekinchen`; pending recipient acceptance.
- Public app: `https://collabboard-six-kappa.vercel.app`
- Production alias: `https://collabboard-six-kappa.vercel.app`
- Production smoke report: `test-results/collabboard-smoke-prod-latest.json`
- Production visual similarity report: `test-results/reference-ui-similarity-prod-latest.json`
- Local visual similarity report: `test-results/reference-ui-similarity-local.json`
- Full local smoke report: `test-results/flex-canvas-smoke-local.json`
- Demo video URL: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-demo-draft.mp4`
- Demo video draft: `output/demo/flex-canvas-demo-draft.mp4`
- Demo video notes: `docs/DEMO_VIDEO.md`
- Public screenshot, home desktop: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-desktop.png`
- Public screenshot, board desktop: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-board-desktop.png`
- Public screenshot, home mobile: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-mobile.png`
- Public screenshot, mobile proof crop: `https://collabboard-six-kappa.vercel.app/demo/flex-canvas-mobile-proof.png`
- Setup guide: `README.md`
- Architecture overview: `docs/ARCHITECTURE.md`
- Pre-search notes: `docs/PRE_SEARCH.md`
- AI development log: `docs/AI_DEVELOPMENT_LOG.md`
- AI cost analysis: `docs/AI_COST_ANALYSIS.md`
- Test plan: `docs/TEST_PLAN.md`
- Final compliance audit: `docs/FINAL_COMPLIANCE_AUDIT.md`
- Completion audit: `docs/COMPLETION_AUDIT.md`
- Social post draft: `docs/SOCIAL_POST_DRAFT.md`

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
- [x] Create/push the GitHub repository and add the final URL above.
- [x] Request GitHub repository transfer to `jakekinchen`.
- [ ] Replace the draft demo with a freshly recorded polished screen demo if desired.
- [x] Prepare the social post draft.
- [ ] Publish the social post from the submitter's X or LinkedIn account only after explicit approval.

## Demo Video Script

1. Show sign-in and board creation.
2. Open the same board in two browser users.
3. Show presence list, named cursors, and cursor movement.
4. Create and edit a sticky note.
5. Move, recolor, duplicate, copy, and paste an object.
6. Create a rectangle, line, arrow connector, text object, and frame.
7. Drag-select multiple objects and resize/rotate one selected object.
8. Run suggested AI prompts: SWOT, retrospective, user journey, grid, and selected color change.
9. Run one freeform OpenAI-backed command.
10. Refresh the second browser to show persistence.
11. Mention architecture boundaries: Supabase auth/metadata, Liveblocks Storage/presence, React Konva rendering, server-side AI mutation.

## Social Post Draft

Built Flex Canvas for @GauntletAI: a realtime collaborative whiteboard with Supabase Auth, Liveblocks custom Storage/presence, React Konva rendering, and server-side AI board operations.

Features: multiplayer cursors and presence, editable sticky notes, shapes, frames, lines, arrow connectors, drag-select, resize/rotate, recolor, duplicate/copy/paste, OpenAI-backed workshop prompts, reconnect recovery, and 500+ object smoke coverage.

Demo: https://collabboard-six-kappa.vercel.app/demo/flex-canvas-demo-draft.mp4
App: https://collabboard-six-kappa.vercel.app
Screenshots:
- https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-desktop.png
- https://collabboard-six-kappa.vercel.app/demo/flex-canvas-board-desktop.png
- https://collabboard-six-kappa.vercel.app/demo/flex-canvas-home-mobile.png

Standalone draft: `docs/SOCIAL_POST_DRAFT.md`
