# Changelog

All notable changes to **The Ember Protocol / 余烬协议** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Headings use [Conventional Commits](https://www.conventionalcommits.org/) types (`feat`, `fix`, `docs`).

Version numbers below are **product milestones** (design → playable P0–P5). They are not bumped in `package.json` (still `0.1.0`).

## [Unreleased]

### docs

- Rewrite `README.md` for the playable P0–P5 build
- Add `.env.example`, `CONTRIBUTING.md`, and this changelog

## [0.7.0] — 2026-08-24

P4 content + P5 release surface. Squash: `feat: P4+P5 endings, onboarding, landing, a11y` (#7).

### feat

- Three resolution protocols: **Seal-Off**, **Permission to Overwrite**, **Night Shift Recurse**, with typed ending UI and epilogue logs
- Overwrite ending gated until the Ember Cycle is in its last 25%
- Public landing page at `/landing` (features, endings, enter-game)
- First-run onboarding hints (survey / Index / inference graph), dismissible and persisted
- Accessibility pass: dialog roles, labels, skip-typewriter, Tab trap on the truth-unlock overlay, Index contrast

### fix

- Codex review rounds on countdown gate, save timing, timer clamping, typewriter races, modal a11y
- Stale `[TAB]` hint updated to the `[INDEX]` HUD control

## [0.6.0] — 2026-08-24

P3 interaction UX. Squash: `feat: P3 UX polish (codex reviewed)` (#6).

### feat

- Camera and view transitions (galaxy ↔ survey ↔ landing cinematic ↔ surface ↔ ship)
- Surface-stage interaction polish
- Inference graph overlay on the 3D spur
- Index console: proposition pinning, Synthesis workspace, four-state truth machine (`unknown` / `encountered` / `suspected` / `believed`)
- Save system: three manual `localStorage` slots + auto slot, schema version 1

### fix

- OrbitControls vs. programmatic camera conflict
- Save validation / normalize path for corrupted slot payloads

## [0.5.0] — 2026-08-23

P1 remaining worlds. Squash: `feat: P1 剩余星球地表戏台 + NPC 对话 + 3D 星球视觉 + 解锁链修复` (#5).

### feat

- Surface stages, hotspot types, and 3D treatments for the rest of the nine author worlds
- Anchored NPC dialogue trees (`lib/dialogues.ts`)
- Acyclic unlock chain driven by believed truths (T1–T5 + THidden)

### fix

- Truth-unlock deadlock in the canon graph
- NPC dialogue hotspots counted toward site completion

## [0.4.0] — 2026-08-23

P1 vertical slice. Squash: `feat: P1 vertical slice — Helix-7→Kiln 可交互闭环` (#4).

### feat

- Playable Helix-7 → Kiln loop: survey, land, hotspots, propositions, Synthesis
- Landing cinematic and holographic truth-unlock overlay
- 3D polish on the first two worlds

### fix

- Curator stub and Synthesis UI now require all `required_propositions` before `believed`

## [0.3.0] — 2026-08-23

P0 foundation. Squash: `feat: canon script + Astral Noir UI prototypes + Next.js P0 scaffold + R3F galaxy` (#3).

### feat

- Next.js App Router scaffold, Tailwind Astral Noir theme, R3F galaxy scene
- `STORY.md` canon script and `docs/canon-ledger.json`
- HTML UI prototypes under `docs/ui-design/` plus `visual-spec.md`
- Stub Route Handlers: `/api/voices/chat`, `/api/scribe/generate`, `/api/curator/synthesize`

### fix

- Hide Black Interval until unlocked
- Remove a pre-granted Helix proposition that skipped the tutorial beat

## [0.2.0] — 2026-08-23

Collaboration framework.

### docs

- `AGENTS.md` — read the shared skill before edits, maintain it after, PR approval loop (#1)
- Cross-review roundtable clause (author + a capable other agent; Hermes as deadlock arbiter) (#2)
- `.gitignore` entries for `.roundtable/`, `.next/`, and `.env*`

## [0.1.0] — 2026-08-22

Initial public design.

### docs

- Project README (one-liner + stack + design-phase status)
- `DESIGN.md` — worlds, 5+1 truths, three endings, play loop, AI layers, architecture, schedule

### chore

- Repository initial commit
