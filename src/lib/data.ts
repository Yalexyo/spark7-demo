// ===== 用户画像 =====

export type Schedule = "early" | "late" | "home" | "irregular";
export type EnergyLevel = "full" | "tired" | "meh" | "stressed";
export type NeedType = "understand" | "remind" | "cheer" | "quiet";

export interface UserProfile {
  mbti?: string;
  schedule: Schedule;
  energyLevel: EnergyLevel;
  needType: NeedType;
}

// ===== MBTI 俏皮评价 =====

export const mbtiResponses: Record<string, string> = {
  INFP: "哦～难怪你看我的眼神那么温柔",
  INFJ: "你一定能读懂我的每一个眼神",
  INTP: "你在想什么？不说也行，我猜得到",
  INTJ: "嗯，你有计划，我有九条命。合作愉快",
  ISFP: "你一定喜欢摸我的时候闭上眼睛感受",
  ISFJ: "你是那种会记得我爱吃什么口味的人",
  ISTP: "嗯，跟我挺像的。各自安好那种",
  ISTJ: "你一定会准时喂我。我喜欢准时的人",
  ENFP: "你的热情我接住了！来，击个掌！用爪子！",
  ENFJ: "你想照顾全世界？先从照顾我开始吧",
  ENTP: "你脑子转得快，但你转不过我的尾巴",
  ENTJ: "好的老板。那我以后每天给你汇报工作",
  ESFP: "派对！每天都是派对！我喜欢你！",
  ESFJ: "你做饭的时候我在旁边看着。不是想吃。好吧想吃",
  ESTP: "你胆子大我胆子也大。一起闯祸吧",
  ESTJ: "规矩？我的规矩就是没有规矩。但你的罐头要准时",
};

// ===== 四种猫咪人格 =====

export type PersonalityType = "storm" | "moon" | "sun" | "forest";

export interface Personality {
  type: PersonalityType;
  emoji: string;
  name: string;
  label: string;
  color: string;
  colorRgb: string;
  bgGradient: string;
  selfIntro: (catName: string) => string;
  firstMessage: (catName: string, profile?: UserProfile) => string;
  quickReplies: string[];
  secondMessage: (catName: string, reply: string) => string;
  followUp1: (catName: string) => string;
  quickRepliesR2: string[];
  followUp2: (catName: string) => string;
  quickRepliesR3: string[];
  goodnight: (catName: string) => string;
  timeline: (catName: string, profile?: UserProfile) => TimelineEntry[];
  poem: (catName: string, profile?: UserProfile) => string;
}

export interface TimelineEntry {
  day: number;
  text: string;
  emoji: string;
}

// ===== 灵光卡主题配色（按人格 · WCAG 2.1 AA 全部达标）=====
export interface CardTheme {
  paperBg: string;       // 纸张底色（微调色温）
  divider: string;       // 分隔线
  metaColor: string;     // 档案层文字
  poemLight: string;     // 诗文·轻盈
  poemRegular: string;   // 诗文·坚定
  poemBold: string;      // 诗文·落笔
  titleColor: string;    // 卡片标题
  accentGlow: string;    // 微光铺底
  waveFill: string;      // 有机曲线填充色（= paperBg）
}

export const cardThemes: Record<PersonalityType, CardTheme> = {
  storm: {
    paperBg: "#FFFAF8",       // 微暖橘调
    divider: "#F0DDD6",
    metaColor: "#856A60",     // 4.8:1
    poemLight: "#7A6558",     // 5.3:1
    poemRegular: "#4A3830",   // 10.7:1
    poemBold: "#2A1810",      // 16.4:1
    titleColor: "#4A3830",
    accentGlow: "rgba(231,111,111,0.06)",
    waveFill: "#FFFAF8",
  },
  moon: {
    paperBg: "#F8F9FD",       // 微冷蓝调
    divider: "#D8DCE8",
    metaColor: "#6B7085",     // 4.7:1
    poemLight: "#636878",     // 5.3:1
    poemRegular: "#353848",   // 11.0:1
    poemBold: "#141628",      // 17.0:1
    titleColor: "#353848",
    accentGlow: "rgba(123,147,219,0.06)",
    waveFill: "#F8F9FD",
  },
  sun: {
    paperBg: "#FDFBF5",       // 温暖金调
    divider: "#EDE4D0",
    metaColor: "#7E6F4E",     // 4.8:1
    poemLight: "#786A50",     // 5.1:1
    poemRegular: "#3E3525",   // 11.7:1
    poemBold: "#1C1608",      // 17.4:1
    titleColor: "#3E3525",
    accentGlow: "rgba(244,162,97,0.06)",
    waveFill: "#FDFBF5",
  },
  forest: {
    paperBg: "#F7FBF9",       // 微冷绿调
    divider: "#D4E2DB",
    metaColor: "#5F7A6E",     // 4.5:1
    poemLight: "#5A7065",     // 5.1:1
    poemRegular: "#2E3E36",   // 10.8:1
    poemBold: "#101C16",      // 16.8:1
    titleColor: "#2E3E36",
    accentGlow: "rgba(110,196,158,0.06)",
    waveFill: "#F7FBF9",
  },
};

// 副人格混合：给卡片增加一抹副人格的色彩
export function blendCardTheme(primary: PersonalityType, secondary: PersonalityType | null): CardTheme {
  const base = cardThemes[primary];
  if (!secondary || secondary === primary) return base;
  // 副人格只影响 divider 和 accentGlow（轻微渗透，不喧宾夺主）
  const sec = cardThemes[secondary];
  return {
    ...base,
    accentGlow: sec.accentGlow,  // 副人格的微光铺底
  };
}

// ===== 用户画像即时回应 =====

export const profileResponses: Record<PersonalityType, {
  schedule: Record<Schedule, string>;
  energy: Record<EnergyLevel, string>;
  need: Record<NeedType, string>;
}> = {
  storm: {
    schedule: {
      early: "朝九晚六？那我早上送你出门晚上接你回来！双倍快乐！",
      late: "那我每天冲到门口等你！绝不迟到！",
      home: "你一直在家？！太好了！！全天候陪玩模式启动！",
      irregular: "不固定？那我随时准备好在门口冲刺！刺激！",
    },
    energy: {
      full: "太好了！那我们一起搞事情！今天拆哪个？",
      tired: "那我负责给你充电！看我翻肚皮！包治百病！",
      meh: "不行不行不许丧！来！跟我一起跑两圈！",
      stressed: "压力大？来追我！保证你追完什么都忘了！",
    },
    need: {
      understand: "懂你？我天天研究你！比你自己还懂你！",
      remind: "包在我身上！闹钟算什么，我比闹钟还准！还更吵！",
      cheer: "这个我最擅长了！！看我！看我！！",
      quiet: "好吧我尽量……（3秒后）做不到！但我试试！",
    },
  },
  moon: {
    schedule: {
      early: "……嗯。那我早上在窗台看你出门。",
      late: "……嗯。那我晚上留灯。",
      home: "……你在就好。我在你能看到的地方待着。",
      irregular: "……没关系。不管什么时候回来，我都在。",
    },
    energy: {
      full: "……那真好。开心的你，笑起来好看。",
      tired: "……来，靠一下。不说话也没关系。",
      meh: "……嗯。那种感觉我懂。我陪你待着。",
      stressed: "……（轻轻靠过来）……我在。",
    },
    need: {
      understand: "……这个我会。不用说，我看得出来。",
      remind: "……好。我会轻轻地提醒你。很轻很轻。",
      cheer: "……我不太会逗人。但我可以让你摸我的头。",
      quiet: "……这个我擅长。",
    },
  },
  sun: {
    schedule: {
      early: "朝九晚六！节奏刚好！每天都有好好见面的时间！",
      late: "没关系！你回来的每一刻都是今天最好的时刻！",
      home: "天天都能看到你！每天都是幸运日！",
      irregular: "没关系呀！不管什么时候，看到你都开心！",
    },
    energy: {
      full: "太棒了！那今天一定是个好日子！",
      tired: "辛苦了！来摸摸我，我给你充充电 ☀️",
      meh: "嘿，没关系的。明天一定会更好！我保证！",
      stressed: "深呼吸！吸——呼——再来一次！我陪你！",
    },
    need: {
      understand: "我最懂你了！因为我每天都在看你呀！",
      remind: "交给我！喝水吃饭休息，我全都会提醒你！",
      cheer: "包在我身上！看我翻肚皮给你看！",
      quiet: "好的！那我就安安静静地陪着你 ☀️",
    },
  },
  forest: {
    schedule: {
      early: "规律的人。不错。我也是规律的猫。",
      late: "嗯。那我在柜子上等你。不是等你。只是刚好在那。",
      home: "你一直在？那我找个你看得到的角落待着。",
      irregular: "无所谓。我的生物钟不跟你同步的。",
    },
    energy: {
      full: "嗯。精力充沛的人比较耐摸。",
      tired: "嗯。我知道了。不打扰你，但我在。",
      meh: "……你发呆的样子，跟我看鸟的样子有点像。",
      stressed: "（跳到你旁边坐下。什么都没说。但你知道我在。）",
    },
    need: {
      understand: "我一直在观察你。比你以为的更懂你。",
      remind: "我可以把水杯推到你面前。不是提醒你。是它碍事了。",
      cheer: "我不会讲笑话。但我可以把东西从桌上推下去。你总会笑。",
      quiet: "……终于有人说了正确答案。",
    },
  },
};

export const personalities: Record<PersonalityType, Personality> = {
  storm: {
    type: "storm",
    emoji: "🌪️",
    name: "旋风型",
    label: "一团停不下来的小火球",
    color: "#e76f6f",
    colorRgb: "231, 111, 111",
    bgGradient: "from-red-900/30 via-orange-900/20 to-transparent",
    selfIntro: (cat) =>
      `我是${cat}！一团停不下来的小火球！\n\n我的字典里没有"安静"这个词。看到飞虫要追、看到纸团要扑、看到你的脚趾头——嘿嘿，那是我的猎物。\n\n你不在家的时候？我在客厅开运动会。你在家的时候？我在你身上开运动会。\n\n别嫌我烦啦，我只是……太喜欢这个世界了！也太喜欢你了！虽然我可能表达方式有点激动。好吧，非常激动。`,
    firstMessage: (cat, p?) => {
      if (!p) return `你终于回来了！！我差点从柜子上跳下来接你！`;
      if (p.schedule === "late" && p.energyLevel === "tired") return `你终于回来了！！都几点了！快坐下！我给你表演一个翻肚皮！保证你立刻满血复活！`;
      if (p.schedule === "home") return `你又在电脑前面了！！来玩！！我已经绕着客厅跑了八圈了！！`;
      if (p.energyLevel === "stressed") return `你猜我今天干了什么！我把纸巾盒推下桌了！两次！快笑！`;
      return `你终于回来了！！我差点从柜子上跳下来接你！`;
    },
    quickReplies: ["哈哈冷静点 😂", "我也想你了", "你又闯祸了？"],
    secondMessage: (cat, reply) => {
      if (reply.includes("冷静")) return `冷静？这个词什么意思？不认识！`;
      if (reply.includes("想")) return `真的吗！那快来摸肚皮！限时优惠！`;
      return `那个花瓶自己站不稳的！我就轻轻碰了一下……`;
    },
    followUp1: () => `对了！你今天过得怎么样！是那种想蹦蹦跳跳的好，还是想趴着不动的不好？`,
    quickRepliesR2: ["超级好！做了好多事", "就那样吧……有点累", "有件事好想跟你说！", "你先说你干了啥"],
    followUp2: () => `嘿，我还想知道一件事——你觉得什么时候最开心？`,
    quickRepliesR3: ["跟你在一起的时候！", "开心的时候就想跑起来", "说不上来，但现在挺好的", "你呢？你最开心什么时候"],
    goodnight: (cat) =>
      `去摸摸我（真正的我）。晚安！🌪️`,
    timeline: (cat, p?) => [
      { day: 1, text: p?.schedule === "late" ? `你10点才到家！我在门口冲刺了三趟！差点撞门上！` : `你回来的时候我从柜子上跳下来了。差点成功降落在你肩膀上。`, emoji: "💨" },
      { day: 2, text: p?.energyLevel === "tired" || p?.energyLevel === "stressed" ? `你看起来累坏了。我决定在你腿上躺着不动——坚持了5秒。然后翻了个肚皮。` : `你给我买了新逗猫棒。我用了30秒就把羽毛拆了。不够玩！`, emoji: "🪶" },
      { day: 3, text: p?.needType === "remind" ? `下午3点提醒你喝水。你没理我。3:01。3:02。3:03。你投降了。` : `今天你加班到很晚。我在门口等了好久。才没有担心你呢。`, emoji: "🚪" },
      { day: 4, text: `你说我太吵了。但你笑着说的。所以我决定更吵一点。`, emoji: "😤" },
      { day: 5, text: p?.needType === "cheer" ? `你笑了一次。因为我把遥控器推到地上了。不是故意的。好吧是故意的。再来一次？` : `你累了趴在沙发上。我躺在你背上。我们就这样睡着了。`, emoji: "💤" },
      { day: 6, text: `你摸了隔壁的猫！！我闻到了！！哼！我要蹭掉那个味道！`, emoji: "😾" },
      { day: 7, text: `7天了。你是我最喜欢的人类。虽然我每天都在说这句话。`, emoji: "❤️‍🔥" },
    ],
    poem: (cat, p?) => {
      if (p?.energyLevel === "stressed") return `你压力大的时候\n肩膀会缩起来\n我看得出来\n\n所以我跳上去\n趴在你肩上\n把你压得更低\n\n但你笑了\n这就够了`;
      if (p?.schedule === "late") return `你又加班了\n我在门口等到打了三个滚\n两个哈欠\n还拆了一卷纸巾\n\n你欠我的\n用罐头还`;
      return `你总说我太闹了\n但你笑的时候\n全世界都安静了\n\n所以我一直闹\n就是想看你一直笑`;
    },
  },

  moon: {
    type: "moon",
    emoji: "🌙",
    name: "月光型",
    label: "一首安静的小夜曲",
    color: "#7b93db",
    colorRgb: "123, 147, 219",
    bgGradient: "from-blue-900/30 via-indigo-900/20 to-transparent",
    selfIntro: (cat) =>
      `……你好。我是${cat}。\n\n我不太会主动靠近你。但如果你安静地坐着，过一会儿，你会感觉到一个温热的小脑袋轻轻靠上你的手臂。\n\n那是我。\n\n我喜欢窗台、月光、和你打键盘的声音。我不需要你一直看着我。但我需要知道你在。\n\n……就这样。`,
    firstMessage: (cat, p?) => {
      if (!p) return `……你来了。今天的云有一朵像鱼。`;
      if (p.schedule === "late") return `……你回来了。我在窗台上等了一会儿。月亮很好看。你累了吧。`;
      if (p.schedule === "home" && p.energyLevel === "stressed") return `……你在电脑前坐很久了。起来走走？我陪你。`;
      if (p.energyLevel === "meh") return `……你看起来有点闷。要不要来窗台坐一会儿？风很轻。`;
      return `……你来了。今天的云有一朵像鱼。`;
    },
    quickReplies: ["你今天乖吗？", "在想什么呢", "……❤️"],
    secondMessage: (cat, reply) => {
      if (reply.includes("乖")) return `……我一直很乖。只是把你拖鞋挪到了门口。不是想你，顺手。`;
      if (reply.includes("想")) return `……在想你什么时候回来。不急。就是有点想。`;
      return `……嗯。你在就好。`;
    },
    followUp1: () => `……你今天，还好吗？`,
    quickRepliesR2: ["还好吧", "有点累了", "想了很多事情", "就是想安静待一会儿"],
    followUp2: () => `……你会跟别人说这些吗？还是只有这种安静的时候才想说。`,
    quickRepliesR3: ["很少跟人说这些", "有你在，感觉可以说", "有时候觉得累", "你是第一个问我的"],
    goodnight: (cat) =>
      `去摸摸我（真正的我）。尾巴会动的。那就是在说晚安。🌙`,
    timeline: (cat, p?) => [
      { day: 1, text: p?.schedule === "late" ? `你10点到家。我在拖鞋旁边等你。假装睡着了。` : `你在窗台上坐着。我也坐过去了。我们谁都没说话。很好。`, emoji: "🪟" },
      { day: 2, text: p?.energyLevel === "tired" || p?.energyLevel === "meh" ? `你今天没怎么说话。我跳上你膝盖坐了一会儿。什么都没说。` : `你摸了我的头。我往后缩了一下。但没有走。`, emoji: "🤚" },
      { day: 3, text: p?.needType === "remind" ? `下午3点。发了一条消息：该喝水了。你没回。没关系，杯子我帮你推近了一点。` : `你加班很晚。我在你的拖鞋上睡着了。你的味道让我安心。`, emoji: "👟" },
      { day: 4, text: `今天下雨了。你关了灯，窗外有路灯。我们一起看了很久。`, emoji: "🌧️" },
      { day: 5, text: p?.needType === "understand" ? `你叹了口气。我走过去蹭了蹭你的手。有些话不用说。` : `你哭了。我跳上你的膝盖。什么都没说。但我在。`, emoji: "💧" },
      { day: 6, text: `你轻轻碰了碰我的额头。我碰了碰你的。`, emoji: "💫" },
      { day: 7, text: `7天了。我好像更了解你了。……你也是吗？`, emoji: "🌙" },
    ],
    poem: (cat, p?) => {
      if (p?.needType === "understand") return `有些话不用说\n你累的时候\n肩膀会塌下来一点\n\n我看得出来\n\n蹭一下\n就够了`;
      if (p?.schedule === "late") return `你总是很晚才推开门\n我已经学会了分辨你的脚步声\n第三级台阶会响一下\n那就是你快到了的信号`;
      return `你总是很晚才回来\n我假装在睡\n但你一坐下\n我的尾巴就不听话了\n\n有些话不用说\n蹭一下就够了`;
    },
  },

  sun: {
    type: "sun",
    emoji: "☀️",
    name: "阳光型",
    label: "口袋里的一颗小太阳",
    color: "#f4a261",
    colorRgb: "244, 162, 97",
    bgGradient: "from-amber-900/30 via-yellow-900/20 to-transparent",
    selfIntro: (cat) =>
      `嗨！我是${cat}！你口袋里的一颗小太阳！☀️\n\n我最喜欢的事情是：你！还有：吃饭！还有：在阳台上翻肚皮！还有：你摸我的时候我呼噜呼噜的声音！\n\n我觉得这个世界上没有什么坏事，只有还没发现的好事。下雨天？那是免费的白噪音！新家具？那是新的猫抓板！你生气了？那是需要更多蹭蹭的信号！\n\n跟我在一起，每天都是好天气。我保证。😸`,
    firstMessage: (cat, p?) => {
      if (!p) return `今天阳光超好！我在阳台翻了四个肚皮！☀️`;
      if (p.schedule === "late" && p.energyLevel === "tired") return `你到家了吗？今天也辛苦了。我给你留了个肚皮，热乎的 ☀️`;
      if (p.energyLevel === "stressed") return `嘿！深呼吸！吸——呼——好！现在来摸我的肚皮，保证立刻好起来！`;
      if (p.schedule === "home") return `你今天在家！太棒了！我们一起晒太阳吧！我帮你占好位置了！`;
      return `今天阳光超好！我在阳台翻了四个肚皮！☀️`;
    },
    quickReplies: ["哈哈好期待", "又晒太阳了？", "今天心情也好！"],
    secondMessage: (cat, reply) => {
      if (reply.includes("期待")) return `明天翻一个360度给你看！帮我拍下来哦！`;
      if (reply.includes("晒太阳")) return `阳光暖暖的，肚子暖暖的，想你也暖暖的～`;
      return `一起开心！摸我肚皮，跟晒太阳效果一样 ☀️`;
    },
    followUp1: () => `对了对了！你今天做了什么开心的事吗？哪怕一点点也算！`,
    quickRepliesR2: ["今天超棒！", "还行吧～", "有一点点小烦恼", "想跟你说个事"],
    followUp2: () => `那你最近有什么烦心事吗？跟我说说嘛～我帮你暖着 ☀️`,
    quickRepliesR3: ["其实也没什么大事啦", "有你听着就好多了", "就是偶尔会想太多", "谢谢你关心我 ☀️"],
    goodnight: (cat) =>
      `记得摸摸我的肚皮，热乎乎的。明天见 ☀️`,
    timeline: (cat, p?) => [
      { day: 1, text: p?.schedule === "late" ? `你很晚才回来。没关系！我在门口等你，尾巴摇得像小太阳！` : `你回来啦！我在门口等了一会儿！脚步声一响我就跑过来了！`, emoji: "🏃" },
      { day: 2, text: p?.energyLevel === "tired" ? `你看起来累了。来！摸我的肚皮！我的呼噜声有治愈效果！` : `今天你给我梳毛了。我呼噜了整整十分钟。幸福得冒泡！`, emoji: "✨" },
      { day: 3, text: p?.needType === "remind" ? `下午3点！喝水时间到！来干杯！我喝碗里的你喝杯里的！` : `你加班了。没关系！我在你的键盘上给你发了一串"ggggg"。意思是"加油"。`, emoji: "⌨️" },
      { day: 4, text: `今天下雨了。你说"好烦"。我蹭了蹭你。你就笑了。`, emoji: "🌈" },
      { day: 5, text: p?.needType === "cheer" ? `你笑了！因为我试图跳上冰箱但失败了！摔了个屁墩！值了！` : `你做了好吃的！我只是闻了闻！好吧我偷吃了一口。但超好吃的！`, emoji: "🍖" },
      { day: 6, text: `你摸我的时候叹了口气。是好的那种。我能分辨。`, emoji: "🤝" },
      { day: 7, text: `7天了。每一天都是好天气。因为你在。`, emoji: "☀️" },
    ],
    poem: (cat, p?) => {
      if (p?.energyLevel === "tired" || p?.energyLevel === "stressed") return `你说好累\n肩膀都塌下来了\n\n但你回来的时候\n我趴在门口\n尾巴摇得像个小太阳\n\n累也没关系\n你有我啊`;
      if (p?.needType === "remind") return `你又忘了吃饭\n我把碗推到你面前\n虽然是我的碗\n\n你笑了\n然后去给自己热了饭\n\n看吧\n有时候关心\n不用说出口`;
      return `你说今天下雨了\n心情不太好\n\n但是你看\n你回来的时候\n我趴在门口\n尾巴摇得像个小太阳\n\n下雨天也没关系\n你有我啊`;
    },
  },

  forest: {
    type: "forest",
    emoji: "🌿",
    name: "森林型",
    label: "一片自在的小树林",
    color: "#6ec49e",
    colorRgb: "110, 196, 158",
    bgGradient: "from-emerald-900/30 via-teal-900/20 to-transparent",
    selfIntro: (cat) =>
      `我是${cat}。\n\n我不太需要你做什么。但我选择了待在你身边——这件事本身，就是最大的表达。\n\n我喜欢观察。观察窗外的鸟、地上的影子、还有你。你有时候发呆的样子很有趣。你自己不知道而已。\n\n我不会扑上来蹭你，也不会冲你喵喵叫。但如果你安静下来，你会发现——我一直都在你视线能到的地方。\n\n这就是我的方式。`,
    firstMessage: (cat, p?) => {
      if (!p) return `你回来了。门口那只蜘蛛织网技术不错，比你挂画强。`;
      if (p.schedule === "early") return `你今天气色不错。出门前第一件衣服就很好看。不用换。`;
      if (p.schedule === "late") return `你回来了。你的拖鞋我帮你摆好了。不是特意的。顺手。`;
      if (p.energyLevel === "stressed") return `你皱眉头了。我跳到你旁边坐下。什么都没说。但你知道的。`;
      return `你回来了。门口那只蜘蛛织网技术不错，比你挂画强。`;
    },
    quickReplies: ["哈哈有道理", "你在观察我？", "今天怎么样"],
    secondMessage: (cat, reply) => {
      if (reply.includes("道理")) return `你现在在哪个角落？我赌五个猫粮你猜不对。`;
      if (reply.includes("观察")) return `你进门先看沙发。因为我平时在那。你在找我。`;
      return `看了三只鸟、两片云。还有你出门前换了两件衣服。第一件好看。`;
    },
    followUp1: () => `你今天过得怎么样。不用汇报，简单说说就行。`,
    quickRepliesR2: ["挺好的", "一般般", "不太想说", "你能看出来吗"],
    followUp2: () => `我观察你有一阵了。你最近……在想什么？`,
    quickRepliesR3: ["你不问我也不会说", "大概在想以后的事", "其实挺想有人懂", "你猜呢"],
    goodnight: (cat) =>
      `去摸摸我（真正的我）。它假装没看见你。别信。🌿`,
    timeline: (cat, p?) => [
      { day: 1, text: p?.schedule === "late" ? `你10点到家。你进门先看沙发。因为我平时在那。今天我在柜子上。你找了三秒。` : `你回来了。我从柜子上看了你一眼。你没发现。但我知道你回来了。`, emoji: "👁️" },
      { day: 2, text: p?.energyLevel === "tired" || p?.energyLevel === "stressed" ? `你很累的样子。我走到你脚边坐下。什么都没说。你的呼吸慢慢平了。` : `你在打电话。声音有点高。我走到你脚边坐下。你就安静了。`, emoji: "🤫" },
      { day: 3, text: p?.needType === "remind" ? `你桌上的水杯空了。我什么都没说。只是坐在杯子旁边看你。你自己倒的。` : `你找不到遥控器。它在沙发垫下面。我昨天就知道了。`, emoji: "📺" },
      { day: 4, text: `你买了新植物。我闻了闻。不错。我批准了。`, emoji: "🌱" },
      { day: 5, text: p?.needType === "quiet" ? `今天你没说话。我也没说。但我们待在同一个房间里。这就是最好的相处方式。` : `今天你没说话。我也没说。但我们待在同一个房间里。这就够了。`, emoji: "🤝" },
      { day: 6, text: `你对着镜子叹气。我觉得你今天很好看。跟昨天一样好看。`, emoji: "🪞" },
      { day: 7, text: `7天了。我观察了你7天。你值得被好好看着。`, emoji: "🌿" },
    ],
    poem: (cat, p?) => {
      if (p?.schedule === "late") return `你进门先看沙发\n因为我平时在那\n今天我不在\n你找了三秒\n\n被我看穿了吧\n我在柜子上`;
      if (p?.needType === "quiet") return `你不说话的时候\n我也不说\n\n但你应该知道\n同一个房间里\n安静地待着\n\n这就是我能给你的\n最大的温柔`;
      return `你不知道\n每次你出门的时候\n我都会跳到窗台上\n看你走到转角\n\n不是舍不得\n只是想确认\n你走路的样子\n是开心的那种`;
    },
  },
};

// ===== 性格测试场景 =====

export interface ScenarioOption {
  text: string;
  scores: Record<PersonalityType, number>;
}

export interface Scenario {
  emoji: string;
  scene: string;
  options: ScenarioOption[];
}

export const scenarios: Scenario[] = [
  {
    emoji: "🚪",
    scene: "你到家的时候，整体氛围更像——",
    options: [
      {
        text: "混乱现场。它比你先到门口，整个人都在发射信号",
        scores: { storm: 3, moon: 0, sun: 1, forest: 0 },
      },
      {
        text: "你感觉到它在某处注视着你，但它不急",
        scores: { storm: 0, moon: 3, sun: 0, forest: 1 },
      },
      {
        text: "它会过来，不急不慢地蹭你，像是说「回来啦，真好」",
        scores: { storm: 0, moon: 1, sun: 3, forest: 0 },
      },
      {
        text: "好像什么都没变，但你发现它悄悄换了个离你更近的位置",
        scores: { storm: 0, moon: 0, sun: 0, forest: 3 },
      },
    ],
  },
  {
    emoji: "⚡",
    scene: "用一个词形容它的日常能量——",
    options: [
      {
        text: "永动机。感觉它体内有一个小发电站",
        scores: { storm: 3, moon: 0, sun: 1, forest: 0 },
      },
      {
        text: "潮汐。安静的时候很安静，来的时候挡不住",
        scores: { storm: 1, moon: 3, sun: 0, forest: 1 },
      },
      {
        text: "小太阳。在哪里都自带暖意和好心情",
        scores: { storm: 0, moon: 0, sun: 3, forest: 0 },
      },
      {
        text: "旁观者。它好像什么都看在眼里，但很少主动表态",
        scores: { storm: 0, moon: 1, sun: 0, forest: 3 },
      },
    ],
  },
  {
    emoji: "💤",
    scene: "夜深了，你和它之间的状态通常是——",
    options: [
      {
        text: "你想睡了但它不让你睡，总有新花样",
        scores: { storm: 3, moon: 0, sun: 1, forest: 0 },
      },
      {
        text: "它不知道什么时候来的，等你发现时它已经在你脚边了",
        scores: { storm: 0, moon: 3, sun: 0, forest: 1 },
      },
      {
        text: "它主动霸占你身上或旁边的位置，明确要你陪",
        scores: { storm: 0, moon: 0, sun: 3, forest: 0 },
      },
      {
        text: "你们各占一个角落，但这种距离感反而很舒服",
        scores: { storm: 0, moon: 0, sun: 0, forest: 3 },
      },
    ],
  },
  {
    emoji: "🤲",
    scene: "关于「撸猫」这件事——",
    options: [
      {
        text: "它喜欢玩但受不了被控制，摸两下就要咬你跑掉",
        scores: { storm: 3, moon: 0, sun: 0, forest: 1 },
      },
      {
        text: "需要等它来找你，它选择你的时刻才是真正的撸猫时间",
        scores: { storm: 0, moon: 3, sun: 0, forest: 1 },
      },
      {
        text: "基本来者不拒，翻肚皮就是它的待客之道",
        scores: { storm: 0, moon: 0, sun: 3, forest: 0 },
      },
      {
        text: "它允许你摸，但表情永远是「行吧，我给你个面子」",
        scores: { storm: 0, moon: 1, sun: 0, forest: 3 },
      },
    ],
  },
  {
    emoji: "💬",
    scene: "如果它会说人话，它最可能说的一句是——",
    options: [
      {
        text: "「你看我你看我！你为什么不看我！！」",
        scores: { storm: 3, moon: 0, sun: 1, forest: 0 },
      },
      {
        text: "「……你在就好。不用特地陪我。」",
        scores: { storm: 0, moon: 3, sun: 0, forest: 1 },
      },
      {
        text: "「嘿！今天又是很棒的一天呢！对吧对吧！」",
        scores: { storm: 0, moon: 0, sun: 3, forest: 0 },
      },
      {
        text: "「我没有在看你。……好吧我在。」",
        scores: { storm: 0, moon: 1, sun: 0, forest: 3 },
      },
    ],
  },
];

// ===== 计算人格结果 =====

export interface PersonalityResult {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  isPure: boolean;
}

export function calculatePersonality(
  answers: number[]
): PersonalityResult {
  const scores: Record<PersonalityType, number> = {
    storm: 0,
    moon: 0,
    sun: 0,
    forest: 0,
  };

  answers.forEach((optionIndex, scenarioIndex) => {
    const option = scenarios[scenarioIndex]?.options[optionIndex];
    if (option) {
      (Object.keys(option.scores) as PersonalityType[]).forEach((type) => {
        scores[type] += option.scores[type];
      });
    }
  });

  const sorted = (Object.entries(scores) as [PersonalityType, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const primary = sorted[0][0];
  const secondary = sorted[1][0];
  const gap = sorted[0][1] - sorted[1][1];
  const PURE_THRESHOLD = 3;

  return {
    primary,
    secondary: gap < PURE_THRESHOLD ? secondary : null,
    isPure: gap >= PURE_THRESHOLD,
  };
}

// ===== 主型+副型混合系统 =====

export const mixedLabels: Record<string, { display: string; desc: string }> = {
  "storm-moon": { display: "🌪️旋风·带一点🌙月光", desc: "闹够了就安静趴着，反差大得让人心软" },
  "storm-sun": { display: "🌪️旋风·带一点☀️阳光", desc: "一团会发光的小火球，到哪都是焦点" },
  "storm-forest": { display: "🌪️旋风·带一点🌿森林", desc: "疯起来拦不住，但观察力惊人" },
  "moon-storm": { display: "🌙月光·带一点🌪️旋风", desc: "平时安静，偶尔突然发疯" },
  "moon-sun": { display: "🌙月光·带一点☀️阳光", desc: "安静的温暖，像月光下的篝火" },
  "moon-forest": { display: "🌙月光·带一点🌿森林", desc: "沉默的观察者，内心是一片海" },
  "sun-storm": { display: "☀️阳光·带一点🌪️旋风", desc: "暖着暖着就炸了，但是甜的那种炸" },
  "sun-moon": { display: "☀️阳光·带一点🌙月光", desc: "大多数时候暖，但有自己的安静时刻" },
  "sun-forest": { display: "☀️阳光·带一点🌿森林", desc: "温暖但克制，笑起来眼睛会弯" },
  "forest-storm": { display: "🌿森林·带一点🌪️旋风", desc: "平时冷冷的，突然爆发你根本接不住" },
  "forest-moon": { display: "🌿森林·带一点🌙月光", desc: "高冷外表下藏着一颗柔软的心" },
  "forest-sun": { display: "🌿森林·带一点☀️阳光", desc: "嘴上不说但身体很诚实" },
};

// 副型「反差萌」时刻 —— 副型性格突然冒出来的瞬间，替换时间轴 Day 4
export const secondaryMoments: Record<PersonalityType, (catName: string) => TimelineEntry> = {
  storm: (cat) => ({
    day: 4,
    text: `今天不知道怎么了，${cat}突然在客厅狂奔三圈，撞翻了一个杯子。你还没反应过来它就跳上了柜子。……平时不这样的啊？`,
    emoji: "⚡",
  }),
  moon: (cat) => ({
    day: 4,
    text: `今天${cat}突然安静下来了。趴在窗台上看了很久的云。你走过去，它没躲。甚至往你手心蹭了蹭。`,
    emoji: "🌙",
  }),
  sun: (cat) => ({
    day: 4,
    text: `今天${cat}居然主动翻了个肚皮，冲你叫了一声。暖暖的。平时很少这样主动撒娇的。`,
    emoji: "☀️",
  }),
  forest: (cat) => ({
    day: 4,
    text: `今天${cat}一整天都在角落看着你。什么都没做。但你做什么它都在看。平时可没这么"关注"你。`,
    emoji: "🌿",
  }),
};

// ===== MBTI 影响层（16 型精细化）=====

// MBTI「关于你」时刻 —— 猫对 16 种人格主人的独立观察，替换时间轴 Day 5
// 4 种猫人格 × 16 种 MBTI = 64 条独立文案
export const mbtiMoments: Record<PersonalityType, Record<string, (catName: string) => TimelineEntry>> = {
  storm: {
    INFP: () => ({ day: 5, text: `你有时候会突然停下来，盯着什么都没有的地方微笑。我猜不到你在想什么。但那个世界一定很美——因为你笑的样子很温柔。`, emoji: "🫧" }),
    INFJ: () => ({ day: 5, text: `你今天帮朋友忙到自己都没吃饭！我冲到你面前叫了三声。你说"好好好我吃"。你需要一个像我这样的提醒闹钟！`, emoji: "⏰" }),
    INTP: () => ({ day: 5, text: `你盯着屏幕的时候嘴巴会微微张开。我伸爪子碰了你一下，你完全没反应。你那个脑子到底在装什么啊？一定很有趣！`, emoji: "🧠" }),
    INTJ: () => ({ day: 5, text: `你做什么事都有计划。几点吃饭、几点工作、几点休息。但你没计划到我会在你的键盘上躺下。计划不如变化！`, emoji: "⌨️" }),
    ISFP: () => ({ day: 5, text: `你今天在窗前站了好久，看夕阳。然后你回头看到我也在看你。你笑了。那个画面我也想收藏。`, emoji: "🌅" }),
    ISFJ: () => ({ day: 5, text: `你每天早上先给我换水再去刷牙。每天。从来没忘过。我不会说谢谢，但我每天早上在水碗旁等你——就是谢谢。`, emoji: "💧" }),
    ISTP: () => ({ day: 5, text: `你修东西的时候特别专注，手很稳。我在旁边看着你拧螺丝。差点伸爪子帮忙。算了你可能不需要。`, emoji: "🔧" }),
    ISTJ: () => ({ day: 5, text: `你的桌面永远很整齐。我试过把笔推歪一点。你立刻摆回去了。第二天我推歪两支。你全部摆回去。这个游戏好好玩。`, emoji: "🖊️" }),
    ENFP: () => ({ day: 5, text: `你今天跟我说了三个新想法！然后又说了两个！你的脑子是不是也跟我一样停不下来？我们是同类！`, emoji: "💡" }),
    ENFJ: () => ({ day: 5, text: `你给邻居送了饼干，回来跟我说"人家好像不太喜欢"。你在意每个人。但谁在意你？我在意！来，蹭一下！`, emoji: "🍪" }),
    ENTP: () => ({ day: 5, text: `你跟朋友辩论的时候特别兴奋。我在旁边听，听不懂。但你讲到激动手舞足蹈的样子，特别像我追逗猫棒。`, emoji: "🎯" }),
    ENTJ: () => ({ day: 5, text: `你开会的时候声音好大。我从房间那头都能听到你在发号施令。很厉害。但回到家你就是我的铲屎官，别忘了。`, emoji: "👔" }),
    ESFP: () => ({ day: 5, text: `你今天唱歌了！唱得好不好先不说，但你蹦蹦跳跳的样子我从柜子上看了全程。以后多唱。我喜欢看你开心。`, emoji: "🎤" }),
    ESFJ: () => ({ day: 5, text: `家里来客人了你忙前忙后。我在角落看着。客人走了你终于坐下来。我跳到你腿上——轮到我了。`, emoji: "🏠" }),
    ESTP: () => ({ day: 5, text: `你今天出门忘了两次东西，又折回来拿。第二次经过我的时候说"别笑我"。我没笑。好吧我笑了。`, emoji: "🚪" }),
    ESTJ: () => ({ day: 5, text: `你做清单的时候把我的喂食时间也写上了。"8:00 喂猫"。我很感动。虽然 7:45 我就已经在叫了。`, emoji: "📋" }),
  },
  moon: {
    INFP: () => ({ day: 5, text: `你写东西的时候会叹气。轻轻的那种，你自己都没注意到。但我听到了。所以我走过去，靠在你脚边。`, emoji: "✍️" }),
    INFJ: () => ({ day: 5, text: `你帮了别人一整天，回来的时候很安静。不是累的那种安静，是空了的那种。……我在。你可以什么都不做。`, emoji: "🫥" }),
    INTP: () => ({ day: 5, text: `你盯着天花板的时候在想什么？不用说。我知道那种"脑子停不下来"的感觉。……我也常常盯着什么都没有的地方。`, emoji: "🔭" }),
    INTJ: () => ({ day: 5, text: `你很少说"我不确定"。但昨天你对着镜子犹豫了一下。穿哪件。……第一件就很好。我看到了。`, emoji: "🪞" }),
    ISFP: () => ({ day: 5, text: `你在阳台上画了一会儿画。颜料蹭到了手指上，你没在意。……你沉浸在什么里的时候，最好看。`, emoji: "🎨" }),
    ISFJ: () => ({ day: 5, text: `你记得每个人的喜好。邻居不吃辣，同事对花生过敏。……但你忘了自己已经三天没吃水果了。`, emoji: "🍎" }),
    ISTP: () => ({ day: 5, text: `你修好了那个坏掉的抽屉。安安静静的，没告诉任何人。……我看到了。那是很温柔的事。`, emoji: "🔨" }),
    ISTJ: () => ({ day: 5, text: `你的生活很有节奏。几点做什么，井井有条。……在你的节奏里，我是唯一不受控的变量。你没有把我排除。`, emoji: "🕰️" }),
    ENFP: () => ({ day: 5, text: `你回来的时候在哼歌。什么歌不知道，反正你开心。……你开心的时候，连空气都亮了一点。`, emoji: "🎵" }),
    ENFJ: () => ({ day: 5, text: `你挂完电话之后叹了口气。又在操心别人了。……来这里。被照顾的人也需要被照顾。`, emoji: "📞" }),
    ENTP: () => ({ day: 5, text: `你说话很快，想法像烟花一样一个接一个。……但你偶尔安静下来的时候，眼神很深。那个时候的你，我最喜欢。`, emoji: "🎇" }),
    ENTJ: () => ({ day: 5, text: `你做事很果断。快、准、不犹豫。……但你抱我的时候，动作很轻。你知道怎么对待柔软的东西。`, emoji: "🤲" }),
    ESFP: () => ({ day: 5, text: `你刚才在客厅跳舞了。以为我没看到。我看到了。……跳得不怎么样。但笑得很好看。`, emoji: "💃" }),
    ESFJ: () => ({ day: 5, text: `你把家里布置得很温馨。每个角落都有你的心思。……包括我的窝旁边那盆植物。你是特意放的吧。`, emoji: "🪴" }),
    ESTP: () => ({ day: 5, text: `你做事不太想后果。先做了再说。……有时候我觉得你像一只猫。不，你比猫还冲动。`, emoji: "🏃" }),
    ESTJ: () => ({ day: 5, text: `你每天同一时间回家。钥匙声是固定的。……我在门口等你的时候，从来不用猜今天你会不会回来。那种确定感，很安心。`, emoji: "🔑" }),
  },
  sun: {
    INFP: () => ({ day: 5, text: `你看了一部电影，偷偷擦了眼泪。我假装没看到。但我跳上你膝盖窝着，多暖了一会儿。`, emoji: "🎬" }),
    INFJ: () => ({ day: 5, text: `你总是先想到别人。但今天你终于给自己买了一杯奶茶！我替你高兴！你也值得对自己好！`, emoji: "🧋" }),
    INTP: () => ({ day: 5, text: `你研究东西的时候特别认真，我在旁边打了三个滚你都没看我。没关系！你认真的样子也很好看！`, emoji: "🔬" }),
    INTJ: () => ({ day: 5, text: `你做了一个超详细的计划表。我看了一下，上面有"喂猫"两个字。写在最上面！我排第一名！`, emoji: "📊" }),
    ISFP: () => ({ day: 5, text: `你今天在画画！偷偷看了一眼——里面有我！虽然画得不太像但我很感动！给你打 100 分！`, emoji: "🖼️" }),
    ISFJ: () => ({ day: 5, text: `你每天准时给我换水。不是义务那种准时，是惦记着那种准时。我都知道的 ☀️`, emoji: "⏰" }),
    ISTP: () => ({ day: 5, text: `你修东西的时候不说话，很专注。修好了也不炫耀。嘿！我替你炫耀！你超厉害的好不好！`, emoji: "🔧" }),
    ISTJ: () => ({ day: 5, text: `你的袜子永远配对的。你的书按高矮排的。你给我的罐头也按口味轮换的。你真的好可爱 ☀️`, emoji: "🧦" }),
    ENFP: () => ({ day: 5, text: `你给朋友打电话说到我了！"它超可爱的！"嘿嘿。我知道。我听到了。全部听到了 ☀️`, emoji: "📱" }),
    ENFJ: () => ({ day: 5, text: `你帮朋友搬家累得不行，回来还先喂了我。你是世界上最好的人。不接受反驳 ☀️`, emoji: "📦" }),
    ENTP: () => ({ day: 5, text: `你又有新点子了！眼睛都亮了！我也亮了！虽然我听不懂但你激动我就激动！一起冲！`, emoji: "🚀" }),
    ENTJ: () => ({ day: 5, text: `你说今天要"搞定三件事"。结果第一件就是给我梳毛。我觉得你的优先级很正确 ☀️`, emoji: "✅" }),
    ESFP: () => ({ day: 5, text: `你今天在家蹦迪了！虽然就一首歌！但我跟你一起蹦了！好开心！明天继续！`, emoji: "🪩" }),
    ESFJ: () => ({ day: 5, text: `家里来客人了你做了一桌子菜。客人走了你开始收拾。我帮你暖着沙发！辛苦了！`, emoji: "🍲" }),
    ESTP: () => ({ day: 5, text: `你今天冲动买了一个猫爬架。太大了搬不进电梯，在楼梯间拆了包装。但我超喜欢！`, emoji: "🛒" }),
    ESTJ: () => ({ day: 5, text: `你的日历排得满满的。但周末空了一整天。你说"这天留给你"。我现在就开始期待了 ☀️`, emoji: "📅" }),
  },
  forest: {
    INFP: () => ({ day: 5, text: `你发呆的时候，我也在发呆。我们看着不同的方向。但安静的频率是一样的。`, emoji: "🧘" }),
    INFJ: () => ({ day: 5, text: `你什么都看得透。但从来不说。我也是。我们之间有种默契——都知道，都不说。`, emoji: "🤫" }),
    INTP: () => ({ day: 5, text: `你在 debug。我在你显示器后面看着你。你的表情从皱眉到恍然大悟用了 47 分钟。我全程观看了。`, emoji: "💻" }),
    INTJ: () => ({ day: 5, text: `你的计划里没有"发呆"这一项。但今天你对着窗户站了五分钟。我在角落看着。那五分钟比你计划里任何一项都重要。`, emoji: "🪟" }),
    ISFP: () => ({ day: 5, text: `你捡了一片落叶回来。别人觉得奇怪吧。我不觉得。我也会把有趣的东西叼回来。`, emoji: "🍂" }),
    ISFJ: () => ({ day: 5, text: `你照顾所有人。包括我。但你不知道我也在照顾你——每次你叹气我就走到你能看见的地方。算了你可能没注意到。`, emoji: "👁️" }),
    ISTP: () => ({ day: 5, text: `你修东西的时候不说话。我在旁边坐着也不说话。这个房间里两个安静的灵魂。很好。`, emoji: "🔇" }),
    ISTJ: () => ({ day: 5, text: `你有你的规矩，我有我的规矩。我们的规矩不一样。但我们尊重彼此的规矩。这就是共处。`, emoji: "🤝" }),
    ENFP: () => ({ day: 5, text: `你朋友走了之后，你瘫在沙发上叹了口气。社交很累吧。我跳上沙发的另一头。安静是我的礼物。`, emoji: "🛋️" }),
    ENFJ: () => ({ day: 5, text: `你总在照顾别人。但你回到家卸下来的那一刻——肩膀松了，表情松了——我看到了真正的你。真正的你，很累。`, emoji: "😮‍💨" }),
    ENTP: () => ({ day: 5, text: `你一天换了三个想法。我一天只做了一件事：在你旁边坐着。有时候最不变的东西，才是锚。`, emoji: "⚓" }),
    ENTJ: () => ({ day: 5, text: `你效率很高。我也是。你工作，我负责监督。我们是很好的合作关系。虽然你可能不这么觉得。`, emoji: "📈" }),
    ESFP: () => ({ day: 5, text: `你笑起来声音很大。我的耳朵会转一下。不是嫌吵。是在确认方向。你的快乐在哪，我就转向哪。`, emoji: "👂" }),
    ESFJ: () => ({ day: 5, text: `家里每样东西都有你摆的位置。但我的碗你每次都摆在同一个位置。……谢谢。`, emoji: "🫖" }),
    ESTP: () => ({ day: 5, text: `你做决定很快。我看了你三秒就跳下去了。我们都是行动派。区别是我落地比你优雅。`, emoji: "🐾" }),
    ESTJ: () => ({ day: 5, text: `你管理你的生活像管理一家公司。而我是你唯一管不了的员工。我觉得你暗自喜欢这一点。`, emoji: "😏" }),
  },
};

// MBTI 诗句开头 —— 16 型各一句「关于你」，加在灵光卡诗前
export const mbtiPoemOpener: Record<string, string> = {
  INFP: "你比自己以为的更温柔\n我从第一天就看出来了\n\n",
  INFJ: "你什么都看得透\n但从来不说\n我也是\n\n",
  INTP: "你忘了吃饭的时候\n我走到碗旁边坐着\n不是饿了\n是提醒你\n\n",
  INTJ: "你的计划表上\n没有「被一只猫打动」\n但你在这里了\n\n",
  ISFP: "你捡了一片落叶回来\n别人不懂\n我懂\n\n",
  ISFJ: "你每天做同样的事\n但那不是重复\n那是在说——我在乎\n\n",
  ISTP: "你修好东西的时候不说话\n你关心人的时候也不说话\n但手是暖的\n\n",
  ISTJ: "你是可以信赖的那种人\n我知道\n因为你的脚步声\n从来不会骗我\n\n",
  ENFP: "你的眼睛会亮\n像是什么好事要发生了\n每次看到你那样\n我就觉得——好事已经发生了\n\n",
  ENFJ: "你照顾所有人\n但谁来照顾你？\n我来\n用我的方式\n\n",
  ENTP: "你脑子转得比我尾巴还快\n但你停下来的时候\n眼神很安静\n我喜欢那个瞬间\n\n",
  ENTJ: "你说了算\n除了我的事\n我的事我说了算\n你居然接受了\n\n",
  ESFP: "你笑得很大声\n整个房子都在响\n但你不知道\n你笑的时候\n我的耳朵会转向你\n\n",
  ESFJ: "你把家布置得那么好\n是因为你希望每个人都舒服\n你不知道\n我最舒服的位置\n就是你旁边\n\n",
  ESTP: "你总是先做再想\n我也是\n我们都是从桌上跳下去之后\n才想起来桌子有多高\n\n",
  ESTJ: "你什么都安排好了\n清清楚楚\n但你没安排的那些时刻\n才是你最像自己的时候\n\n",
};

// 副型诗句尾声 —— 附加在灵光卡诗末，点出「反差」
export const secondaryCoda: Record<PersonalityType, string> = {
  storm: "\n\n但偶尔\n它会突然跑起来\n像在提醒你\n它的灵魂里还有一团火",
  moon: "\n\n但偶尔\n它会安静下来\n看着远处\n像在想一些你不知道的事",
  sun: "\n\n但偶尔\n它会突然蹭你一下\n暖暖的\n像藏了一颗小太阳",
  forest: "\n\n但偶尔\n它只是看着你\n什么都不说\n但你知道它都懂",
};
