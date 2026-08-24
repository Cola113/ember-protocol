# Contributing to The Ember Protocol

Thanks for helping with **余烬协议 / The Ember Protocol**. This file is for humans and AI agents. Playable frontend is P0–P5; P2 live AI and hosted data stores are still ahead.

## Workflow

1. **Fork** (or clone if you already have write access) [Cola113/ember-protocol](https://github.com/Cola113/ember-protocol).
2. **Branch** from up-to-date `main`. Prefer a prefix: `feat/`, `fix/`, `docs/`, `chore/`.
3. **Change** only what the task needs. Do not rewrite canon or visual tokens “while you are here.”
4. **Verify** locally (see [Checks](#checks)).
5. **Open a PR** against `main`. Describe player-facing behavior, not just file lists.
6. **Review** — at least one other reviewer (for AI authors: a cross-review roundtable; see below).
7. **Merge** only after the maintainer confirms. Do not merge or close someone else’s PR without that confirmation.

Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## AI agents — read `AGENTS.md` first

AI contributors **must** follow [`AGENTS.md`](./AGENTS.md). In short:

| When | Do |
|------|----|
| **Before editing** | Load `~/.agents/skills/ember-protocol/SKILL.md`, read `DESIGN.md`, then `git log` / GitHub — do not trust skill snapshots. |
| **After editing** | Update that skill and append `MAINTENANCE.md`. |
| **Before a PR** | Run a **cross-review roundtable** (`run-roundtable`, face-to-face with a capable *other* agent). Agree (`同意` / `保留意见但同意执行`) before pushing. Hermes arbitrates deadlocks. Notes stay in local `.roundtable/` (gitignored). |
| **PR loop** | Push → open PR → wait for preview → notify the human → **stop**. Merge/close only when they say so. |

Capability mapping and the Feishu approval loop live in the ember-protocol skill and `cola-github-ops`. Do not commit tokens, `.env.local`, or roundtable transcripts.

## Code conventions

### TypeScript

- `tsconfig.json` has `"strict": true`. Do not weaken it, and do not add `any` to silence errors.
- Prefer existing types in `lib/canon.ts` and `lib/save-system.ts` over parallel shapes.
- Path alias: `@/` → repo root (`@/lib/canon`, `@/components/ui/...`).

### Components

| Path | Role |
|------|------|
| `app/` | Routes and Route Handlers only. Game orchestration stays in `app/page.tsx` unless you are adding a real route. |
| `components/galaxy/` | React Three Fiber scene. Keep imported with `next/dynamic` and `ssr: false`. |
| `components/ui/` | HUD, Index, stages, cinematics. Client components; keep 3D out of this folder. |
| `lib/` | Canon loaders, dialogue trees, save schema — no React. |
| `docs/canon-ledger.json` | Source of worlds, truths, NPCs, landing sites. UI reads it through `lib/canon.ts`. |

- Do not contradict the ledger or `STORY.md` in gameplay code.
- Dialogue trees belong in `lib/dialogues.ts`, not inline JSX.
- Interactive UI that a player sees needs `aria-*` / landmarks consistent with existing screens (`role="dialog"`, `aria-modal`, skip controls).

### Astral Noir tokens

Do not invent hex colors in components. Use Tailwind theme keys from `tailwind.config.ts` and CSS variables in `app/globals.css`:

| Token | Use |
|-------|-----|
| `void`, `surface`, `surface-dark` | Backgrounds |
| `holo-cyan` / `--primary-cyan` | Primary signal, mapped state |
| `holo-amber` / `--accent-amber` | Warning, Synthesis, countdown |
| `holo-bright`, `holo-muted` | Text |
| `holo-lie` | Unreliable Echo / `lie: true` |
| `holo-red`, `holo-green` | Fault vs confirmed |
| `font-mono` (JetBrains Mono) | Terminal body |
| `font-display` (Cinzel) | Titles |

Full spec: [`docs/ui-design/visual-spec.md`](./docs/ui-design/visual-spec.md). Prefer `holo-panel`, `crt-overlay`, and existing motion patterns over new chrome.

## Checks

Before you ask for review, from the repo root:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must pass. There is no separate test runner yet; `tsc` + `lint` + `build` *are* the gate.

If you change UI, play the path you touched (`/` and, if relevant, `/landing`): opening → galaxy → land → hotspot → Index Synthesis → save/load. Check empty/error states, not only the happy path.

## Scope and secrets

- Do not commit `.env`, `.env.local`, API keys, or OAuth tokens. Copy [`.env.example`](./.env.example) and keep real values local / on the host.
- Do not expand P2 AI, Postgres, or auth in a “docs” or “UI polish” PR unless that is the task.
- Endings and the truth graph are author-locked: do not add a fourth ending or a seventh truth without a design change.

Questions about fiction: `DESIGN.md` + `STORY.md` + `docs/canon-ledger.json`. Questions about agent process: `AGENTS.md`.
