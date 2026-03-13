# 灵光卡「迷雾揭示」动效规范

> 设计总监 @像素眼 · 2026-03-12
> 适用于：Web Demo 灵光卡揭晓（CardStage 组件）

---

## 1. 设计意图

**核心隐喻：** 灵光从迷雾中凝聚显现——等待不是空白，而是仪式的一部分。

**理论依据：**
- **Doherty Threshold（多尔蒂阈值）**：响应 >400ms 时用户感知到等待，需要用有意义的动画填充，把「被动等」变成「主动看」
- **感知性能拆解**：一段长等待 → 拆成多个有节奏的短阶段（诗句淡入 → 迷雾弥漫 → 提示文案 → 迷雾散开），每个阶段都有明确的视觉变化，主观等待时间显著缩短
- **Anticipation → Reveal 叙事弧**：迷雾 = 期待的具象化，散开 = 奖励的揭示。和 Spark7 五幕制叙事一脉相承

**和现有设计语言的关系：**
迷雾用人格色的极低饱和度渐变，直接复用「氛围渐染」方案的色彩逻辑——雾气就是灵光卡氛围层的放大版。

---

## 2. 流程时序图

```
时间轴（从进入 CardStage 开始）
─────────────────────────────────────────────────────────
0s        gathering phase（保持现有粒子汇聚动画）
          "7 天记忆正在凝聚为灵光……"
─────────────────────────────────────────────────────────
~3s       contentReady=true → 进入 reveal phase
─────────────────────────────────────────────────────────
          ┌─ STEP 1: 卡片弹入（现有弹簧动画）
          │  duration: 600ms
          │
          ├─ STEP 2: 诗句逐行淡入上浮
          │  每行 delay 180ms，duration 500ms
          │  translateY: 8px → 0, opacity: 0 → 1
          │
3.6s      ├─ STEP 3: 迷雾聚拢覆盖图片区域 ← 🆕
          │  图片区域被人格色迷雾覆盖
          │  提示文案淡入："光影正在聚拢…"
          │  duration: 800ms ease-out
          │
          │  （等待 cardImage 加载完成）
          │
img.onload├─ STEP 4: 迷雾散开揭示 ← 🆕
          │  backdrop-filter: blur(20px) → blur(0)
          │  雾层 opacity: 0.92 → 0
          │  duration: 1200ms ease-out
          │  ⚠️ 必须在 img.onload 后才触发！
          │
          └─ STEP 5: 进入 full phase
             卡片光晕呼吸 + 底部按钮出现
─────────────────────────────────────────────────────────
```

---

## 3. 迷雾层设计

### 3.1 迷雾结构（三层叠加，复用氛围渐染逻辑）

```
┌─────────────────────────────┐
│  图片区域（height: clamp(160px, 36dvh, 340px)）│
│                             │
│  ┌── Layer 3: 呼吸光点 ──┐  │   opacity: 4-6%
│  │  ┌── Layer 2: 偏移雾 ┐│  │   opacity: 3-5%
│  │  │  ┌── Layer 1: 主雾┐│  │   opacity: 60-80%（聚拢状态）
│  │  │  │   文案居中    ││  │
│  │  │  └───────────────┘│  │
│  │  └──────────────────┘│  │
│  └──────────────────────┘  │
│                             │
│  backdrop-filter: blur(20px) │ ← 整层模糊
└─────────────────────────────┘
```

### 3.2 四种人格的迷雾差异

| 人格 | 雾色 HSL 基底 | 聚拢方向 | 散开方式 | 浓度 |
|------|--------------|---------|---------|------|
| 🌙 月光 | `hsl(228, 55%, 15%)` | 从顶部缓缓降落 | 向上消散，如月光退去 | 最克制 60% |
| ☀️ 阳光 | `hsl(38, 60%, 18%)` | 从右上角涌入 | 从中心爆开，如阳光穿透 | 最浓 80% |
| 🌪️ 旋风 | `hsl(0, 50%, 16%)` | 多点同时收拢 | 撕裂式散开（多方向） | 张力感 70% |
| 🌿 森林 | `hsl(130, 40%, 14%)` | 从底部轻轻升起 | 向下沉降消散 | 柔和 65% |

### 3.3 提示文案

**推荐文案（按人格差异化）：**

| 人格 | 文案 |
|------|------|
| 🌙 月光 | "月光正在为你写一幅画…" |
| ☀️ 阳光 | "阳光正在酿一段回忆…" |
| 🌪️ 旋风 | "灵感正在四处奔跑…" |
| 🌿 森林 | "树影正在慢慢成形…" |

**fallback（通用）：** "光影正在聚拢…"

文案样式：
- 字号：`13px`
- 字体：`'Noto Serif SC', serif`
- 颜色：人格色 `opacity: 0.6`
- 动画：`opacity` 脉冲 `0.4 → 0.7 → 0.4`，周期 `2.5s`，infinite
- 位置：迷雾层正中央

---

## 4. CSS/JSX 实现参考

### 4.1 迷雾覆盖层

```tsx
// 新增状态
const [imageLoaded, setImageLoaded] = useState(false);
const [mistPhase, setMistPhase] = useState<'hidden' | 'gathering' | 'revealing' | 'gone'>('hidden');

// 进入 reveal phase 时激活迷雾
useEffect(() => {
  if (phase === 'reveal') {
    setMistPhase('gathering');
  }
}, [phase]);

// 图片加载完成后散开迷雾
useEffect(() => {
  if (imageLoaded && mistPhase === 'gathering') {
    // 给一个最小展示时间，让用户看到迷雾效果
    const minDelay = setTimeout(() => {
      setMistPhase('revealing');
      // 散开动画完成后移除
      setTimeout(() => setMistPhase('gone'), 1400);
    }, 800); // 至少让迷雾展示 800ms
    return () => clearTimeout(minDelay);
  }
}, [imageLoaded, mistPhase]);
```

### 4.2 迷雾层 JSX（放在图片区域内部）

```tsx
{/* 图片 — 加 onLoad 回调 */}
<motion.img
  src={cardImage}
  alt={`${catName}的灵光卡`}
  onLoad={() => setImageLoaded(true)}
  initial={{ opacity: 0, scale: 1.03 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 1.2 }}
  className="w-full h-full object-cover"
/>

{/* 迷雾覆盖层 */}
{mistPhase !== 'gone' && (
  <motion.div
    className="absolute inset-0 z-20 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{
      opacity: mistPhase === 'gathering' ? 1 : 0,
      backdropFilter: mistPhase === 'gathering' ? 'blur(20px)' : 'blur(0px)',
    }}
    transition={{
      opacity: { duration: mistPhase === 'gathering' ? 0.8 : 1.2, ease: 'easeOut' },
      backdropFilter: { duration: 1.2, ease: 'easeOut' },
    }}
    style={{
      // 人格色迷雾背景 —— 以月光为例，其他人格替换 HSL 值
      background: getMistGradient(personalityType),
    }}
  >
    {/* 提示文案 */}
    <motion.p
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        color: `${p.color}99`, // 人格色 60% opacity
        fontSize: '13px',
        letterSpacing: '0.15em',
        fontFamily: "'Noto Serif SC', serif",
      }}
    >
      {getMistText(personalityType)}
    </motion.p>
  </motion.div>
)}
```

### 4.3 迷雾渐变函数（四种人格）

```tsx
function getMistGradient(type: PersonalityType): string {
  const gradients: Record<PersonalityType, string> = {
    // 月光：从顶部倾泻的柔和雾
    moon: `
      radial-gradient(ellipse 120% 80% at 50% -10%,
        hsla(228, 55%, 15%, 0.85) 0%,
        hsla(228, 45%, 12%, 0.70) 40%,
        hsla(228, 35%, 10%, 0.55) 100%
      )
    `,
    // 阳光：从右上角溢出的暖雾
    sun: `
      radial-gradient(ellipse 100% 100% at 85% 10%,
        hsla(38, 60%, 18%, 0.88) 0%,
        hsla(38, 50%, 14%, 0.72) 45%,
        hsla(38, 40%, 12%, 0.58) 100%
      )
    `,
    // 旋风：多点张力
    storm: `
      radial-gradient(circle at 30% 25%, hsla(0, 50%, 16%, 0.60) 0%, transparent 50%),
      radial-gradient(circle at 75% 65%, hsla(0, 45%, 14%, 0.55) 0%, transparent 45%),
      radial-gradient(ellipse at 50% 50%, hsla(0, 40%, 12%, 0.70) 0%, hsla(0, 35%, 10%, 0.50) 100%)
    `,
    // 森林：从底部升起的薄雾
    forest: `
      radial-gradient(ellipse 130% 70% at 50% 110%,
        hsla(130, 40%, 14%, 0.82) 0%,
        hsla(130, 35%, 12%, 0.65) 45%,
        hsla(130, 30%, 10%, 0.50) 100%
      )
    `,
  };
  return gradients[type];
}

function getMistText(type: PersonalityType): string {
  const texts: Record<PersonalityType, string> = {
    moon: '月光正在为你写一幅画…',
    sun: '阳光正在酿一段回忆…',
    storm: '灵感正在四处奔跑…',
    forest: '树影正在慢慢成形…',
  };
  return texts[type];
}
```

---

## 5. 边界情况处理

### 5.1 图片已预加载（preloadedImage 存在）

如果图片在 timeline 阶段已经生成完毕（`preloadedImage` 有值），流程变为：

```
卡片弹入 → 诗句淡入 → 迷雾快速聚拢(400ms) → 短暂停顿(600ms) → 散开(800ms)
```

不跳过迷雾！即使图片已有，也走一遍迷雾仪式，只是缩短时间。**仪式感 > 效率。**

```tsx
// 如果图片已预加载，缩短迷雾展示时间
const mistMinDuration = preloadedImage ? 600 : 800;
```

### 5.2 图片生成失败（cardImage 始终为 null）

迷雾最长停留 **8 秒**。超时后：
1. 迷雾仍然散开（保持仪式完整性）
2. 露出 fallback 区域（现有的 emoji + "画面生成中…"）
3. fallback 区域文案改为：**"这次画面害羞了，但诗句已经记住了一切"**

```tsx
// 迷雾超时保护
useEffect(() => {
  if (mistPhase === 'gathering') {
    const timeout = setTimeout(() => {
      setMistPhase('revealing');
      setTimeout(() => setMistPhase('gone'), 1400);
    }, 8000);
    return () => clearTimeout(timeout);
  }
}, [mistPhase]);
```

### 5.3 性能考量

- `backdrop-filter: blur()` 在低端机上可能卡顿
- **降级策略**：如果检测到掉帧（`requestAnimationFrame` 时间差 >50ms），关闭 `backdrop-filter`，只用 `opacity` + 纯色背景过渡
- 迷雾层设 `will-change: opacity, backdrop-filter` 提前触发 GPU 合成

---

## 6. 无图片时的完整替代方案

当前代码中 `!cardImage` 的 fallback 区域（emoji 浮动 + "画面生成中…"）也需要改造：

**改为：** 迷雾覆盖整个图片占位区域，文案居中，和有图片时视觉一致。
用户不应该知道图片「还没有」，只感受到「正在酝酿中」。

```tsx
{/* 无论有没有图片，迷雾层始终存在于图片区域 */}
{/* 有图片：迷雾盖在图片上 → 散开露出图片 */}
{/* 无图片：迷雾盖在渐变占位上 → 散开露出 fallback */}
```

---

## 7. 与现有音效的配合

迷雾散开时机要和 `reveal-{personality}.mp3` 音效同步：

```
音效播放 ─────────────┐
                      │ 音效起始 0.3s 后开始散雾
迷雾散开 ──── delay 300ms ──→ 开始散开
```

音效是「揭示」的听觉信号，迷雾散开是视觉信号，两者略有错位（音先视后 300ms）会产生自然的「先听到再看到」的体验，类似电影中先听到声音再看到画面的手法。

---

## 8. 总结：改动范围

| 文件 | 改动 |
|------|------|
| `page.tsx` CardStage 组件 | 新增 `mistPhase` 状态 + 迷雾 JSX 层 + `imageLoaded` 回调 |
| `page.tsx` CardStage 组件 | 修改 `!cardImage` 的 fallback UI（统一迷雾覆盖） |
| `page.tsx` 新增函数 | `getMistGradient()` + `getMistText()` |
| 现有代码 | `motion.img` 加 `onLoad` 回调 |
| 现有代码 | 音效播放时机微调（提前 300ms） |

**不需要新文件，不需要新依赖。** 全部在现有 framer-motion + CSS 范围内完成。

---

*像素眼 🎨 — "迷雾不是遮挡，是期待的形状。"*
