# AGENTS.md — AI Agent 协作纪律

> 本文件给所有参与「余烬协议 / The Ember Protocol」开发的 AI agent（Hermes / Codex / Grok / Pi / Antigravity 等）看。人类贡献者也可参考。

## 动库之前（强制）

1. **先读通用 skill**：`~/.agents/skills/ember-protocol/SKILL.md`
   — 本机所有 agent 共用的项目协作规范，含本地目录、进度、提交记录、各 agent 分工、认证坑、PR 闭环、Canon 自由度。**不读就动手视为违规。**
2. **再读 `DESIGN.md`**：仓库根的设计文档，是主要参考资料。
3. **取最新状态**：`git log --date=short` 与 GitHub API 确认当前提交 / 分支 / PR。不要依赖 skill 里的进度快照（会变，skill 已注明）。

## 改库之后（强制）

1. **维护通用 skill**：改动落地后，立即更新 `~/.agents/skills/ember-protocol/SKILL.md` 的对应章节（提交记录、进度、文件结构、分工、新坑……），并在同目录 `MAINTENANCE.md` 追加一条：
   `- YYYY-MM-DD [agent名] 做了什么`
2. **走 PR 闭环**（详见 `cola-github-ops` 技能 / SKILL.md §7）：
   - 推分支 → 开 PR → Vercel 自动生成 preview → 飞书通知用户（PR 标题 / 编号 / 链接 + 改动摘要 + preview URL）
   - **停下等待**。用户回复 merge/合并 才合并；close/关掉 才关闭。**未经用户确认不得自行 merge 或 close。**

## 各 Agent 速查

| Agent | 调用 skill | 本项目角色 |
|-------|-----------|-----------|
| Hermes | hermes-agent（自动加载）| 系统级：记忆 / cron / gateway / 规划，PR 审批协调 |
| Antigravity (agy) | `~/.agents/skills/antigravity/SKILL.md` | 剧本 + 前端 UI（当前指派）|
| Codex | `~/.agents/skills/codex/SKILL.md` | P2 Scribe / 强逻辑与审查 |
| Grok | `~/.agents/skills/grok-build/SKILL.md` | P2 Voices / 搜索 / 识图 |
| Pi | `~/.agents/skills/pi/SKILL.md` | P2 Curator / 快速扫线索 |

## ⚠️ agy 认证坑（调 agy 的 agent 必读）

本机 agy 走本地 vertex bridge（`~/.agy/server.py`，端口 18787，用 `~/.agy/api_key.txt` 的 OAuth token 代理到 Vertex AI）。**直接调 `agy.exe` 会因缺环境变量而直连 Google 失败。** 正确姿势：

- 用 wrapper `~/.agy/bin/agy.cmd`，**或** 调 `agy.exe` 前注入：
  - `GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:18787`
  - `GOOGLE_VERTEX_BASE_URL=https://aiplatform.googleapis.com/`
  - `GEMINI_API_KEY=vertex-via-bridge`（占位值，bridge 见此值自动用 api_key.txt 真 token）
- `~/.gemini/antigravity-cli/settings.json` 保留 `modelProvider: "gemini"`（bridge 是 Gemini API 格式；去掉会走 OAuth 浏览器登录，无头环境超时）。
- 自动化入口 `~/.agents/skills/antigravity/scripts/launch_exec.py` 直接调 agy.exe——**调用前先在 shell `export` 上述三个环境变量**（launch_exec.py 用 `env=os.environ.copy()` 会继承）。
- 完整说明见 `~/.agents/skills/ember-protocol/SKILL.md` §6。

## 凭证

- `GITHUB_TOKEN` 在 `C:/Users/lenovo/AppData/Local/hermes/.env`，所有 agent 共用。本机无 `gh` CLI，统一用 curl + REST API。
- **不要**把任何密钥 / token 写进代码、日志或会被 commit 的文件。

## 快速链接

- 设计文档：[`DESIGN.md`](./DESIGN.md)
- 项目说明：[`README.md`](./README.md)
- 协作规范（本机）：`~/.agents/skills/ember-protocol/SKILL.md`
- GitHub 维护流程：`~/.agents/skills/cola-github-ops/SKILL.md`