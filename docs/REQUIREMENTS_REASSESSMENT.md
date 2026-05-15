# Requirements Reassessment

Reassessment date: 2026-05-15

This pass re-read `CollabBoard.pdf`, tightened the smoke harness, and reran local development and local production checks. The earlier completion docs were too optimistic in a few places because the smoke runner was proving functional sync without fully enforcing the PDF's performance and breadth targets.

## New Evidence

- Deep local AI run: `test-results/flex-canvas-requirements-audit-local.json`
- Local dev render run after viewport culling: `test-results/flex-canvas-render-audit-local.json`
- Local production render run after viewport culling: `test-results/flex-canvas-render-audit-prodlocal.json`

## Harness Fixes From This Pass

- Drag-select now fails if the test had to fall back to shift-click selection.
- 500-object capacity now waits for both clients to render 500+ objects before measuring FPS.
- AI command responses now include phase timings: auth, request parse, board access, Liveblocks storage read, OpenAI, server-side Liveblocks apply, Supabase logging, and total time.
- The smoke now has an overlapping long/short AI command probe, where one user starts a complex command and another user starts a short command while the first is still running.
- Optional `COLLABBOARD_DEEP_AI=1` coverage exercises more required AI command categories.

## Findings

### Still Passing

- 5+ browser users joined the same board.
- Presence, duplicate same-user tab numbering, cursor position tracking, cursor toolbar visibility, and cursor press/drag state passed.
- Human create/edit/move/recolor/conflict/duplicate/copy/paste/line/connector/frame/drag-select flows passed functionally.
- Refresh persistence, mobile layout, disconnect/reconnect recovery, and 500+ object Liveblocks storage passed.
- Overlapping AI commands passed functionally: a long user-journey command took about 22.7s while a second user's short sticky-note command completed in about 4.0s and synced to both clients.

### Underestimated Or Still Open

- Object sync latency is functional but above the PDF target. The strengthened smoke measured 219ms in dev and 171ms in local production against the `<100ms` target.
- Single-step AI latency is above the PDF target. The yellow sticky command took 4.2s against the `<2s` target; server timings showed 3.24s inside OpenAI.
- Complex AI reliability is not yet bulletproof. Under a larger board, a repeated 5-stage user journey command failed once with an unterminated JSON parse error after about 52s.
- AI frame-fit needs another focused rerun after the frame-selection smoke helper was corrected to click the frame title/border rather than the center.
- 500-object FPS was initially a real miss when all objects rendered, at 10.5 FPS. Viewport culling improved it to 66.3 FPS in dev and 69 FPS in local production, so the current rendering path is back above target.
- Manual connectors currently create a coordinate arrow. The data model supports object-bound connectors, but the toolbar does not yet provide a direct "connect these two objects" workflow.
- Network recovery is tested with offline/reconnect. True throttled-network behavior is not separately measured yet.

## Current Risk Call

The simultaneous AI conflict reported by the user appears fixed for independent creation commands. The broader requirement is not fully closed because AI performance, complex-command reliability, and exact sync latency targets still need either engineering fixes or explicit documentation of measured limits.
