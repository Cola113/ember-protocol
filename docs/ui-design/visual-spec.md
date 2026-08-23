# Astral Noir 视觉设计规范 / Visual Design Specification

> **项目**：余烬协议 / The Ember Protocol  
> **风格定义**：**Astral Noir（星界黑色电影）**  
> **核心气质**：深邃靛青与玄黑虚空、冷辉与琥珀警示双色调、全息半透明毛玻璃、CRT 物理扫描线、等宽终端字符、尘埃粒子与量子磁滞辉光。

---

## 1. 调色板系统 (Color Tokens)

Astral Noir 拒绝浮夸的彩虹渐变与纯紫暗色，采用极具物理质感与科学冷峻感的 HSL 色彩体系：

| 语义变量 | CSS Token | Hex / HSL | 视觉应用场景 |
|---|---|---|---|
| **深空底色** | `--bg-void` | `#050811` (hsl 225, 50%, 5%) | 全局背景、虚空舞台、星图底层 |
| **深青沉降** | `--bg-surface` | `rgba(10, 20, 35, 0.75)` | 全息面板背景、卡片底板、玻璃抽屉 |
| **全息边框** | `--border-holo` | `rgba(56, 189, 248, 0.22)` | 拟态网格线、卡片边缘、仪表盘外框 |
| **天青载波** | `--primary-cyan` | `#38bdf8` (hsl 199, 95%, 60%) | 默认激活、信标光束、探索光标、已测绘状态 |
| **余烬琥珀** | `--accent-amber`| `#f59e0b` (hsl 38, 92%, 50%) | 警示、自催化倒计时、Synthesis 综合、关键线索 |
| **冷灰残响** | `--text-muted` | `#64748b` (hsl 215, 16%, 47%) | 辅助信息、未解锁说明、残响灰字、背景标头 |
| **终端荧光** | `--text-bright`| `#e0f2fe` (hsl 204, 100%, 94%)| 核心读数、主对话台词、终端正文 |
| **磁滞假象** | `--text-lie` | `#94a3b8` (斜体 + 下划虚线) | NPC 圆谎标注 (`lie: true`)、未证实命题 |
| **熔断警报** | `--alert-red` | `#f43f5e` (hsl 347, 90%, 60%) | 校验和错误、熔断状态、禁令阻断 |

---

## 2. 字体与排版系统 (Typography)

- **主等宽终端字体**：`JetBrains Mono`, `Fira Code`, `ui-monospace`, `monospace`
  - *字偶间距 (Tracking)*: `letter-spacing: 0.04em` 至 `0.08em`（杜绝臃肿与无间距大字）。
  - *行高 (Line Height)*: 宽裕的 `1.6` 至 `1.8`，模拟老式电传打字机与航天遥测终端的呼吸感。
- **标题展示字体**：`Cinzel`, `Space Grotesk`, `system-ui`, `sans-serif`
  - 大写字母（Uppercase）配合大字距（`letter-spacing: 0.15em`），传达古老恒星文明的纪念碑感。
- **微型标签 (Micro-Badges)**：
  - 统一使用 `text-[10px] font-mono tracking-widest uppercase py-0.5 px-2 border rounded-sm`。

---

## 3. 材质与特效 (Surfaces & Shader Hooks)

### 3.1 物理扫描线 (CRT Scanlines)
通过 CSS 线性渐变模拟老式光栅扫描仪，赋予全息界面物理实体感：
```css
.crt-scanlines {
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%, 
    rgba(0, 0, 0, 0.35) 50%
  ), linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.03),
    rgba(0, 255, 0, 0.01),
    rgba(0, 0, 255, 0.03)
  );
  background-size: 100% 3px, 6px 100%;
  pointer-events: none;
}
```

### 3.2 磨砂全息玻璃 (Holo-Glassmorphism)
```css
.holo-panel {
  background: rgba(8, 18, 32, 0.78);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(56, 189, 248, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6),
              inset 0 0 16px 0 rgba(56, 189, 248, 0.04);
}
```

### 3.3 磁滞二次辉光 (Phosphor Glow)
```css
.glow-cyan {
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.6), 0 0 20px rgba(56, 189, 248, 0.2);
}
.glow-amber {
  text-shadow: 0 0 8px rgba(245, 158, 11, 0.6), 0 0 20px rgba(245, 158, 11, 0.2);
}
```

---

## 4. 动效与过渡原则 (Motion & Dynamics)

1. **打字机流式输出 (Teletype Cadence)**：
   - 字符出现速率控制在 18ms - 32ms/字，标点符号（句号、破折号）带有 120ms 的微停顿。
2. **星图镜头插值 (Camera Lerp)**：
   - 使用三次贝塞尔曲线 `cubic-bezier(0.16, 1, 0.3, 1)`（Expo Out），800ms 从星系远景平滑吸附至行星轨道检视。
3. **脉冲呼吸 (Pulse & Resonate)**：
   - 信号信标与未探索热点采用 2.4s 循环的正弦波明暗呼吸，伴随扩散光环。
4. **命题钉选吸附反馈 (Pinning Snap)**：
   - 拖拽或点击钉选命题时，伴随 150ms 的轻微震颤缩放（scale: 0.98 -> 1.02 -> 1.0）与边框高亮。

---

## 5. UI 组件规范一览

1. **HUD 顶部导航栏**：
   - 左侧：探针状态（`ISV THRESHOLD // RECORDER-9 [VESPER]` + 内存完整度进度条）。
   - 中央：当前所处空域 / 星球坐标。
   - 右侧：余烬周期倒计时 `[00:39:59]` + 索引抽屉快捷入口 `[INDEX // TAB]`。
2. **命题徽章 (Proposition Badge)**：
   - 代码态：`Helix.Beacon.Broadcasting`
   - 状态标：`UNVERIFIED` (灰), `PINNED` (青), `SYNTHESIZED` (金), `SUSPECT` (斜体虚线)。
3. **NPC 对话气泡**：
   - 左侧 NPC 极简线框肖像 + 残响波形动画。
   - 对话正文流式输出。
   - 若检测到 `lie: true`，右下角浮现 `[ECHO_HYSTERESIS // 磁滞推演中]` 灰标。
