# P2 T0 合同冻结（v1）

状态：冻结。三条 AI 线只读 Canon Ledger；实现可以替换模型和存储，但不得改变本文件定义的边界、错误码和硬门顺序。

## 版本与变更

- 合同版本：`v1`。版本写入 schema envelope（`contract_version`）和文档。
- 任何破坏性字段、枚举、状态机或硬门改变，必须走「合同修订」小圆桌，产出新的版本号和迁移说明。
- 非破坏性扩展仍需先更新 schema、金样 fixture 和本文件，再由三线各自确认兼容性。
- 该分支只冻结契约，不接入 LLM，不改变现有 stub 的运行时返回。

## 共享错误与降级

错误码只有：

| code | 含义 | 处理 |
| --- | --- | --- |
| `validation_error` | 请求体或模型结果不符合 schema | 不调用模型（请求校验）或丢弃结果 |
| `canon_violation` | 违反 Canon、宪章、洞察/命题登记 | 丢弃产物；Curator 直接拒绝 |
| `model_unavailable` | 没有模型 key、超时或模型不可用 | 使用作者保底模板，标记 `degraded: true` |
| `cache_hit` | Scribe dossier 已存在 | 不调用模型，返回缓存 dossier |

错误响应必须包含 `error`、`message`、`retryable`、`degraded`；模板降级可带 `fallback`。LLM 输出不合法时服务器丢弃原文，不能把未经校验的文字继续写入索引或 Canon。

## API

### `POST /api/voices/chat`

请求：

```json
{
  "messages": [{ "role": "user", "content": "你记得那座信标吗？" }],
  "npcId": "npc-tarkis",
  "canonContext": {
    "planet_id": "helix-7",
    "truth_ids": ["T1"],
    "known_facts": ["Helix.Beacon.Broadcasting"],
    "insight_gates": []
  },
  "playerLog": []
}
```

输出最终对象固定为：`{ say, mood, offer_insight_id, relationship_delta, lie }`。`offer_insight_id` 只能是已登记洞察或 `null`，`relationship_delta` 为 `-2..2` 的整数。`lie: true` 的条目必须在客户端以灰条目显示，不能升级为 confirmed。

传输可为 SSE：每个 `data:` 事件先发文本增量，最后发 `{"type":"final","output":<VoicesOutput>}`；校验/Canon 错误发 JSON 错误响应。工具输入是判别联合：`consult_canon({query})`、`recall_player_log({topic})`、`offer_clue({clue_id})`。NPC 不能发明 insight id。

### `POST /api/scribe/generate`

请求：`{ "planetId": "helix-7", "landingSiteId": "site-helix-coldboot" }`。

首次生成返回 `status: "generated", cached: false, dossier`；命中 `dossier_cache` 返回 `error: "cache_hit"` 语义对应的 `status: "cache_hit", cached: true, dossier`，不调用模型。dossier 固定包含地方志摘要、`today_event`、环境描述/危险/现象和浅层 `local_npcs` 卡。

Scribe 允许生成地方风物、今日事件、环境描述和浅层 NPC 卡；其冻结采样温度为 `0.7`。禁止主线洞察、结局、跨星机关答案和改变几何。违反宪章或 Zod 校验失败时丢弃，最多重试两次，之后使用模板 dossier。

### `POST /api/curator/synthesize`

请求：`{ "truthId": "T1", "hypothesisText": "...", "pinnedPropositions": ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"] }`。

评分结果固定为：

```json
{ "verdict": "passed", "coverage": 0.9, "correctness": 0.9, "coherence": 0.8, "feedback": "..." }
```

分数均为 `0..1`。`passed` 才能把 truth 状态推进到 `believed`；`partial` 保持 `suspected`；`failed` 不推进。

**硬门先于 LLM：**服务器先从只读 Canon 取 `required_propositions`。任一命题缺失，立即返回 `status: "rejected"`、`error: "canon_violation"`、`verdict: "failed"` 和 `missing_required_propositions`，不得调用 LLM，也不得标记 believed。只有全部命题已钉选才进入评分。没有模型 key 时保留确定性关键词兜底，但至少命中一个该 truth 的已登记关键词；不得比原 stub 更松。

## Canon 只读面

`lib/canon.ts` 导出 `CANON_READ: CanonReadApi` 和 `getCanonContext`。Voices、Scribe、Curator 只能使用以下查询：星球/降落点、锚定真相、锚定 NPC、已发布宪章、已登记 proposition/insight。接口没有写入方法，三线不能修改 `CANON`、truth 状态或结局。

宪章字段按 `planet_id` 关联 Canon：T1 将作者冻结的宪章挂入 `docs/canon-ledger.json` 顶层 `constitutions[planet_id]`（或等价只读存储），并通过 `getConstitution(planet_id)` 暴露。`true_facts` 是三线可引用且不可否定的事实；`believed_facts` 只描述 NPC 信念，可含假；`forbidden_claims` 和 `archive_fill_policy` 是 Scribe/Voices 的拒绝边界；`npc_roster`、`insight_gates` 供 Voices；Curator 只读取 truth 的命题和评分事实，不得用宪章改写 truth。

## 金样

`tests/fixtures/` 提供 Voices（含 `lie: true`）、dossier、Curator 的 passed/partial/failed 以及硬门拒绝反例。T3-T6 的请求、缓存、UI 和测试必须以这些 fixture 为合同对照，不得复制当前 stub 的额外字段。
