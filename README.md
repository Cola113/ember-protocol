# 余烬协议 / The Ember Protocol

> A galaxy that computed itself into silence.

A 3D galaxy mystery game powered by AI, deployable on Vercel.

## What is this?

You are a memory-wiped archival AI, sent to execute the "Ember Protocol" — verify that no one reignites a galaxy-spanning computation that wrote an entire civilization into its own result. Explore a 3D star map, land on planets, talk to AI-driven NPCs (residual echoes of the vanished civilization), collect clues, and piece together the truth through **Synthesis** — the game ends not when you click an option, but when you truly understand.

## Key Features

- 🌌 **3D Interactive Galaxy** — 9 hand-crafted planets + hidden Black Interval, built with React Three Fiber
- 🤖 **Three-Layer AI** — NPC dialogue (Voices), content generation (Scribe), narrative engine (Curator), all constrained by a Canon Ledger
- 🧩 **Synthesis Mechanic** — State your understanding in your own words; the AI scores it against the canon
- 🎭 **Player as AI** — All AI systems are diegetic (in-narrative); you ARE the AI
- 🔥 **"AI lies" as physics** — NPC hallucinations are written into the universe's rules, not treated as bugs

## Tech Stack

- **Frontend**: Next.js App Router + React Three Fiber + Three.js + Tailwind
- **AI**: Vercel AI SDK (streamText / generateObject)
- **Data**: Vercel Postgres (pgvector) + KV + Blob
- **Deploy**: Vercel (Edge + Node runtime)

## Documentation

- [DESIGN.md](./DESIGN.md) — Full game design document

## Status

🚧 Design phase — reviewed by Codex, Grok, and Pi. Development starting soon.

## License

MIT

## For AI Agents

AI agents working on this repo: read [`AGENTS.md`](./AGENTS.md) and the shared skill `~/.agents/skills/ember-protocol/SKILL.md` **before touching the code**. After changes, maintain that skill and follow the PR approval loop (see AGENTS.md).

参与本项目的 AI agent：动手前先读 [`AGENTS.md`](./AGENTS.md) 与通用 skill `~/.agents/skills/ember-protocol/SKILL.md`；改库后维护该 skill 并走 PR 闭环。
