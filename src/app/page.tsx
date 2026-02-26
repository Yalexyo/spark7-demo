"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  personalities,
  scenarios,
  calculatePersonality,
  PersonalityType,
  PersonalityResult,
  Personality,
  UserProfile,
  Schedule,
  EnergyLevel,
  NeedType,
  mbtiResponses,
  profileResponses,
  mixedLabels,
  secondaryMoments,
  secondaryCoda,
  mbtiMoments,
  mbtiPoemOpener,
  blendCardTheme,
} from "@/lib/data";

type Stage = "welcome" | "test" | "result" | "profile" | "chat" | "timeline" | "card" | "exit";

// ==================== 主页面 ====================

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [catName, setCatName] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [personalityType, setPersonalityType] = useState<PersonalityType>("sun");
  const [secondaryType, setSecondaryType] = useState<PersonalityType | null>(null);
  const [isPure, setIsPure] = useState(true);
  const [chatReply, setChatReply] = useState("");
  const [chatHistory, setChatHistory] = useState<{from: string; text: string}[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>();
  const [catDescription, setCatDescription] = useState<string | null>(null);
  const [catDescriptionEn, setCatDescriptionEn] = useState<string | null>(null);
  const [catPhotoBase64, setCatPhotoBase64] = useState<string | null>(null);
  const [catPhotoMime, setCatPhotoMime] = useState<string | null>(null);
  const [catPhotoUrl, setCatPhotoUrl] = useState<string | null>(null);

  // 验证改造：新增状态
  const [demoStartTime] = useState(Date.now());
  const [cardSaved, setCardSaved] = useState(false);
  const [cardShared, setCardShared] = useState(false);

  const personality = personalities[personalityType];

  const handleOptionSelect = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (newAnswers.length >= scenarios.length) {
      const result = calculatePersonality(newAnswers);
      setPersonalityType(result.primary);
      setSecondaryType(result.secondary);
      setIsPure(result.isPure);
      setTimeout(() => setStage("result"), 400);
    }
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden flex flex-col items-center justify-center safe-all">
      {/* 背景星光 */}
      <Stars />

      <AnimatePresence mode="wait">
        {stage === "welcome" && (
          <WelcomeStage
            key="welcome"
            onStart={(name, photoBase64, photoMime) => {
              setCatName(name || "小咪");
              setStage("test");
              // 异步 Vision 分析（在测试期间后台运行）
              if (photoBase64) {
                setCatPhotoUrl(`data:${photoMime || "image/jpeg"};base64,${photoBase64}`);
                setCatPhotoBase64(photoBase64);
                setCatPhotoMime(photoMime || "image/jpeg");
                fetch("/api/vision", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageBase64: photoBase64, mimeType: photoMime }),
                })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.summary) setCatDescription(data.summary);
                    if (data.summaryEn) setCatDescriptionEn(data.summaryEn);
                  })
                  .catch(() => {});
              }
            }}
          />
        )}

        {stage === "test" && (
          <TestStage
            key={`test-${answers.length}`}
            currentQuestion={answers.length}
            onSelect={handleOptionSelect}
          />
        )}

        {stage === "result" && (
          <ResultStage
            key="result"
            catName={catName}
            personality={personality}
            secondaryType={secondaryType}
            isPure={isPure}
            onNext={() => setStage("profile")}
          />
        )}

        {stage === "profile" && (
          <ProfileStage
            key="profile"
            catName={catName}
            personality={personality}
            onComplete={(profile) => {
              setUserProfile(profile);
              setStage("chat");
            }}
          />
        )}

        {stage === "chat" && (
          <ChatStage
            key="chat"
            catName={catName}
            personality={personality}
            userProfile={userProfile}
            catDescription={catDescription}
            onReply={setChatReply}
            onChatHistory={setChatHistory}
            onNext={() => setStage("timeline")}
          />
        )}

        {stage === "timeline" && (
          <TimelineStage
            key="timeline"
            catName={catName}
            personality={personality}
            secondaryType={secondaryType}
            userProfile={userProfile}
            chatHistory={chatHistory}
            onNext={() => setStage("card")}
          />
        )}

        {stage === "card" && (
          <CardStage
            key="card"
            catName={catName}
            personality={personality}
            personalityType={personalityType}
            secondaryType={secondaryType}
            userProfile={userProfile}
            chatReply={chatReply}
            chatHistory={chatHistory}
            catDescription={catDescription}
            catDescriptionEn={catDescriptionEn}
            catPhotoBase64={catPhotoBase64}
            catPhotoMime={catPhotoMime}
            onCardSaved={() => setCardSaved(true)}
            onCardShared={() => setCardShared(true)}
            onNext={() => setStage("exit")}
          />
        )}

        {stage === "exit" && (
          <ExitStage
            key="exit"
            catName={catName}
            personality={personality}
            personalityType={personalityType}
            secondaryType={secondaryType}
            userProfile={userProfile}
            durationMs={Date.now() - demoStartTime}
            cardSaved={cardSaved}
            cardShared={cardShared}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ==================== 背景星光 ====================

// 预生成固定的星星数据，避免 SSR/Client hydration mismatch
const STARS_DATA = Array.from({ length: 45 }).map((_, i) => {
  const seed = (i + 1) * 7919;
  const r = (n: number) => ((seed * (n + 1) * 1049) % 10000) / 10000;
  const isBright = i < 6; // 前6颗是亮星
  return {
    width: isBright ? 2.5 + r(0) * 2 : 1 + r(0) * 2,
    height: isBright ? 2.5 + r(1) * 2 : 1 + r(1) * 2,
    top: r(2) * 100,
    left: r(3) * 100,
    opacity: isBright ? 0.5 + r(4) * 0.4 : 0.15 + r(4) * 0.3,
    duration: isBright ? 2 + r(5) * 3 : 3 + r(5) * 4,
    delay: r(6) * 3,
    isBright,
  };
});

const CARD_STARS = Array.from({ length: 8 }).map((_, i) => {
  const seed = (i + 1) * 3571;
  const r = (n: number) => ((seed * (n + 1) * 1049) % 10000) / 10000;
  return {
    top: 20 + r(0) * 60,
    left: 10 + r(1) * 80,
    opacity: 0.2 + r(2) * 0.4,
    duration: 2 + r(3) * 3,
    delay: r(4) * 2,
  };
});

function Stars() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* 径向渐变背景光晕 - 中心微亮 */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.06) 0%, rgba(15,14,23,0) 60%)",
        }}
      />
      {/* 装饰性柔光 */}
      <div
        className="absolute rounded-full"
        style={{
          width: "300px",
          height: "300px",
          top: "10%",
          right: "-80px",
          background: "radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "250px",
          height: "250px",
          bottom: "15%",
          left: "-60px",
          background: "radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* 星星 */}
      {STARS_DATA.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${star.width}px`,
            height: `${star.height}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            opacity: star.opacity,
            backgroundColor: star.isBright
              ? (i % 3 === 0 ? "#c084fc" : i % 3 === 1 ? "#f472b6" : "#ffffff")
              : "#ffffff",
            boxShadow: star.isBright
              ? `0 0 ${4 + star.width}px rgba(255,255,255,0.4)`
              : "none",
            animation: `${star.isBright ? "twinkle-bright" : "twinkle"} ${star.duration}s infinite ${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ==================== 欢迎页 ====================

function WelcomeStage({ onStart }: { onStart: (name: string, photo?: string, photoMime?: string) => void }) {
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      // 提取 base64 部分（去掉 data:image/xxx;base64, 前缀）
      setPhotoBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6 }}
      className="z-10 w-full max-w-md px-6 text-center"
    >
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="font-bold mb-2"
        style={{
          fontSize: "var(--text-5xl)",
          background: "linear-gradient(90deg, #c084fc 0%, #ec4899 30%, #a855f7 50%, #f472b6 70%, #c084fc 100%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 4s linear infinite",
        }}
      >
        Spark7
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-3 text-sm tracking-[0.3em]"
        style={{ color: "#c4b5fd" }}
      >
        灵光七日卡
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/50 mb-10 text-lg"
      >
        你真的了解它吗？
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="spark-card relative overflow-hidden"
        style={{
          padding: "var(--space-2xl)",
          background: "linear-gradient(145deg, rgba(35,33,54,0.9) 0%, rgba(26,24,38,0.95) 100%)",
        }}
      >
        {/* 卡片内部光晕 */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* 呼吸光晕的 emoji */}
        <div
          className="relative text-5xl mb-3"
          style={{ animation: "breathe-glow 3s ease-in-out infinite" }}
        >
          🐱
        </div>

        <h2 className="text-xl font-medium mb-2 relative z-10">你的猫叫什么名字？</h2>
        <p className="text-[#a7a0c4] text-sm mb-8 relative z-10">让我认识一下它的灵魂</p>

        {/* 输入框带聚焦光效 */}
        <div className="relative mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onStart(name)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="例如：爆米橘"
            className="relative z-10 w-full bg-[#1a1826] text-center text-xl py-4 rounded-xl focus:outline-none transition-all placeholder:text-white/20 border border-white/[0.08]"
            style={{
              boxShadow: focused
                ? "0 0 0 2px rgba(168,85,247,0.4), 0 0 20px rgba(168,85,247,0.1)"
                : "none",
            }}
            autoFocus
          />
          {focused && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ animation: "focus-pulse 2s ease-in-out infinite" }}
            />
          )}
        </div>

        {/* 猫咪照片上传（必选） */}
        <div className="relative z-10 mb-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          {photoPreview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="w-24 h-24 rounded-2xl bg-cover bg-center border-2"
                style={{
                  backgroundImage: `url(${photoPreview})`,
                  borderColor: "rgba(168,85,247,0.5)",
                  boxShadow: "0 0 20px rgba(168,85,247,0.25), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-300">✓ 照片已就绪</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
                >
                  换一张
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-5 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] group"
              style={{
                borderColor: "rgba(168,85,247,0.25)",
                background: "rgba(168,85,247,0.04)",
              }}
            >
              <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">📷</div>
              <p className="text-white/60 text-sm font-medium">上传一张猫咪照片</p>
              <p className="text-white/25 text-xs mt-1">拍一张或从相册选择</p>
            </button>
          )}
        </div>

        <button
          onClick={() => onStart(name, photoBase64 || undefined, photoMime)}
          disabled={!photoBase64}
          className="spark-btn relative z-10 w-full text-white py-4 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          style={{
            background: "var(--brand-gradient)",
            boxShadow: photoBase64 ? "0 4px 24px var(--brand-glow), 0 1px 3px rgba(0,0,0,0.2)" : "none",
            borderRadius: "var(--radius-md)",
          }}
        >
          {photoBase64 ? "开始连接 ✨" : "先上传猫咪照片 📷"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ==================== 性格测试 ====================

function TestStage({
  currentQuestion,
  onSelect,
}: {
  currentQuestion: number;
  onSelect: (idx: number) => void;
}) {
  const scenario = scenarios[currentQuestion];
  if (!scenario) return null;

  // 每道题对应的氛围色
  const questionColors = ["#a855f7", "#ec4899", "#c084fc", "#f472b6", "#a855f7"];
  const qColor = questionColors[currentQuestion % questionColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35 }}
      className="z-10 w-full max-w-md px-6"
    >
      {/* 进度条 - 带颜色渐变 */}
      <div className="mb-8">
        <div className="flex justify-center space-x-2 mb-2">
          {scenarios.map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: idx === currentQuestion ? "32px" : "12px",
                backgroundColor:
                  idx === currentQuestion
                    ? qColor
                    : idx < currentQuestion
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.08)",
                boxShadow: idx === currentQuestion ? `0 0 8px ${qColor}40` : "none",
              }}
            />
          ))}
        </div>
        <p className="text-center text-white/30 text-xs">
          {currentQuestion + 1} / {scenarios.length}
        </p>
      </div>

      {/* 场景 */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="text-5xl mb-3"
          style={{ animation: "gentle-float 3s ease-in-out infinite" }}
        >
          {scenario.emoji}
        </motion.div>
        <h2 className="text-2xl font-bold leading-relaxed">{scenario.scene}</h2>
      </div>

      {/* 选项 - 统一风格 */}
      <div className="space-y-4">
        {scenario.options.map((opt, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(idx)}
            className="spark-option w-full text-left leading-relaxed"
            style={{ fontSize: "var(--text-base)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
              e.currentTarget.style.boxShadow = "inset 0 0 30px rgba(168,85,247,0.03), 0 0 15px rgba(168,85,247,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {opt.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ==================== 人格结果 ====================

function ResultStage({
  catName,
  personality: p,
  secondaryType,
  isPure,
  onNext,
}: {
  catName: string;
  personality: Personality;
  secondaryType: PersonalityType | null;
  isPure: boolean;
  onNext: () => void;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const [showMixed, setShowMixed] = useState(false);

  const mixed = secondaryType ? mixedLabels[`${p.type}-${secondaryType}`] : null;
  const secondaryP = secondaryType ? personalities[secondaryType] : null;

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showIntro && mixed) {
      const t = setTimeout(() => setShowMixed(true), 800);
      return () => clearTimeout(t);
    }
  }, [showIntro, mixed]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="z-10 w-full max-w-md px-6 h-dvh overflow-y-auto hide-scrollbar py-12"
    >
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="text-sm text-[#a7a0c4] mb-2 tracking-widest"
        >
          灵魂连接成功
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold mb-8"
        >
          {catName}是——
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="relative backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl overflow-hidden mb-8"
        style={{
          background: "rgba(35,33,54,0.85)",
          border: `1px solid rgba(${p.colorRgb}, 0.15)`,
          boxShadow: `0 0 80px rgba(${p.colorRgb}, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${p.bgGradient}`} />
        {/* 额外的人格配色光晕 */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(${p.colorRgb}, 0.15) 0%, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            className="text-7xl mb-3"
          >
            {p.emoji}
          </motion.div>
          <h2 className="text-3xl font-bold mb-1" style={{ color: p.color }}>
            {p.name}
          </h2>
          <p className="text-white/50 text-sm mb-6">{p.label}</p>

          {/* 混合型标签 */}
          <AnimatePresence>
            {showMixed && mixed && secondaryP && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6 px-4 py-3 rounded-2xl bg-white/5 border border-white/10"
              >
                <p className="text-sm font-medium mb-1" style={{ color: p.color }}>
                  {mixed.display}
                </p>
                <p className="text-xs text-white/50">
                  「{mixed.desc}」
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showIntro && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.6 }}
                className="bg-black/20 p-7 rounded-2xl text-left text-[15px] leading-[2] text-white/85 whitespace-pre-line"
              >
                {p.selfIntro(catName)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {showIntro && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onNext}
          className="spark-btn w-full py-4 text-white"
          style={{
            backgroundColor: p.color,
            fontSize: "var(--text-lg)",
            boxShadow: `0 4px 20px rgba(${p.colorRgb}, 0.3)`,
          }}
        >
          听听{catName}想对你说什么 💬
        </motion.button>
      )}
    </motion.div>
  );
}

// ==================== 用户画像采集 ====================

const PROFILE_QUESTIONS = [
  {
    key: "schedule" as const,
    ask: "你一般什么时候出门、什么时候回来？我好安排等你的时间表 📋",
    options: [
      { emoji: "🌅", text: "早出早归型（朝九晚六那种）", value: "early" as Schedule },
      { emoji: "🌙", text: "早出晚归型（经常加班/应酬）", value: "late" as Schedule },
      { emoji: "🏠", text: "经常在家（远程/自由职业/学生）", value: "home" as Schedule },
      { emoji: "🔀", text: "不固定，每天都不一样", value: "irregular" as Schedule },
    ],
  },
  {
    key: "energyLevel" as const,
    ask: "最近的你，感觉像——",
    options: [
      { emoji: "🔋", text: "电量充足！每天都有干劲", value: "full" as EnergyLevel },
      { emoji: "🪫", text: "有点疲惫，但还撑得住", value: "tired" as EnergyLevel },
      { emoji: "😶‍🌫️", text: "说不上来，就是有点丧", value: "meh" as EnergyLevel },
      { emoji: "🔥", text: "压力很大，快爆炸了", value: "stressed" as EnergyLevel },
    ],
  },
  {
    key: "needType" as const,
    ask: "如果我能帮你一件事，你最希望是——",
    options: [
      { emoji: "🫂", text: "有人懂我就好，不用解决问题", value: "understand" as NeedType },
      { emoji: "⏰", text: "提醒我照顾自己（喝水/休息/吃饭）", value: "remind" as NeedType },
      { emoji: "😄", text: "逗我开心，让我别想太多", value: "cheer" as NeedType },
      { emoji: "🤫", text: "安静陪着就好，不用说话", value: "quiet" as NeedType },
    ],
  },
];

function ProfileStage({
  catName,
  personality: p,
  onComplete,
}: {
  catName: string;
  personality: Personality;
  onComplete: (profile: UserProfile) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "mbti" | "questions" | "outro">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [catResponse, setCatResponse] = useState("");
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [mbtiLetters, setMbtiLetters] = useState<(string | null)[]>([null, null, null, null]);

  const handleMbtiDone = (mbti?: string) => {
    if (mbti) {
      setProfile((prev) => ({ ...prev, mbti }));
      const resp = mbtiResponses[mbti];
      if (resp) {
        setCatResponse(resp);
        setTimeout(() => {
          setCatResponse("");
          setPhase("questions");
        }, 2000);
        return;
      }
    }
    setPhase("questions");
  };

  const handleAnswer = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));

    // 获取即时回应
    const responses = profileResponses[p.type];
    let resp = "";
    if (key === "schedule") resp = responses.schedule[value as Schedule];
    if (key === "energyLevel") resp = responses.energy[value as EnergyLevel];
    if (key === "needType") resp = responses.need[value as NeedType];

    setCatResponse(resp);
    setTimeout(() => {
      setCatResponse("");
      if (qIndex < PROFILE_QUESTIONS.length - 1) {
        setQIndex((i) => i + 1);
      } else {
        setPhase("outro");
        setTimeout(() => {
          onComplete({
            mbti: profile.mbti,
            schedule: (profile.schedule || value) as Schedule,
            energyLevel: (profile.energyLevel || value) as EnergyLevel,
            needType: (profile.needType || value) as NeedType,
            ...profile,
            [key]: value,
          } as UserProfile);
        }, 2500);
      }
    }, 1800);
  };

  const toggleMbtiLetter = (idx: number, letter: string) => {
    setMbtiLetters((prev) => {
      const next = [...prev];
      next[idx] = next[idx] === letter ? null : letter;
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="z-10 w-full max-w-md px-6 h-dvh flex flex-col items-center justify-center"
    >
      {/* 介绍 */}
      {phase === "intro" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-3">{p.emoji}</div>
          <div className="bg-[#232136]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 mb-8">
            <p className="text-white/90 text-lg leading-relaxed">
              我知道我是什么样的猫了。
            </p>
            <p className="text-white/90 text-lg leading-relaxed mt-2">
              但你呢？让我也了解一下你吧。
            </p>
          </div>
          <button
            onClick={() => setPhase("mbti")}
            className="px-8 py-4 rounded-xl font-bold text-white text-lg active:scale-[0.97] transition-transform"
            style={{ backgroundColor: p.color }}
          >
            好啊 🐾
          </button>
        </motion.div>
      )}

      {/* MBTI · 场景化选择 */}
      {phase === "mbti" && !catResponse && (
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full"
        >
          <div className="text-center mb-3">
            <span className="text-4xl">{p.emoji}</span>
          </div>
          <div className="bg-[#232136]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 mb-6">
            <p className="text-white/80 text-[15px] leading-relaxed">
              让我猜猜你是什么样的人？
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {([
              { label: "社交", a: { letter: "E", text: "派对动物 🎉" }, b: { letter: "I", text: "独处充电 🔋" } },
              { label: "感知", a: { letter: "S", text: "看得见摸得着 👀" }, b: { letter: "N", text: "脑中有宇宙 🌌" } },
              { label: "决策", a: { letter: "T", text: "逻辑至上 🧠" }, b: { letter: "F", text: "感觉先行 ❤️" } },
              { label: "生活", a: { letter: "J", text: "计划控 📋" }, b: { letter: "P", text: "随缘大师 🎲" } },
            ] as const).map((dim, idx) => (
              <div key={idx}>
                <div className="text-[10px] text-white/30 tracking-wider mb-1.5 pl-1">{dim.label}</div>
                <div className="flex gap-3">
                  {[dim.a, dim.b].map((opt) => (
                    <button
                      key={opt.letter}
                      onClick={() => toggleMbtiLetter(idx, opt.letter)}
                      className={`flex-1 py-3 px-3 rounded-xl text-sm transition-all ${
                        mbtiLetters[idx] === opt.letter
                          ? "text-white scale-[1.02] font-medium"
                          : "bg-[#232136]/80 text-white/50 border border-white/5"
                      }`}
                      style={mbtiLetters[idx] === opt.letter ? { backgroundColor: p.color, boxShadow: `0 2px 12px ${p.color}40` } : {}}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleMbtiDone()}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm"
            >
              跳过 →
            </button>
            {mbtiLetters.every((l) => l !== null) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleMbtiDone(mbtiLetters.join(""))}
                className="flex-1 py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                就是我 → {mbtiLetters.join("")}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* 问题 */}
      {phase === "questions" && !catResponse && (
        <motion.div
          key={`q-${qIndex}`}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          className="w-full"
        >
          {/* 进度 */}
          <div className="mb-6 flex justify-center space-x-2">
            {PROFILE_QUESTIONS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === qIndex ? "w-8 bg-white" : idx < qIndex ? "w-3 bg-white/40" : "w-3 bg-white/10"
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-3">
            <span className="text-4xl">{p.emoji}</span>
          </div>
          <div className="bg-[#232136]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 mb-6">
            <p className="text-white/80 text-[15px] leading-relaxed">
              {PROFILE_QUESTIONS[qIndex].ask}
            </p>
          </div>

          <div className="space-y-4">
            {PROFILE_QUESTIONS[qIndex].options.map((opt, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(PROFILE_QUESTIONS[qIndex].key, opt.value)}
                className="spark-option w-full text-left leading-relaxed"
                style={{ fontSize: "var(--text-base)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${p.color}30`;
                  e.currentTarget.style.boxShadow = `inset 0 0 20px rgba(255,255,255,0.02), 0 0 10px ${p.color}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span className="mr-2">{opt.emoji}</span>{opt.text}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 小咪即时回应 */}
      {catResponse && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-3">{p.emoji}</div>
          <div className="bg-[#232136]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
            <p className="text-white/90 text-lg leading-relaxed" style={{ color: p.color }}>
              {catResponse}
            </p>
          </div>
        </motion.div>
      )}

      {/* 结束过渡 */}
      {phase === "outro" && !catResponse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-3">{p.emoji}</div>
          <p className="text-white/90 text-xl leading-relaxed">
            好，我记住了。
          </p>
          <p className="text-white/90 text-xl leading-relaxed mt-2">
            从现在开始，我是你的<span style={{ color: p.color }}>{catName}</span>。
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== 自由输入组件 ====================

function FreeInput({ onSend, accentColor }: { onSend: (text: string) => void; accentColor: string }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="或者，说点别的……"
        className="flex-1 bg-[#1a1826] text-sm py-3 px-4 rounded-full focus:outline-none focus:ring-1 border border-white/5 placeholder:text-white/20"
        style={{ focusRingColor: accentColor } as React.CSSProperties}
      />
      <button
        onClick={handleSend}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
        style={{ backgroundColor: text.trim() ? accentColor : "rgba(255,255,255,0.05)" }}
      >
        ↑
      </button>
    </div>
  );
}

// ==================== 聊天对话 ====================

interface ChatMessage {
  from: "cat" | "user";
  text: string;
}

function ChatStage({
  catName,
  personality: p,
  userProfile,
  catDescription,
  onReply,
  onChatHistory,
  onNext,
}: {
  catName: string;
  personality: Personality;
  userProfile?: UserProfile;
  catDescription?: string | null;
  onReply: (reply: string) => void;
  onChatHistory: (history: {from: string; text: string}[]) => void;
  onNext: () => void;
}) {
  const TOTAL_ROUNDS = 3;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"cat-typing" | "user-reply" | "cat-responding" | "goodnight" | "done">("cat-typing");
  const [allReplies, setAllReplies] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, phase, scrollToBottom]);

  // 通用 AI 调用（支持不同消息类型）
  const fetchChat = async (
    type: "greeting" | "reply" | "followup" | "goodnight",
    userMessage?: string,
    extraHistory?: ChatMessage[],
  ): Promise<string | null> => {
    try {
      const hist = (extraHistory || messages).map((m) => ({ role: m.from, text: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catName,
          personalityType: p.type,
          type,
          userMessage: userMessage || "",
          userProfile,
          catDescription,
          conversationHistory: hist,
        }),
      });
      const data = await res.json();
      return data.reply || null;
    } catch { return null; }
  };

  // 第一条消息 → AI 开场白
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const aiGreeting = await fetchChat("greeting");
      if (cancelled) return;
      const text = aiGreeting || p.firstMessage(catName, userProfile);
      setMessages([{ from: "cat", text }]);
      setRound(1);
      setPhase("user-reply");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuickReplies = round === 1 ? p.quickReplies : round === 2 ? p.quickRepliesR2 : p.quickRepliesR3;

  // 发送猫的回应 + AI 追问 + AI 晚安
  const addCatResponseAndContinue = async (responseText: string, afterMessages: ChatMessage[]) => {
    setMessages(afterMessages);

    if (round < TOTAL_ROUNDS) {
      // AI 追问（基于当前对话生成下一个话题）
      setTimeout(async () => {
        const followUp = await fetchChat("followup", undefined, afterMessages);
        const fallback = round === 1 ? p.followUp1(catName) : p.followUp2(catName);
        const text = followUp || fallback;
        setMessages((prev) => [...prev, { from: "cat", text }]);
        setRound((r) => r + 1);
        setPhase("user-reply");
      }, 1200);
    } else {
      // 最后一轮 → AI 晚安
      setTimeout(() => {
        setPhase("goodnight");
        setTimeout(async () => {
          const aiGoodnight = await fetchChat("goodnight", undefined, afterMessages);
          const text = aiGoodnight || p.goodnight(catName);
          setMessages((prev) => {
            const final: ChatMessage[] = [...prev, { from: "cat" as const, text }];
            onChatHistory(final.map(m => ({ from: m.from, text: m.text })));
            return final;
          });
          setPhase("done");
        }, 1500);
      }, 2000);
    }
  };

  // 统一回复处理（快捷回复 & 自由输入 全部走 AI）
  const handleReply = async (reply: string) => {
    const newReplies = [...allReplies, reply];
    setAllReplies(newReplies);
    onReply(newReplies.join("\n"));
    const updatedMessages: ChatMessage[] = [...messages, { from: "user" as const, text: reply }];
    setMessages(updatedMessages);
    setPhase("cat-responding");

    const aiReply = await fetchChat("reply", reply, updatedMessages);
    const text = aiReply || p.secondMessage(catName, reply);
    const withResponse: ChatMessage[] = [...updatedMessages, { from: "cat" as const, text }];
    await addCatResponseAndContinue(text, withResponse);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="z-10 w-full h-dvh flex flex-col max-w-lg mx-auto"
    >
      {/* 顶栏 - 含安全区域 */}
      <div className="flex items-center justify-center px-6 border-b safe-top" style={{ borderColor: "var(--border-subtle)", paddingTop: "calc(var(--safe-top) + var(--space-lg))", paddingBottom: "var(--space-lg)" }}>
        <span className="text-2xl mr-2">{p.emoji}</span>
        <span className="font-bold text-lg">{catName}</span>
        <span
          className="ml-2 text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `rgba(${p.colorRgb}, 0.2)`, color: p.color }}
        >
          {p.name}
        </span>
      </div>

      {/* 消息区域 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-4 whitespace-pre-line ${
                msg.from === "user"
                  ? "spark-bubble-user text-white"
                  : "spark-bubble-cat text-white/90"
              }`}
              style={{
                fontSize: "var(--text-base)",
                lineHeight: 1.7,
                ...(msg.from === "user"
                  ? {
                      background: `linear-gradient(135deg, rgba(${p.colorRgb}, 0.3) 0%, rgba(${p.colorRgb}, 0.15) 100%)`,
                      border: `1px solid rgba(${p.colorRgb}, 0.2)`,
                    }
                  : {}),
              }}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* 打字中动画 */}
        {(phase === "cat-typing" || phase === "cat-responding" || phase === "goodnight") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-[#232136] p-4 rounded-2xl rounded-bl-md border border-white/5 flex items-center space-x-1.5">
              <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* 快捷回复 / 自由输入 / 继续按钮 - 含安全区域 */}
      <div className="px-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)", paddingBottom: "calc(var(--safe-bottom) + var(--space-xl))" }}>
        {phase === "user-reply" && (
          <motion.div
            key={`reply-${round}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* 快捷回复（按轮次切换） */}
            <div className="flex flex-wrap gap-2 mb-3">
              {currentQuickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReply(reply)}
                  className="px-4 py-2.5 bg-[#232136]/80 rounded-full border border-white/5 active:bg-white/10 transition-colors text-sm text-white/80"
                >
                  {reply}
                </button>
              ))}
            </div>
            {/* 自由输入 → AI 回复 */}
            <FreeInput onSend={handleReply} accentColor={p.color} />
          </motion.div>
        )}

        {phase === "done" && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            onClick={onNext}
            className="spark-btn w-full py-4 text-white"
            style={{ background: "var(--brand-gradient)", boxShadow: "0 4px 24px var(--brand-glow)" }}
          >
            7天后…… ✨
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ==================== 时光快进 ====================

function TimelineStage({
  catName,
  personality: p,
  secondaryType,
  userProfile,
  chatHistory,
  onNext,
}: {
  catName: string;
  personality: Personality;
  secondaryType: PersonalityType | null;
  userProfile?: UserProfile;
  chatHistory?: {from: string; text: string}[];
  onNext: () => void;
}) {
  // 模板 fallback
  const mbti = userProfile?.mbti;
  const baseEntries = p.timeline(catName, userProfile);
  const fallbackEntries = baseEntries.map((e) => {
    if (e.day === 4 && secondaryType) return secondaryMoments[secondaryType](catName);
    if (e.day === 5 && mbti && mbtiMoments[p.type][mbti]) return mbtiMoments[p.type][mbti](catName);
    return e;
  });

  const [entries, setEntries] = useState(fallbackEntries);
  const [contentReady, setContentReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // AI 生成 → 就绪后再开始动画。超时 6 秒 fallback 模板。
  useEffect(() => {
    let settled = false;
    const settle = (data?: typeof fallbackEntries) => {
      if (settled) return;
      settled = true;
      if (data) setEntries(data);
      setContentReady(true);
    };

    // 超时兜底
    const timeout = setTimeout(() => settle(), 6000);

    if (!chatHistory || chatHistory.length === 0) {
      settle();
      return () => clearTimeout(timeout);
    }

    fetch("/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catName,
        personalityType: p.type,
        secondaryType,
        userProfile,
        chatHistory,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.entries) && data.entries.length >= 7) {
          const aiEntries = data.entries.slice(0, 7).map((item: { day: number; text: string; emoji: string }, i: number) => ({
            day: item.day || i + 1,
            text: item.text || fallbackEntries[i]?.text || "",
            emoji: item.emoji || fallbackEntries[i]?.emoji || "✨",
          }));
          settle(aiEntries);
        } else {
          settle();
        }
      })
      .catch(() => settle());

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 内容就绪后才开始逐条动画
  useEffect(() => {
    if (!contentReady) return;
    if (visibleCount < entries.length) {
      const t = setTimeout(() => setVisibleCount((v) => v + 1), 900);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowButton(true), 800);
      return () => clearTimeout(t);
    }
  }, [contentReady, visibleCount, entries.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="z-10 w-full max-w-md px-6 h-dvh flex flex-col"
    >
      <div className="text-center py-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#a7a0c4] text-sm tracking-widest mb-2"
        >
          时光流转
        </motion.p>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold"
        >
          你和{catName}的 7 天
        </motion.h1>
      </div>


      {/* Loading 状态 */}
      {!contentReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-3xl"
          >
            {p.emoji}
          </motion.div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            正在回忆这 7 天……
          </p>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-4" style={{ display: contentReady ? "block" : "none" }}>
        <div className="relative pl-8">
          {/* 时间线竖线 - 发光效果 */}
          <div
            className="absolute left-3 top-0 w-0.5 transition-all duration-700"
            style={{
              height: `${(visibleCount / entries.length) * 100}%`,
              backgroundColor: p.color,
              opacity: 0.5,
              boxShadow: `0 0 8px rgba(${p.colorRgb}, 0.4), 0 0 16px rgba(${p.colorRgb}, 0.2)`,
            }}
          />

          {entries.map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={
                idx < visibleCount
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -20 }
              }
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              {/* 圆点 */}
              <div
                className="absolute -left-5 top-1 w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: p.color,
                  backgroundColor: idx < visibleCount ? p.color : "transparent",
                }}
              />

              <div
                className="backdrop-blur rounded-2xl p-4"
                style={{
                  background: "rgba(35,33,54,0.7)",
                  border: `1px solid rgba(${p.colorRgb}, 0.08)`,
                  boxShadow: `0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{entry.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: p.color }}>
                    Day {entry.day}
                  </span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{entry.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {showButton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8"
          style={{ paddingBottom: "calc(var(--safe-bottom) + var(--space-2xl))" }}
        >
          <button
            onClick={onNext}
            className="spark-btn w-full py-4 text-white"
            style={{
              background: "var(--brand-gradient)",
              fontSize: "var(--text-lg)",
              boxShadow: "0 4px 24px var(--brand-glow)",
            }}
          >
            查看灵光卡 🌟
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== 灵光卡揭晓 ====================

function CardStage({
  catName,
  personality: p,
  personalityType,
  secondaryType,
  userProfile,
  chatReply,
  chatHistory,
  catDescription,
  catDescriptionEn,
  catPhotoBase64,
  catPhotoMime,
  onCardSaved,
  onCardShared,
  onNext,
}: {
  catName: string;
  personality: Personality;
  personalityType: PersonalityType;
  secondaryType: PersonalityType | null;
  userProfile?: UserProfile;
  chatReply?: string;
  chatHistory?: {from: string; text: string}[];
  catDescription?: string | null;
  catDescriptionEn?: string | null;
  catPhotoBase64?: string | null;
  catPhotoMime?: string | null;
  onCardSaved?: () => void;
  onCardShared?: () => void;
  onNext: () => void;
}) {
  // B. 画风选择
  const styleOptions = [
    { key: "anime", label: "日漫", icon: "🎌" },
    { key: "watercolor", label: "水彩", icon: "🎨" },
    { key: "ink", label: "水墨", icon: "🖌️" },
    { key: "storybook", label: "绘本", icon: "📖" },
  ];
  const defaultStyles: Record<string, string> = { storm: "anime", moon: "ink", sun: "storybook", forest: "watercolor" };
  const [selectedStyle, setSelectedStyle] = useState(defaultStyles[personalityType] || "watercolor");
  const [phase, setPhase] = useState<"style-select" | "gathering" | "reveal" | "full">("style-select");
  const [saved, setSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // P1: 灵光卡揭晓音效
  const revealSounds: Record<string, string> = {
    storm: "/sounds/reveal-storm.mp3",
    moon: "/sounds/reveal-moon.mp3",
    sun: "/sounds/reveal-sun.mp3",
    forest: "/sounds/reveal-forest.mp3",
  };

  // 主题配色（主人格 + 副人格融合）
  const theme = blendCardTheme(personalityType, secondaryType);

  // AI 诗句 fallback
  const mbti = userProfile?.mbti;
  const fallbackBase = p.poem(catName, userProfile);
  const fallbackWithMbti = mbti && mbtiPoemOpener[mbti] ? mbtiPoemOpener[mbti] + fallbackBase : fallbackBase;
  const fallbackPoem = secondaryType ? fallbackWithMbti + secondaryCoda[secondaryType] : fallbackWithMbti;

  const [poem, setPoem] = useState(fallbackPoem);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [contentReady, setContentReady] = useState(false);

  // 用户确认风格后开始生成
  const startGeneration = (style: string) => {
    setSelectedStyle(style);
    setPhase("gathering");

    let poemDone = false;
    let imageDone = false;
    // poem 完成就展示卡片（图片异步补位，不阻塞 reveal）
    const checkDone = () => { if (poemDone) setContentReady(true); };

    // 构造完整对话摘要（用户+猫双方，给 poem 和 image 共用）
    const conversationForApi = chatHistory && chatHistory.length > 0
      ? chatHistory.map(m => `${m.from === "cat" ? catName : "主人"}: ${m.text}`).join("\n")
      : chatReply || "";

    // 诗句（传完整对话）
    fetch("/api/poem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catName, personalityType, secondaryType, userProfile,
        userReply: chatReply, catDescription,
        conversation: conversationForApi,
        chapter: 1,
      }),
    }).then(r => r.json()).then(d => { if (d.poem) setPoem(d.poem); }).catch(() => {}).finally(() => { poemDone = true; checkDone(); });

    // 图片（传完整对话 + 画风 + 英文描述 + 原始猫照）
    fetch("/api/card-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catName, personalityType,
        catDescription: catDescriptionEn || catDescription,
        catPhotoBase64, catPhotoMime,
        artStyle: style,
        conversation: conversationForApi,
        userProfile,
        chapter: 1,
      }),
    }).then(r => r.json()).then(d => {
      console.log("card-image api response:", d.error || (d.image ? "b64_json ok" : d.imageUrl ? "url ok" : "no image"));
      if (d.image && d.mimeType) setCardImage(`data:${d.mimeType};base64,${d.image}`);
      else if (d.imageUrl) setCardImage(d.imageUrl);
    }).catch((e) => { console.error("card-image fetch error:", e); }).finally(() => { imageDone = true; checkDone(); });
  };

  useEffect(() => {
    if (phase !== "gathering") return;
    const minDelay = setTimeout(() => { if (contentReady) setPhase("reveal"); }, 3000);
    const maxDelay = setTimeout(() => setPhase("reveal"), 35000);
    return () => { clearTimeout(minDelay); clearTimeout(maxDelay); };
  }, [phase, contentReady]);

  // contentReady 变化后如果已在 gathering 且超过 3 秒则 reveal
  useEffect(() => {
    if (contentReady && phase === "gathering") {
      const t = setTimeout(() => setPhase("reveal"), 500);
      return () => clearTimeout(t);
    }
  }, [contentReady, phase]);

  useEffect(() => {
    if (phase === "reveal") {
      // P1: 播放人格揭晓音效
      const audio = new Audio(revealSounds[personalityType] || revealSounds.moon);
      audio.volume = 0.4;
      audioRef.current = audio;
      audio.play().catch(() => {});

      const t = setTimeout(() => setPhase("full"), 1000);
      return () => {
        clearTimeout(t);
        audioRef.current?.pause();
      };
    }
  }, [phase]);

  const lines = poem.split("\n");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="z-10 w-full max-w-md px-6 h-dvh flex flex-col items-center overflow-y-auto hide-scrollbar"
      style={{ paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
    >
      {/* B. 画风选择 */}
      {phase === "style-select" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full my-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl mb-4"
          >
            {p.emoji}
          </motion.div>
          <h2 className="text-xl font-bold mb-2 text-white">选择灵光卡画风</h2>
          <p className="text-sm text-white/40 mb-8">
            为 {catName} 的故事挑一种风格
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {styleOptions.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedStyle(s.key)}
                className="relative p-4 rounded-xl border transition-all active:scale-95"
                style={{
                  borderColor: selectedStyle === s.key ? p.color : "rgba(255,255,255,0.08)",
                  background: selectedStyle === s.key
                    ? `rgba(${p.colorRgb}, 0.12)`
                    : "rgba(35,33,54,0.8)",
                  boxShadow: selectedStyle === s.key
                    ? `0 0 20px rgba(${p.colorRgb}, 0.15)`
                    : "none",
                }}
              >
                <span className="text-2xl mb-1 block">{s.icon}</span>
                <span className={`text-sm font-medium ${selectedStyle === s.key ? "text-white" : "text-white/60"}`}>
                  {s.label}
                </span>
                {selectedStyle === s.key && (
                  <motion.div
                    layoutId="style-check"
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: p.color }}
                  >
                    ✓
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => startGeneration(selectedStyle)}
            className="spark-btn w-full py-4 text-white"
            style={{ background: "var(--brand-gradient)", boxShadow: "0 4px 24px var(--brand-glow)" }}
          >
            生成灵光卡 ✨
          </button>
        </motion.div>
      )}

      {phase === "gathering" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center my-auto"
        >
          {/* 粒子汇聚动画 */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
                initial={{
                  x: Math.cos((i / 12) * Math.PI * 2) * 80,
                  y: Math.sin((i / 12) * Math.PI * 2) * 80,
                  opacity: 0.3,
                  scale: 1,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: [0.3, 1, 0.8],
                  scale: [1, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center text-6xl"
            >
              {p.emoji}
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 1] }}
            transition={{ duration: 2 }}
            className="text-[#a7a0c4] text-sm tracking-widest"
          >
            7 天记忆正在凝聚为灵光……
          </motion.p>
        </motion.div>
      )}

      {(phase === "reveal" || phase === "full") && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, type: "spring", damping: 20 }}
          className="w-full py-6"
        >
          {/* ===== 灵光卡主体 · 叙述画卷 · 主副人格色调 ===== */}
          <motion.div
            ref={cardRef}
            className="sparkle-card relative rounded-[16px] overflow-hidden flex flex-col"
            style={{
              background: theme.paperBg,
              boxShadow: `0 2px 40px ${theme.accentGlow}, 0 0 0 0.5px ${theme.divider}`,
            }}
            animate={phase === "full" ? {
              boxShadow: [
                `0 2px 40px ${theme.accentGlow}, 0 0 0 0.5px ${theme.divider}`,
                `0 2px 60px ${theme.accentGlow}, 0 0 30px rgba(${p.colorRgb}, 0.15), 0 0 0 0.5px ${theme.divider}`,
                `0 2px 40px ${theme.accentGlow}, 0 0 0 0.5px ${theme.divider}`,
              ],
            } : {}}
            transition={{
              delay: 0.3 + lines.length * 0.18 + 0.5,
              duration: 1.5,
              ease: "easeInOut",
            }}
          >
            {/* 1. 插画区 · 无界浸润 · 图文一体 */}
            {cardImage ? (
              <div className="relative flex-shrink-0" style={{ height: "clamp(160px, 36dvh, 340px)" }}>
                <motion.img
                  src={cardImage}
                  alt={`${catName}的灵光卡`}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2 }}
                  className="w-full h-full object-cover"
                />
                {/* 无界渐变：图片底部溶解到人格纸色 */}
                <div
                  className="absolute bottom-0 left-0 w-full pointer-events-none"
                  style={{
                    height: "50%",
                    background: `linear-gradient(to bottom, transparent 0%, ${theme.paperBg} 92%)`,
                  }}
                />
                {/* 副人格微光：一道极淡的副色光晕浮于渐变区 */}
                {secondaryType && secondaryType !== personalityType && (
                  <div
                    className="absolute bottom-0 left-0 w-full pointer-events-none"
                    style={{
                      height: "30%",
                      background: `radial-gradient(ellipse 80% 100% at 70% 100%, rgba(${personalities[secondaryType].colorRgb}, 0.06) 0%, transparent 70%)`,
                    }}
                  />
                )}
                {/* Chapter 标题浮于图片底部 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={phase === "full" ? { opacity: 1 } : {}}
                  transition={{ delay: 0.1, duration: 1 }}
                  className="absolute bottom-4 left-6 right-6 z-10"
                >
                  <div
                    className="text-[9px] tracking-[0.3em] mb-1"
                    style={{ color: theme.metaColor, opacity: 0.6 }}
                  >
                    SPARK7
                  </div>
                  <div
                    className="text-[20px] tracking-wide"
                    style={{ color: theme.titleColor, fontFamily: "'Noto Serif SC', serif", fontWeight: 300 }}
                  >
                    Chapter 1<span className="mx-2" style={{ opacity: 0.2 }}>·</span><span style={{ fontWeight: 400 }}>初见</span>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div
                className="relative flex-shrink-0 flex flex-col items-center justify-center"
                style={{
                  height: "clamp(120px, 22dvh, 200px)",
                  background: `linear-gradient(180deg, rgba(${p.colorRgb}, 0.06) 0%, ${theme.paperBg} 100%)`,
                }}
              >
                <motion.span
                  animate={{ y: [0, -3, 0], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-5xl"
                >
                  {p.emoji}
                </motion.span>
                <motion.span
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                  className="text-xs mt-2"
                  style={{ color: `rgba(${p.colorRgb}, 0.5)` }}
                >
                  画面生成中…
                </motion.span>
              </div>
            )}

            {/* 2. 内容区 · 杂志化排版 · 人格色调呼吸 */}
            <div className="relative z-10 px-7 flex flex-col" style={{ background: theme.paperBg }}>
              {/* 人格标签 · 主+副 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase === "full" ? { opacity: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex items-center gap-1.5 mb-5"
              >
                <span className="text-xs">{p.emoji}</span>
                <span
                  className="text-[9px] tracking-[0.15em]"
                  style={{ color: p.color }}
                >
                  {p.name}
                </span>
                {secondaryType && secondaryType !== personalityType && (() => {
                  const s = personalities[secondaryType];
                  return (<>
                    <span className="text-[8px]" style={{ color: theme.metaColor, opacity: 0.3 }}>×</span>
                    <span className="text-xs">{s.emoji}</span>
                    <span
                      className="text-[8px] tracking-[0.1em]"
                      style={{ color: s.color, opacity: 0.6 }}
                    >
                      {s.name}
                    </span>
                  </>);
                })()}
              </motion.div>

              {/* 诗文 · 变奏排版 · 杂志呼吸感 */}
              <div className="mb-6">
                {lines.map((line, idx) => {
                  const trimmed = line.trim();
                  if (trimmed === "") return <div key={idx} style={{ height: "clamp(10px, 2dvh, 18px)" }} />;
                  const isFirst = idx === 0 || (idx === 1 && lines[0].trim() === "");
                  const isLast = idx === lines.length - 1 || (idx === lines.length - 2 && lines[lines.length - 1].trim() === "");
                  const isShort = trimmed.length <= 6;
                  const poemWeight = isFirst || isShort ? 500 : isLast ? 450 : 300;
                  const poemColor = isFirst || isShort ? theme.poemBold : isLast ? theme.poemRegular : theme.poemLight;
                  const fontSize = isFirst ? "clamp(17px, 2.2dvh, 22px)" : "clamp(15px, 2dvh, 19px)";
                  return (
                    <motion.p
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={phase === "full" ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.3 + idx * 0.18, duration: 0.5 }}
                      style={{
                        color: poemColor,
                        fontWeight: poemWeight,
                        fontSize,
                        lineHeight: 2.2,
                        letterSpacing: "0.08em",
                        fontFamily: "'Noto Serif SC', serif",
                      }}
                    >
                      {trimmed}
                    </motion.p>
                  );
                })}
              </div>

              {/* 灵光路径 · 星图散落 · 主色节点+副色尾光 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase === "full" ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 + lines.length * 0.18 + 0.3 }}
                className="mb-4"
              >
                <div className="relative flex items-center justify-between px-2" style={{ height: 28 }}>
                  {/* 底线：主色极淡 */}
                  <div
                    className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-px"
                    style={{ background: theme.divider }}
                  />
                  {/* 节点 */}
                  {["初见", "试探", "信任", "理解", "驯化"].map((s, i) => {
                    // 最后一个节点用副人格色（暗示旅程终点有变化）
                    const isEnd = i === 4 && secondaryType && secondaryType !== personalityType;
                    const dotColor = i === 0 ? p.color : isEnd ? personalities[secondaryType!].color : `rgba(${p.colorRgb}, 0.12)`;
                    const labelColor = i === 0 ? p.color : isEnd ? personalities[secondaryType!].color : theme.metaColor;
                    return (
                      <div key={s} className="relative flex flex-col items-center z-10">
                        <div
                          className="rounded-full"
                          style={{
                            width: i === 0 ? 6 : isEnd ? 4 : 3,
                            height: i === 0 ? 6 : isEnd ? 4 : 3,
                            backgroundColor: dotColor,
                            boxShadow: i === 0
                              ? `0 0 6px rgba(${p.colorRgb}, 0.5), 0 0 12px rgba(${p.colorRgb}, 0.2)`
                              : isEnd
                                ? `0 0 4px ${personalities[secondaryType!].color}40`
                                : "none",
                          }}
                        />
                        <span
                          className="absolute top-4 whitespace-nowrap"
                          style={{
                            fontSize: "7px",
                            letterSpacing: "0.1em",
                            color: labelColor,
                            opacity: i === 0 || isEnd ? 1 : 0.4,
                          }}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* 底部信息行 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase === "full" ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 + lines.length * 0.18 + 0.5 }}
                className="flex items-baseline justify-between mt-3 mb-3"
              >
                <span className="text-[9px] tracking-wider" style={{ color: theme.metaColor, opacity: 0.5 }}>
                  {new Date().toLocaleDateString("en-CA")}
                </span>
                <span className="text-[9px] tracking-wider" style={{ color: theme.metaColor, opacity: 0.5 }}>
                  {catName}的第一张灵光
                </span>
              </motion.div>

              {/* 下一章预告 · 精致注脚 · 副人格色虚线 */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={phase === "full" ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + lines.length * 0.18 + 0.7, duration: 0.6 }}
                className="mb-5 mx-2 py-3 px-4 text-center"
                style={{
                  border: `0.5px dashed ${theme.divider}`,
                  borderRadius: 8,
                  background: theme.accentGlow,
                }}
              >
                <div
                  className="text-[8px] mb-1.5 tracking-[0.2em]"
                  style={{ color: theme.metaColor, opacity: 0.5 }}
                >
                  CHAPTER 2
                </div>
                <div
                  className="text-[12px] leading-relaxed italic"
                  style={{ color: theme.poemLight, fontFamily: "'Noto Serif SC', serif" }}
                >
                  它会靠近你吗？还是假装路过？
                </div>
              </motion.div>

              {/* 操作按钮 · 保存/分享 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase === "full" ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 + lines.length * 0.18 + 0.9 }}
                className="flex items-center justify-center gap-3 pb-4"
              >
                <button
                  onClick={() => { setSaved(true); onCardSaved?.(); setTimeout(() => setSaved(false), 2000); }}
                  className="flex-1 py-2.5 text-[12px] tracking-wider rounded-lg transition-colors"
                  style={{
                    border: `0.5px solid ${theme.divider}`,
                    color: theme.metaColor,
                    background: "transparent",
                  }}
                >
                  {saved ? "已保存 ✓" : "保存"}
                </button>
                <button
                  onClick={() => {
                    onCardShared?.();
                    if (navigator.share) {
                      navigator.share({
                        title: `${catName}的灵光卡`,
                        text: `我家${catName}是${p.name}！来测测你家猫的灵魂人格 ✨`,
                        url: window.location.href,
                      });
                    }
                  }}
                  className="flex-1 py-2.5 text-[12px] tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    background: theme.titleColor,
                    color: theme.paperBg,
                  }}
                >
                  分享 <span style={{ fontSize: 10 }}>→</span>
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* 反馈入口 · 主按钮 */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={phase === "full" ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 + lines.length * 0.18 + 1.2, duration: 0.5 }}
            onClick={onNext}
            className="flex-shrink-0 w-full mt-4 py-4 text-[15px] font-medium rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)`,
              color: "#fff",
              boxShadow: `0 4px 20px rgba(${p.colorRgb}, 0.35), 0 1px 3px rgba(0,0,0,0.2)`,
            }}
          >
            {catName} 想听听你的感受 💬
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== 出口页 ====================

type Feedback = "moved" | "okay" | "meh" | null;

const feedbackOptions: { key: Feedback & string; emoji: string; label: string }[] = [
  { key: "moved", emoji: "✨", label: "被打动了" },
  { key: "okay", emoji: "👍", label: "还不错" },
  { key: "meh", emoji: "😶", label: "没什么感觉" },
];

const catFeedbackReply: Record<PersonalityType, Record<string, string>> = {
  storm: {
    moved: "真的吗！！太好了！！我要多转三圈庆祝！！",
    okay: "还不错？那我再努力一点！下次一定让你说不出话！",
    meh: "没关系！可能是我还不够了解你。给我多一点时间？",
  },
  moon: {
    moved: "……嗯。（尾巴轻轻晃了一下）……我也是。",
    okay: "……嗯。还可以更好的。我会努力。",
    meh: "……嗯。谢谢你的诚实。我会记住的。",
  },
  sun: {
    moved: "真的吗！太开心了！你开心我就开心！☀️",
    okay: "不错就是好的开始！以后会越来越好的！我保证！",
    meh: "没关系呀！每段关系都需要时间。我会等你的 ☀️",
  },
  forest: {
    moved: "……（假装没听到，但耳朵转了一下）",
    okay: "嗯。不错。我接受这个评价。",
    meh: "嗯。诚实是好事。我不需要你假装喜欢我。",
  },
};

function ExitStage({
  catName,
  personality: p,
  personalityType,
  secondaryType,
  userProfile,
  durationMs,
  cardSaved,
  cardShared,
}: {
  catName: string;
  personality: Personality;
  personalityType: PersonalityType;
  secondaryType: PersonalityType | null;
  userProfile?: UserProfile;
  durationMs: number;
  cardSaved: boolean;
  cardShared: boolean;
}) {
  const [phase, setPhase] = useState<"feedback" | "reply" | "questions" | "thanks">("feedback");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [contact, setContact] = useState("");
  const [nickname, setNickname] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistExpanded, setWaitlistExpanded] = useState(false);

  // P0-1: 问卷数据
  const [peakMoment, setPeakMoment] = useState<string | null>(null);
  const [peakExtra, setPeakExtra] = useState("");
  const [showPeakExtra, setShowPeakExtra] = useState(false);
  const [nps, setNps] = useState<number | null>(null);
  const q2Ref = useRef<HTMLDivElement>(null);

  const handleFeedback = (fb: Feedback & string) => {
    setFeedback(fb);
    setPhase("reply");

    // 存到 localStorage
    try {
      const data = JSON.parse(localStorage.getItem("spark7_feedback") || "[]");
      data.push({ feedback: fb, catName, personality: p.type, timestamp: Date.now() });
      localStorage.setItem("spark7_feedback", JSON.stringify(data));
    } catch {}

    setTimeout(() => setPhase("questions"), 2500);
  };

  // 发送飞书 Webhook（Q2 完成后立即推送）
  const sendTrackData = async (extra?: { nickname?: string; contact?: string; isSupplemental?: boolean }) => {
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catName,
          personalityType,
          secondaryType,
          feedback,
          peakMoment,
          peakExtra: peakExtra.trim() || undefined,
          nps,
          nickname: extra?.nickname || undefined,
          contact: extra?.contact || undefined,
          joinedWaitlist: !!extra?.contact,
          durationMs,
          cardSaved,
          cardShared,
          userProfile,
          isSupplemental: extra?.isSupplemental || false,
        }),
      });
    } catch {}
  };

  // 感谢页折叠区：提交联系方式（补充推送）
  const handleWaitlistSubmit = () => {
    // 存到 localStorage
    try {
      const data = JSON.parse(localStorage.getItem("spark7_waitlist") || "[]");
      data.push({ nickname, contact, feedback, catName, personality: p.type, timestamp: Date.now() });
      localStorage.setItem("spark7_waitlist", JSON.stringify(data));
    } catch {}

    setWaitlistSubmitted(true);
    sendTrackData({ nickname: nickname.trim(), contact: contact.trim(), isSupplemental: true });
  };

  // Q1 选中后自动滚到 Q2
  const handlePeakSelect = (key: string) => {
    setPeakMoment(key);
    setTimeout(() => q2Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  };

  const peakOptions = [
    { key: "personality", label: "灵魂人格", emoji: "🧬" },
    { key: "chat", label: "跟猫聊天", emoji: "💬" },
    { key: "timeline", label: "时间线", emoji: "📖" },
    { key: "card", label: "灵光卡", emoji: "✨" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="z-10 w-full max-w-md px-6 h-dvh flex flex-col items-center justify-center"
    >
      {/* 反馈收集 */}
      {phase === "feedback" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center"
        >
          <div className="text-5xl mb-3">{p.emoji}</div>
          <h2 className="text-xl font-bold mb-2">
            {catName}想知道……
          </h2>
          <p className="text-white/50 mb-8 text-sm">
            这次体验，你觉得怎么样？
          </p>

          <div className="space-y-4">
            {feedbackOptions.map((opt) => (
              <motion.button
                key={opt.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: feedbackOptions.indexOf(opt) * 0.1 }}
                onClick={() => handleFeedback(opt.key)}
                className="w-full p-5 bg-[#232136]/80 backdrop-blur rounded-2xl border border-white/5 active:bg-white/10 transition-colors text-lg"
              >
                <span className="mr-3">{opt.emoji}</span>
                {opt.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 小咪回应 */}
      {phase === "reply" && feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-3">{p.emoji}</div>
          <div className="bg-[#232136]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
            <p className="text-white/90 text-lg leading-relaxed" style={{ color: p.color }}>
              {catFeedbackReply[p.type][feedback]}
            </p>
          </div>
        </motion.div>
      )}

      {/* P0-1: 问卷 — Q1 + Q2 */}
      {phase === "questions" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full overflow-y-auto max-h-[80dvh] scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Q1 情感峰值 */}
          <div className="text-center mb-8">
            <p className="text-white/50 text-sm mb-4">
              哪个瞬间最打动你？
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {peakOptions.map((opt) => (
                <motion.button
                  key={opt.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePeakSelect(opt.key)}
                  className="px-4 py-2.5 rounded-full text-sm transition-all"
                  style={{
                    background: peakMoment === opt.key
                      ? `rgba(${p.colorRgb}, 0.25)`
                      : "rgba(255,255,255,0.05)",
                    border: peakMoment === opt.key
                      ? `1px solid ${p.color}`
                      : "1px solid rgba(255,255,255,0.08)",
                    color: peakMoment === opt.key ? p.color : "rgba(255,255,255,0.6)",
                  }}
                >
                  <span className="mr-1.5">{opt.emoji}</span>{opt.label}
                </motion.button>
              ))}
            </div>

            {/* 可展开"其他想说的" */}
            <div className="mt-3">
              {!showPeakExtra ? (
                <button
                  onClick={() => setShowPeakExtra(true)}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  还有其他想说的？
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <textarea
                    value={peakExtra}
                    onChange={(e) => setPeakExtra(e.target.value)}
                    placeholder="说说看……"
                    rows={2}
                    className="w-full mt-2 bg-[#1a1826] text-sm py-3 px-4 rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-white/20 border border-white/5 resize-none"
                    style={{ focusRingColor: p.color } as React.CSSProperties}
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Q2 NPS */}
          {peakMoment && (
            <motion.div
              ref={q2Ref}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-white/50 text-sm mb-5">
                你会跟其他铲屎官说起我吗？
              </p>

              {/* 0-10 滑块 */}
              <div className="px-2 mb-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={nps ?? 5}
                  onChange={(e) => setNps(Number(e.target.value))}
                  className="w-full accent-current"
                  style={{ accentColor: p.color, opacity: nps === null ? 0.3 : 1 }}
                />
                <div className="flex justify-between text-[10px] text-white/25 mt-1 px-0.5">
                  <span>0 · 完全不会</span>
                  <span>10 · 疯狂安利</span>
                </div>
              </div>

              {nps !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 mb-2"
                >
                  <span className="text-2xl font-bold" style={{ color: p.color }}>{nps}</span>
                  <span className="text-white/30 text-sm"> / 10</span>
                </motion.div>
              )}

              {/* 继续按钮（拖动后才出现）→ 直接跳感谢页并推送 webhook */}
              {nps !== null && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { sendTrackData(); setPhase("thanks"); }}
                  className="mt-4 px-8 py-3 rounded-full text-sm transition-colors"
                  style={{
                    background: `rgba(${p.colorRgb}, 0.15)`,
                    color: p.color,
                    border: `1px solid rgba(${p.colorRgb}, 0.3)`,
                  }}
                >
                  继续 →
                </motion.button>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* 感谢页 */}
      {phase === "thanks" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-6xl mb-3"
          >
            {p.emoji}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold mb-2"
          >
            谢谢你认识{catName}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm leading-relaxed mb-8"
            style={{
              color: p.color,
              opacity: 0.7,
              textShadow: `0 0 20px rgba(${p.colorRgb}, 0.3)`,
            }}
          >
            「每一个灵魂都值得被看见」
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-[#232136]/60 backdrop-blur rounded-2xl p-6 border border-white/5 mb-6"
          >
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Spark7 正在打造一个让人与动物灵魂相遇的地方。
              <br />
              不是工具，不是玩具，是真正的理解与陪伴。
            </p>
            <div className="flex items-center justify-center gap-6 text-white/30 text-xs">
              <span>🐱 4 种灵魂人格</span>
              <span>📝 灵光卡收藏</span>
              <span>💛 拒绝弃养</span>
            </div>
          </motion.div>

          {/* 折叠式等待列表 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="mb-6"
          >
            {!waitlistSubmitted ? (
              <>
                <button
                  onClick={() => setWaitlistExpanded(!waitlistExpanded)}
                  className="text-sm transition-colors"
                  style={{ color: waitlistExpanded ? p.color : "rgba(255,255,255,0.4)" }}
                >
                  {waitlistExpanded ? "收起 ↑" : "想第一时间体验完整版？ ↓"}
                </button>

                {waitlistExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 bg-[#232136]/60 backdrop-blur rounded-2xl p-5 border border-white/5 space-y-3"
                  >
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="你的昵称"
                      className="w-full bg-[#1a1826] text-center py-3 px-4 rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-white/20 border border-white/5 text-sm"
                      style={{ focusRingColor: p.color } as React.CSSProperties}
                    />
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="微信号 / 手机号 / 邮箱"
                      className="w-full bg-[#1a1826] text-center py-3 px-4 rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-white/20 border border-white/5 text-sm"
                      style={{ focusRingColor: p.color } as React.CSSProperties}
                    />
                    <button
                      onClick={handleWaitlistSubmit}
                      disabled={!contact.trim()}
                      className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-30 transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)`,
                        boxShadow: contact.trim() ? `0 4px 16px rgba(${p.colorRgb}, 0.3)` : "none",
                      }}
                    >
                      提交 ✨
                    </button>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm"
                style={{ color: p.color }}
              >
                ✓ 已记录，{catName}会第一时间找到你
              </motion.p>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={() => window.location.reload()}
            className="px-8 py-3 rounded-full border border-white/10 text-white/50 text-sm active:bg-white/5 transition-colors"
          >
            再测一次 🔄
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
