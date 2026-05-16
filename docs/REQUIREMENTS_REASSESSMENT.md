# Requirements Reassessment

Reassessment date: 2026-05-15

This pass re-read `CollabBoard.pdf`, tightened the smoke harness, and reran local development and local production checks. The earlier completion docs were too optimistic in a few places because the smoke runner was proving functional sync without fully enforcing the PDF's performance and breadth targets.

## New Evidence

- Deep local AI run: `test-results/flex-canvas-requirements-audit-local.json`
- Local dev render run after viewport culling: `test-results/flex-canvas-render-audit-local.json`
- Local production render run after viewport culling: `test-results/flex-canvas-render-audit-prodlocal.json`
- Post-fix non-AI local production run: `test-results/flex-canvas-postfix-non-ai-local.json`
- Post-fix deep AI local production run: `test-results/flex-canvas-postfix-ai-local.json`

## Harness Fixes From This Pass

- Drag-select now fails if the test had to fall back to shift-click selection.
- 500-object capacity now waits for both clients to render 500+ objects before measuring FPS.
- AI command responses now include phase timings: auth, request parse, board access, Liveblocks storage read, OpenAI, server-side Liveblocks apply, Supabase logging, and total time.
- The smoke now has an overlapping long/short AI command probe, where one user starts a complex command and another user starts a short command while the first is still running.
- Optional `COLLABBOARD_DEEP_AI=1` coverage exercises more required AI command categories.
- The smoke now includes a selected-object connector workflow that verifies `fromId` / `toId` object-bound connectors, not only coordinate arrows.
- The smoke now includes throttled-network sync recovery coverage behind `COLLABBOARD_SKIP_THROTTLE`.
- AI command prompts now use a smaller board context slice plus object counts, and the default OpenAI reasoning effort is `low` to reduce latency without bypassing the server-side OpenAI planner.

## Findings

### Still Passing

- 5+ browser users joined the same board.
- Presence, duplicate same-user tab numbering, cursor position tracking, cursor toolbar visibility, and cursor press/drag state passed.
- Human create/edit/move/recolor/conflict/duplicate/copy/paste/line/connector/frame/drag-select flows passed functionally.
- Refresh persistence, mobile layout, disconnect/reconnect recovery, and 500+ object Liveblocks storage passed.
- Overlapping AI commands passed functionally: a long user-journey command took about 22.7s while a second user's short sticky-note command completed in about 4.0s and synced to both clients.
- The latest deep AI local production run passed the expanded command breadth probe: named frame creation, pros/cons grid, 5-stage journey map, selected sticky recolor, pink sticky move, and selected frame resize.
- The latest non-AI local production run passed throttled-network recovery with a synced object under simulated high-latency/low-throughput conditions.
- Manual connectors now have a direct "connect selected objects" toolbar workflow that creates object-bound connectors.

### Underestimated Or Still Open

- Object sync latency is functional but above the PDF target. The strengthened smoke measured 219ms in dev, 171ms in local production, 214ms in the latest non-AI run, and 263ms in the latest deep AI run against the `<100ms` target.
- Single-step AI latency is above the PDF target. The latest `gpt-5.5` low-effort yellow sticky command took 3.889s against the `<2s` target; server timings showed 2.816s inside OpenAI before Liveblocks apply and Supabase logging.
- Complex AI reliability is improved but still should be treated as a monitored risk because it depends on live model output and larger-board prompt context. The latest deep AI run passed, while an earlier larger-board rerun hit one JSON parse failure.
- 500-object FPS was initially a real miss when all objects rendered, at 10.5 FPS. Viewport culling improved it to 66.3 FPS in dev and 69 FPS in local production, so the current rendering path is back above target.
- Faster model probes did not justify changing the production default: `gpt-5.4-mini` improved some timings but regressed a deep resize probe, and `gpt-5.4-nano` did not bring the first single-step command under 2s in the smoke path.

## Current Risk Call

The simultaneous AI conflict reported by the user appears fixed for independent and overlapping commands. The broader requirement is not fully closed because AI performance and exact human object sync latency targets still exceed the PDF's ideal thresholds under local production smoke measurements.
