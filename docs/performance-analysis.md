# 性能分析与建议（P5）

> 依据：`app/page.tsx`、`app/layout.tsx`、`components/galaxy/GalaxyScene.tsx`、`lib/save-system.ts`、`package.json`、本地已有 `next build` 的 `.next/static/chunks`（Galaxy 在 `react-loadable-manifest.json` 中）。  
> **只分析给建议，不改** `app/` / `components/` / `lib/`。  
> 难度：S = 小改（<1h）· M = 半天级 · L = 需设计/多文件。  
> 影响：首屏 / 帧率 / 内存 / 主线程。

---

## 0. 结论先行

3D 动态 import + `ssr: false` **是合理的**，落地页也没拖 Three。真正的问题不在「会不会每帧 `new Vector3`」（当前 `CameraController` 已用 `useMemo`，仓库里 **没有** 名叫 CameraRig 的组件），而在这四件：

1. **星系 Canvas 常驻**：离开星系后仍以 60fps 绘制，外加 `filter: blur-[1px]`（`app/page.tsx` 198–212 行）。
2. **游戏壳每秒整树重渲染**：计时器 `setState` 带动 `GalaxyScene` 与全部 UI（72–95 行）。
3. **自动存档 1Hz 写 `localStorage`**：同一 effect 依赖了 `elapsedSeconds` / `emberCycleSecondsLeft`。
4. **`/` 首包把地表/结局/索引静态打进主 chunk**（`SurfaceStageView.tsx` 约 1350 行），Galaxy 虽拆包但游戏 JS 仍然偏肥。

几何很轻（≤9 星 + 1200 点），中端独显上星系视图应当能稳住 60fps；低端核显 + 高 DPR + 离屏模糊才是掉帧来源。Three/drei **可砍的运行时体积有限**（Three 核心 gzip ~167 KB），优先砍的是 **何时绘制** 和 **何时加载 UI 模块**。

---

## 1. 测量基线（#9 快照，非现测）

> **快照声明（2026-08-24 圆桌收敛）**：本表 gzip 体积测于 `140f5cd`（PR #9）本地 `next build` 的 `.next` 产物（PowerShell `GZipStream`），**不是 `60c5de5`（#10）的现测**。JS chunk 不受 #10 影响（#10 的 4 张图是 URL 字符串引用，不进 JS bundle），但 **P5 性能优化开工前必须按当时最新 build 重测体积**，不要把这组数字当实时基线。

### 1.1 `/` 游戏壳（不含动态 Galaxy）

| Chunk | 角色（推断） | raw | gzip |
|-------|----------------|-----|------|
| `fd9d1056-*.js` | Next/React runtime | 168.8 KB | 53.1 KB |
| `117-*.js` | 共享 vendor | 121.4 KB | 31.3 KB |
| `825-*.js` | 游戏页共享（Framer 等） | 128.5 KB | 41.7 KB |
| `app/page-*.js` | 游戏壳 + 全部静态 UI | 181.8 KB | 52.0 KB |
| `webpack-*.js` + `main-app-*.js` | 运行时胶水 | ~4.3 KB | ~2 KB |

**首屏 JS（进星系前）约 605 KB raw / ~180 KB gzip**，另加 CSS 47.0 / 8.3 KB。另有 Google Fonts 两次外链（见 §2.3），不在这组数字里。

### 1.2 动态 `GalaxyScene`（`ssr: false` 之后）

`react-loadable-manifest.json`：`app/page.tsx -> @/components/galaxy/GalaxyScene`

| Chunk | 角色（推断） | raw | gzip |
|-------|----------------|-----|------|
| `b536a0f1.*.js` | **three** | 672.0 KB | 167.2 KB |
| `254.*.js` | R3F + drei | 152.0 KB | 49.0 KB |
| `692.*.js` | 场景模块 | 7.8 KB | 3.0 KB |

**3D 增量约 832 KB raw / 219 KB gzip**。打开 `/` 且进入会挂 Canvas 的布局后才会拉。

### 1.3 `/landing`

| Chunk | raw | gzip |
|-------|-----|------|
| `934-*.js` | 28.9 KB | 9.8 KB |
| `app/landing/page-*.js` | 11.2 KB | 4.1 KB |

落地页 **不拉 Three**。共享 runtime 仍在（layout 是客户端字体 + CRT CSS）。这条分割是对的。

### 1.4 依赖在磁盘 vs 是否进包

| 包 | lock 版本 | node_modules 约 | 进浏览器？ |
|----|-----------|-----------------|------------|
| `three` | 0.167.1 | 23.4 MB | 是，动态 chunk |
| `@react-three/drei` | 9.122.0 | 1.7 MB | 部分（OrbitControls + Html） |
| `@react-three/fiber` | 8.18.0 | 0.6 MB | 是，动态 |
| `framer-motion` | 11.18.2 | 2.8 MB | 是，`/` 与 `/landing` |
| `lucide-react` | 0.428.0 | 23.3 MB 源（图标全集） | 按 import 摇树，仍在各 UI |
| `ai` + `@ai-sdk/react` | 3.4.33 / 0.0.40 | 8.0 MB | **否**（零 import） |
| `next` | 14.2.35 | 82.8 MB | runtime 部分 |

`ai` 现在不占首屏。P2 接线时不要把它 import 进 `app/page.tsx`。

### 1.5 #10 新增 `public/` 图片的网络首载（不在 JS 表内）

> 2026-08-24 圆桌补记：`60c5de5`（#10）新增 4 张静态图（URL 字符串引用，**不进 JS bundle**，不污染上面 gzip 表），但增加**页面级网络首载**，P5 优化时别漏掉当前最大的非 JS 传输：

| 图片 | 大小 | 引用位置 | 加载时机 |
|------|------|----------|----------|
| `public/opening-bg.png` | 461.7 KB | `OpeningTerminal.tsx:54` 与 `:151`（同 URL，浏览器只拉一次）| 开场（`/`）|
| `public/hero-bg.png` | 432.9 KB | `landing/page.tsx:106` | 落地页 |
| `public/og-image.png` | 107.3 KB | `layout.tsx` meta（OG）| 仅爬虫，不进游戏主路径 |
| `public/favicon.png` | 1.2 KB | `layout.tsx` icons | 忽略 |

合计约 **894 KB 非 JS 首载**（og/favicon 不计入游戏主路径）。P5 可考虑：hero/opening 转 WebP/AVIF（预计 150–250 KB 内）、`loading="lazy"`（非首屏视图）、或预压缩发布。

---

## 2. 首屏加载

### 2.1 R3F `dynamic(..., { ssr: false })` — 合理

`app/page.tsx:19-28`：

```tsx
const GalaxyScene = dynamic(() => import("@/components/galaxy/GalaxyScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-void text-holo-cyan font-mono text-xs">
      ...
      INITIALIZING 3D EMBER SPUR SHADERS...
    </div>
  ),
});
```

| | |
|--|--|
| **位置** | `app/page.tsx:20-28` |
| **判断** | Three / WebGL 不能在 Node SSR。禁用 SSR + 独立 chunk 避免构建期 `window` / GL 崩溃，也让 `/landing` 不付 3D 税。 |
| **副作用** | 游戏页 hydration 后才拉 ~219 KB gzip 的 3D 包；开场字幕期间 Canvas 已经挂上（`currentView === "opening"` 仍渲染 `GalaxyScene`，198–212 行），等于用开场掩盖下载+编译。 |
| **建议** | 保留 `ssr: false`。可选：开场阶段只预取 chunk、等 `onComplete` 再 `<Canvas>`（S–M）。 |
| **影响** | 首屏 |
| **难度** | 已做对；微调 S |

### 2.2 WebGL 初始化耗时（估，非实测 profiler）

场景规模（`GalaxyScene.tsx`）：

- 粒子：`CosmicDust` 默认 **1200** 点（17–84 行），`Float32Array` 一次分配。
- 星球：最多 9 个 `PlanetNode`；主球 `sphereGeometry([r, 36, 36])`（353 行）≈ 1330 顶点；大气 `sphereGeometry([r, 24, 24])` BackSide（408–429 行）；1–2 个 `ringGeometry`；盲日/黑间隔另有八面体笼。
- 材质：几乎全是 `meshStandardMaterial`（PBR，387–404 行 emissive），另加 `LineDashedMaterial` + `LineBasicMaterial`。
- 灯：1 ambient + 3 point（559–562 行）。无 shadow、无 postprocessing、无自定义 shader。
- 标签：每星一个 drei `Html`（433–460 行）→ CSS2D 层。
- Canvas：未设 `dpr` / `frameloop` / `gl.powerPreference`（555–557 行）。R3F v8 默认 `dpr` 上限 2、`frameloop="always"`、默认抗锯齿。

**数量级（在 3D chunk 已解析之后）：**

| 阶段 | 独显笔记本 | 核显 / 低端核 |
|------|------------|----------------|
| `getContext('webgl2')` | 10–40 ms | 30–80 ms |
| 首次编译 StandardMaterial + Points + Line shader | 50–150 ms | 150–400 ms |
| 几何上传 + 第一帧（含 9×Html layout） | 20–60 ms | 50–150 ms |
| **合计到第一帧可交互星图** | **~0.2–0.4 s** | **~0.4–0.8 s**（差机 1–2 s） |

主导往往是 **shader 编译 + 高 DPR 全屏抗锯齿**，不是 1200 点。Chrome 可在 `about:gpu` / Performance「Frames」里对一下。未在本文写死 FPS 数字。

### 2.3 阻塞与布局层（非 3D）

| 问题 | 位置 | 影响 | 难度 |
|------|------|------|------|
| Google Fonts 外链（Cinzel + JetBrains Mono），没用 `next/font` | `app/layout.tsx:45-50` | 首屏：多 2 RTT，FOUT/FOIT；离线/中国网络更明显 | S |
| 全屏 CRT `background-size: 100% 3px` + vignette `inset 160px` 阴影 | `app/globals.css:29-46`，layout 恒挂 | 帧率：每帧多一层全屏合成；叠在 WebGL 上 | S（`prefers-reduced-motion` 或低端关 CRT） |
| `/` 整页 `"use client"`，RSC 几乎没帮上游戏壳 | `app/page.tsx:1` | 首屏：主 chunk 含全部静态 import 的 UI | L（要拆路由/组件边界） |

### 2.4 建议

- **S** `next/font/google` 自托管 Cinzel / JetBrains Mono，删 layout 里的 stylesheets。影响：首屏。
- **S** Canvas `dpr={[1, 1.5]}`，低端 `window.devicePixelRatio > 2` 时降到 1；`gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}`。影响：首屏编译 + 帧率。
- **M** 开场结束再 mount `<Canvas>`，或 `frameloop` 在 opening 设 `"never"`。影响：开场期 GPU / 电量。

---

## 3. 渲染性能（`useFrame` / 分配 / `useMemo`）

### 3.1 常驻 Canvas + CSS blur（最高优先）

`app/page.tsx:198-212`：

```tsx
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          currentView === "galaxy" || currentView === "survey"
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-20 scale-105 pointer-events-none filter blur-[1px]"
        }`}
      >
        <GalaxyScene
          ...
        />
      </div>
```

离开星系（opening / ship / surface / index / ending / cinematic）时：

1. WebGL **仍在** `frameloop="always"` 跑 CosmicDust、每颗星的 `useFrame`、OrbitControls damping。
2. 容器 `scale-105` + **`filter: blur(1px)`**：浏览器把整张 canvas 当位图模糊。这比场景本身更贵。
3. `opacity-20` 并不停止 GL。

| | |
|--|--|
| **位置** | `app/page.tsx:198-212`；循环在 `GalaxyScene.tsx` 52–57、233–262、506–530 |
| **影响** | 帧率、电量、地表/船舱时的主线程（GL + 模糊 + 下面的 DOM） |
| **建议** | 非 galaxy/survey：`frameloop="never"` 或卸载 Canvas；背景用静态截图/CSS。至少去掉 blur，改低透明度或 `transform: scale` 不要配 filter。 |
| **难度** | S（停帧/去 blur）– M（卸载与再挂、保持相机状态） |

### 3.2 每秒整树 `setState`

`app/page.tsx:72-95`：

```tsx
  useEffect(() => {
    if (currentView === "opening" || currentView === "ending") return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setEmberCycleSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    ...
  }, [currentView]);

  useEffect(() => {
    if (collectedPropositions.length > 0 || believedTruths.length > 0) {
      saveGame("auto", { ..., elapsedSeconds, emberCycleSecondsLeft, ... });
    }
  }, [collectedPropositions, believedTruths, completedHotspotIds, elapsedSeconds, emberCycleSecondsLeft]);
```

每秒：HomePage 重渲染 → 新的 `handleSelectPlanet` 等 inline 函数 → `GalaxyScene` props 变 → R3F 调和 9 个 `PlanetNode` + Html 标签。HUD 倒计时确实需要每秒更新，**星图不需要**。

| | |
|--|--|
| **位置** | `app/page.tsx:72-95`；未 `useCallback` 的 handler：`156-190` 行一带 |
| **影响** | 帧率（每秒一次 React 调和尖峰）、主线程、连带 1Hz 写盘（§6） |
| **建议** | 倒计时放 `ref` + 只订阅 HUD 的 store/context；或拆 `HudTimer`。`onSelectPlanet` `useCallback`。 |
| **难度** | M |

### 3.3 CosmicDust 旋转

`GalaxyScene.tsx:52-57`：

```tsx
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.012;
      pointsRef.current.rotation.x += delta * 0.004;
    }
  });
```

只改 `rotation`，无分配。1200 点 `sizeAttenuation` 全屏 overlay，fill 成本低。可按 `navigator.hardwareConcurrency` / 降级 2D 把 `count` 降到 400–600（S）。

**影响**：帧率（低）。**难度**：S。

### 3.4 PlanetNode 每星每帧

`GalaxyScene.tsx:233-262`：

```tsx
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      ...
      if (isMarrow) {
        const bioPulse = 1.0 + Math.sin(t * 3.6) * 0.07;
        meshRef.current.scale.set(targetScale, targetScale, targetScale);
      }
    }
    // rings / cage 旋转
  });
```

最多 9 路 `useFrame`，无 `new Vector3`。髓星 `scale.set` 与 JSX `scale={...}`（337 行）可能抢同一属性（选中放大 vs 心跳）——逻辑问题，不是 GC。

`sphereGeometry` 36×36 对这种屏幕尺寸的球偏密，16–24 足够（S，顶点↓，首屏微降）。

每星 `Html` 标签（433–460 行）：悬停 `setHovered` 会让 **React DOM 进 GL 树**。9 个 CSS2D 元素是星系视图里仅次于全屏 canvas 的 DOM 成本。可换成 sprite `Text` 或屏幕空间 HTML 一次绘制（M）。

**影响**：帧率。**难度**：几何 S / 标签 M。

### 3.5 CameraController 与「每帧 Vector3 / CameraRig」

仓库 **没有** `CameraRig`。对应实现是 `CameraController`（466–532 行）。

`GalaxyScene.tsx:477-530`：

```tsx
  const desiredTarget = useMemo(() => {
    if (!targetPlanet) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(
      targetPlanet.coordinates.x * 0.8,
      ...
    );
  }, [targetPlanet]);
  // desiredCamPos 同样 useMemo
  useFrame((_, delta) => {
    ...
    controls.target.lerp(desiredTarget, speed);      // 原地写
    camera.position.lerp(desiredCamPos, speed);
    const targetDist = controls.target.distanceTo(desiredTarget);
    const camDist = camera.position.distanceTo(desiredCamPos);
    ...
    if (controls.enabled) controls.update();         // damping，每帧
  });
```

`lerp` / `distanceTo` / `copy` **不分配**新 `Vector3`。`useMemo` 只在 `targetPlanet` 变化时分配。若早期审查（P3 OrbitControls 冲突那轮）见过「每帧 `new Vector3`」，**当前主干已经不是那种写法**。

残留：

- 过渡结束后仍每帧 `controls.update()`（有 `enableDamping`，合理）。
- `desiredTarget` 是 memo 出的同一实例，被 `controls.target.lerp` 当目标用，不要在别处 mutate。

**影响**：帧率/内存 — 当前 **低**。**难度**：无需为 GC 改；保持别把 `new THREE.Vector3` 写进 `useFrame`。

`visiblePlanets` / `unlockedPlanetIds` / 曲线点 / `canonicalPairs` 均有 `useMemo`（544–551、18–47、88–111、134–148 行）。游戏壳里 `unlockedPlanetIds`、`canResolveEnding` 也 memo 了（`page.tsx` 52–66）。缺口是 **未 memo 的回调与每秒父渲染**，不是缺星图 memo。

### 3.6 其它帧成本

| 问题 | 位置 | 影响 | 难度 |
|------|------|------|------|
| `meshStandardMaterial` × 每星，本可用 `meshBasic` + emissive 的全息风 | `GalaxyScene.tsx:356-404` | 帧率（fill/shader） | M（外观要对照 visual-spec） |
| 大气 BackSide 透明球，overdraw | `408-429` | 帧率 | S（降段数或合并进 fresnel） |
| `LandingCinematic` 50ms 一次 `setAltitude` | `LandingCinematic.tsx:28-34` | 主线程，仅 5.4s 过场 | S |
| 地表打字机 15ms `setDisplayed` | `SurfaceStageView.tsx:47-65` | 主线程（仅地表） | S（已有点击跳过） |
| 无低端 2D 星图降级（`DESIGN.md` 有、代码无） | — | 帧率（核显/无 WebGL） | L |

---

## 4. 内存与 `THREE.Line` dispose

Pi 提过的 Line 泄漏：`SpurCurve` 与 `InferenceLines` 用 `useMemo` **命令式** `new THREE.Line` + `<primitive>`，并在 `useEffect` 清理里 `geometry.dispose()` + `material.dispose()`：

| 组件 | 创建 | dispose |
|------|------|---------|
| `SpurCurve` | 88–111 | 113–124 |
| `InferenceLines` | 150–173 | 175–186 |

当前路径 **有配对 dispose**。仍脆：

1. React 18 StrictMode（`next.config.mjs` `reactStrictMode: true`）会 unpack / remount：依赖 effect 清理。不要去掉这两段 cleanup。
2. `useMemo` 里 new 资源不是 R3F 习语；父重渲染若让 `visiblePlanets` 换引用，会重建全部 Line（`visiblePlanets` 已按 `unlockedPlanetIds` memo，解锁瞬间会重建，可接受）。
3. JSX 创建的 `bufferGeometry` / `pointsMaterial` / `sphereGeometry` 随元素卸载由 R3F 处理；Canvas 若永不卸载（§3.1），这些 GPU 对象 **整局常驻**。这是常驻策略的代价，不是漏 dispose。
4. `InferenceLines` 的 `key={idx}`（191 行）：条数变化时可能错复用 primitive。应用 `id1-id2` 当 key（S）。

**建议**（M）：改成声明式 `<line>` / `<lineSegments>` + JSX 材质，删手写 dispose。在改之前 **不要删** 现有 cleanup。

**影响**：内存。**难度**：现状 S 级风险（已 dispose）；声明式重构 M。

---

## 5. 代码体积与分割

### 5.1 已经做对的

- Galaxy `dynamic` + `ssr: false` → Three 不进 `/landing`、不进 SSR。
- drei 的 `hls.js` / `@mediapipe/tasks-vision` 在 loadable manifest 里是空 `files`，没打进包。
- `ai` SDK 未进客户端。
- 地表是 DOM 戏台，不是第二套 R3F（符合「只两页加载 Three」的设计精神；实际是 **单页常驻一套**）。

### 5.2 主 chunk 过肥

`app/page.tsx:7-16` **静态** import：

`HudHeader`、`OpeningTerminal`、`PlanetSurveyModal`、`SurfaceStageView`（**76 KB 源 / ~1350 行**）、`IndexDrawer`、`ShipInteriorView`、`LandingCinematic`、`TruthUnlockOverlay`、`EndingSequence`、`OnboardingHints`。

`SurfaceStageView` 再静态拉 `lib/dialogues.ts`（~606 行）。开场打字机阶段这些都已在 `app/page-*.js`（gzip 52 KB）里。

| 建议 | 位置 | 影响 | 难度 |
|------|------|------|------|
| `next/dynamic` 拆 `SurfaceStageView`、`EndingSequence`、`IndexDrawer`、`ShipInteriorView`（进地表/船/结局再拉） | `page.tsx:7-16` | 首屏 | S–M |
| 落地页已独立路由，保持不要 import galaxy | `app/landing/page.tsx` | 已 OK | — |
| `lucide-react` 继续具名 import；不要 `import *` | 各 UI | 体积 | 已遵守 |
| 评估砍 `@react-three/drei`：只用 `OrbitControls` + `Html`，可手写 controls / 屏幕 HTML | `GalaxyScene.tsx:5` | 3D gzip ~49 KB 的一部分 | M（易回归 P3 相机冲突） |
| **不要**为体积改 three 版本或换引擎 | — | — | 不建议 |
| P2 前可把 `ai` / `@ai-sdk/react` 留在 package.json，但继续禁止从 `page.tsx` import | `package.json` | 体积（当前 0） | 纪律 |

Framer Motion 在 `/` 与 `/landing` 都用，gzip 量级已含在 `825` / `934`。为 Astral Noir 过场值得留；不要为砍包换成 CSS 再重写全部 `AnimatePresence`（L，收益差）。

### 5.3 `transpilePackages: ['three']`

`next.config.mjs:4`。保证 Vercel Linux 构建可编译 three ESM。对 **运行时** 体积几乎无影响。保留。

---

## 6. localStorage 自动存档频率

`app/page.tsx:83-95`：

```tsx
  useEffect(() => {
    if (collectedPropositions.length > 0 || believedTruths.length > 0) {
      saveGame("auto", {
        collectedPropositions,
        believedTruths,
        completedHotspotIds,
        elapsedSeconds,
        playTimeMinutes: Math.floor(elapsedSeconds / 60),
        emberCycleSecondsLeft,
      });
    }
  }, [collectedPropositions, believedTruths, completedHotspotIds, elapsedSeconds, emberCycleSecondsLeft]);
```

`saveGame` → `JSON.stringify` + `localStorage.setItem`（`lib/save-system.ts:222-224`）。槽位 key：`ember_protocol_save_auto` 等（21、3 行）。

Pi 说的「每秒写」**属实**：`elapsedSeconds` 与 `emberCycleSecondsLeft` 每秒变，effect 每秒跑。空进度（两数组都空）会跳过，所以 **开场未收集前不写**；Helix-7 第一条命题之后整局 1Hz。

载荷很小（schema v1 几个数字 + 短字符串数组，通常 < 2 KB），打不满 5 MB 配额。成本是：

- 主线程同步 `setItem`（偶发 hitches；Safari 隐私模式 throw，已 catch 打 log）。
- 未来若双写云端，1Hz 会直接打爆 KV 免费层（见跨设备文档）。

手动槽不在这个 effect 里（`ShipInteriorView.tsx:95-115`）。

| 建议 | 影响 | 难度 |
|------|------|------|
| 进度数组变化 **立即** 写；计时器 **节流 15–30s**；再加 `visibilitychange` / `beforeunload` 各刷一次 | 主线程；为云端双写做准备 | S |
| 计时器不要放进「进度 effect」的 deps，改从 ref 读最新秒数 | 同上 | S |
| 不要为了性能改 schema；体积不是问题 | — | — |

**位置**：`app/page.tsx:83-95` + `lib/save-system.ts:166-231`。  
**影响**：主线程（当前）；接云端后变成本/配额。

---

## 7. 建议总表（按该动手顺序）

| # | 建议 | 位置 | 影响 | 难度 |
|---|------|------|------|------|
| 1 | 非星系视图停止 GL 循环，去掉 canvas 的 CSS `blur` | `page.tsx:198-212` | 帧率 | S–M |
| 2 | 自动存档节流；计时器从进度 effect 拆出 | `page.tsx:72-95` | 主线程 | S |
| 3 | 倒计时不要驱动整页 `setState`；handler `useCallback` | `page.tsx:72-81`、156+ | 帧率 | M |
| 4 | Canvas `dpr` 封顶、关默认 AA、`alpha: false` | `GalaxyScene.tsx:555-557` | 首屏、帧率 | S |
| 5 | `next/font` 替换 Google Fonts 外链 | `layout.tsx:45-50` | 首屏 | S |
| 6 | 动态 import 地表 / 结局 / 索引 / 船舱 | `page.tsx:7-16` | 首屏 | S–M |
| 7 | 星球几何降段；低端减粒子 | `GalaxyScene.tsx:17,353,408` | 首屏、帧率 | S |
| 8 | Line 改为声明式，key 用行星对 id | `GalaxyScene.tsx:87-195` | 内存 | M |
| 9 | Html 标签改 sprite / 外置 DOM | `GalaxyScene.tsx:433-460` | 帧率 | M |
| 10 | `prefers-reduced-motion` / 无 WebGL 时关 CRT、2D 星图 | `globals.css`、新分支 | 帧率、a11y | L |
| 11 | 开场后再 mount Canvas | `page.tsx:20-28,198-212` | 首屏 GPU | S–M |

**不要做**：为「CameraRig 每帧 Vector3」再改相机（已 memo）；为体积删除 three；未接线就引入 AI SDK 到客户端；去掉 Line 的 dispose 却不改声明式。

---

## 8. 建议怎么验（改代码的 PR 用）

本文未改代码，也就没有新的运行时对比。以后落地优化时：

1. Chrome Performance：星系视图 5s + 切到地表 5s，看 FPS、GPU、`Recalculate Style`（blur）。
2. Network：disable cache 进 `/` 与 `/landing`，看是否仍拆出 three chunk、落地页是否为零 three。
3. Application → Local Storage：打一局 Helix 命题，看 `ember_protocol_save_auto` 写入次数是否从 ~60/分钟降到节流值。
4. 低端：Win 核显或 `dpr=2` 模拟，确认切船舱后 GPU 占用下降。
