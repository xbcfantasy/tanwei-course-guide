/* ============================================================
   问卷定义 v2：新生模式（方向后置）
   面向 26 级新生：大二春才确认方向，问卷先了解新生的
   学科兴趣 / 学业风格 / 负荷偏好 / 英语 / 通识拓展，
   输出「大一上选课计划书」；方向作为可选的进阶问题。
   ============================================================ */
"use strict";

/**
 * QUIZ 问题列表
 * type: single | multi
 * condition: (answers) => 该题是否显示（不填则总是显示）
 * optional: 可跳过的题（"下一步"在无选择时也可继续）
 */
const QUIZ = [
  {
    id: "awareness",
    title: "你现在了解探微书院的工科衔接方向吗？",
    desc: "方向是大二春季学期才确认的，不用着急。先告诉我你的了解程度，我好按需安排介绍。",
    type: "single",
    options: [
      { value: "none", title: "完全没概念", sub: "十个方向听起来都差不多（多数新生是这样，很正常）" },
      { value: "some", title: "知道大概", sub: "听说过化工、环境、生医这些名字，但不清楚差别" },
      { value: "prefer", title: "已经有模糊倾向", sub: "对某个方向比较感兴趣，想提前了解它的课程" },
    ],
  },
  {
    id: "interests",
    title: "你对哪些学科领域最有兴趣？（可多选）",
    desc: "这会影响我们推荐大一期间选修哪两门「方向导论课」，以及通识课怎么选。",
    type: "multi",
    options: [
      { value: "chem", title: "化学", sub: "分子、反应、材料合成" },
      { value: "bio", title: "生物/医药", sub: "细胞、基因、药物、人体" },
      { value: "env", title: "环境/可持续", sub: "水、大气、双碳、生态" },
      { value: "phys", title: "物理/工程", sub: "力热电、器件、工程设计" },
      { value: "ai", title: "编程/AI/数据", sub: "代码、机器学习、智能化" },
      { value: "all", title: "都想试试", sub: "兴趣广泛，还没找到最喜欢的" },
    ],
  },
  {
    id: "intro_courses",
    title: "大一要修 2 门方向导论课（四选二），你倾向选哪两门？",
    desc: "这四门 1 学分的导论课是「探微各方向的窗口」——选课相当于提前逛一圈，听听看哪个方向对味。选 2 门。",
    type: "multi",
    max: 2,
    options: [
      { value: "che_intro", title: "⚗️ 化学工程与高分子科学导论", sub: "通向：化工 / 高分子 / 智能化工", intro: "化学工程与高分子科学导论" },
      { value: "env_intro", title: "🌱 环境科学与工程前沿导论", sub: "通向：环境 / 给排水 / 环境AI / 数智水务", intro: "环境科学与工程前沿导论" },
      { value: "bme_intro", title: "🫀 生物医学工程专业导论", sub: "通向：生医工程 / 智能医学", intro: "生物医学工程专业导论" },
      { value: "pharma_intro", title: "💊 药学导论", sub: "通向：药学方向", intro: "药学导论" },
    ],
  },
  {
    id: "style",
    title: "你的学业风格更接近？",
    desc: "决定我们对学分负荷和课程搭配的建议。",
    type: "single",
    options: [
      { value: "competitive", title: "想冲高绩点", sub: "为保研/出国打基础，每门课都要认真对待" },
      { value: "steady", title: "稳扎稳打", sub: "按节奏来，保证学习质量也留出生活空间" },
      { value: "explore", title: "多留时间探索", sub: "想参加社团/社工/科研入门，别把课排太满" },
    ],
  },
  {
    id: "load",
    title: "第一学期你打算选多少学分？",
    desc: "探微大一上核心课约 20 学分（微积分 5 + 线性代数 4 + 化学原理 4 + 程序设计 2 + 思政 2 + 体育 1 + 英语 2），加上先导课与通识，新生每学期平均约 26 学分。量力而行。",
    type: "single",
    options: [
      { value: "light", title: "轻量一些（约 22 学分）", sub: "核心课 20 + 先导课 2 + 1 门通识，把硬课学扎实" },
      { value: "normal", title: "标准节奏（24-26 学分）", sub: "探微新生平均水平约 26 学分，1-2 门通识" },
      { value: "heavy", title: "多修一些（27+ 学分）", sub: "基础好可多修通识/提前探索" },
    ],
  },
  {
    id: "english",
    title: "英语方面的情况？",
    desc: "入学后会有英语分级考试，决定你的英语课组（C1/C2/B/A）。",
    type: "single",
    options: [
      { value: "c1", title: "基础一般，可能 C1/C2 组", sub: "英语综合训练为主" },
      { value: "ba", title: "还不错，可能 B/A 组", sub: "可考虑英文授课课程" },
      { value: "ok", title: "不介意英文课", sub: "能接受英文教材/全英文课程" },
      { value: "no", title: "偏好中文授课", sub: "尽量避开英文课程" },
    ],
  },
  {
    id: "foreign_interest",
    title: "外语选修课组（共 4 学分）你更倾向哪种？",
    desc: "一外英语学生除 4 学分综合能力必修外，还要从「第二外语 / 外国语言文化 / 外语专项提高」中修满 4 学分——你的倾向决定我们优先推荐哪类。",
    type: "single",
    options: [
      { value: "second", title: "🗣️ 学一门第二外语", sub: "西语/日语/法语/德语等，从零开始系统学（通常 2-4 学分/门，可连修）" },
      { value: "improve", title: "📈 英语进阶/学术方向", sub: "科技英语视听说、口译入门、学术英语——对出国/深造有帮助" },
      { value: "culture", title: "🌍 外国语言文化", sub: "西方文化基础、语言文化类，2 学分灵活，开阔视野" },
      { value: "open", title: "不局限，看口碑选", sub: "到时候按课程评价和课容量挑，先看看三类都有什么" },
    ],
  },
  {
    id: "foreign_lang_pick",
    title: "（接上题）想学哪门第二外语？",
    desc: "不同语种的开课连续性、抢课热度差别不小，选一个倾向，我们优先推荐对应语种的系列课程（也可不局限）。",
    type: "single",
    condition: (a) => (a.foreign_interest || []).includes("second"),
    options: [
      { value: "es", title: "🇪🇸 西班牙语", sub: "开设最全、最热门的二外之一，口语实用性高" },
      { value: "ja", title: "🇯🇵 日语", sub: "人气很高，ACG 文化加持，入门门槛相对友好" },
      { value: "fr", title: "🇫🇷 法语", sub: "优雅的语言，适合对欧洲文化感兴趣" },
      { value: "de", title: "🇩🇪 德语", sub: "工科/哲学语境重要，对德国学术圈有帮助" },
      { value: "ko", title: "🇰🇷 韩语", sub: "韩流文化热度高，近年开课稳定" },
      { value: "it", title: "🇮🇹 意大利语", sub: "艺术/音乐语境，相对小众但开设稳定" },
      { value: "other", title: "其他 / 还没想好", sub: "看哪门课开课、口碑好再定" },
    ],
  },
  {
    id: "extra",
    title: "通识选修课（四大课组，每课组至少 2 学分）想先从哪类开始？",
    desc: "通识选修共 11 学分，分散在四年完成。大一上选 1-2 门即可，这里决定先推荐哪类高分课。",
    type: "multi",
    max: 2,
    options: [
      { value: "science", title: "科技前沿（科学课组）", sub: "AI、能源、新材料——适合理工科拓展" },
      { value: "humanity", title: "人文历史（人文课组）", sub: "文学、历史、哲学、艺术史" },
      { value: "social", title: "社科经济（社科课组）", sub: "经济、管理、社会学、心理" },
      { value: "art", title: "艺术审美（艺术课组）", sub: "音乐、美术、电影、戏剧" },
      { value: "ethic", title: "伦理类课程", sub: "建议探微学生选 1 门工程/科学伦理（通识要求建议）" },
    ],
  },
  {
    id: "direction",
    title: "（可选）你倾向的方向是？",
    desc: "大二春才正式确认，现在只是提前预览。不确定就直接跳过这题。",
    type: "single",
    condition: (a) => (a.awareness || []).includes("prefer"),
    optional: true,
    options: [
      { value: "che", title: "化学工程与工业生物工程", sub: "化工原理·反应工程·工艺设计" },
      { value: "polymer", title: "高分子材料与工程", sub: "高分子化学/物理·成型加工" },
      { value: "env", title: "环境工程", sub: "水·大气·固废处理" },
      { value: "water", title: "给排水科学与工程", sub: "城市水系统·饮用水" },
      { value: "bme", title: "生物医学工程", sub: "医学影像·神经工程" },
      { value: "smart_chem", title: "交叉工程·智能化工", sub: "化工+AI" },
      { value: "env_ai", title: "交叉工程·环境AI", sub: "环境+AI" },
      { value: "water_digital", title: "交叉工程·数智水务", sub: "水务+AI" },
      { value: "smart_med", title: "交叉工程·智能医学", sub: "医学+AI" },
      { value: "pharmacy", title: "药学方向（单学位）", sub: "药物化学·药理" },
      { value: "skip", title: "先跳过，我再想想", sub: "大二春之前都可以慢慢了解" },
    ],
  },
];

/** 可见问题列表（按 condition 过滤） */
function visibleQuestions(answers) {
  return QUIZ.filter(q => !q.condition || q.condition(answers));
}

/** 方向 → 对应的导论课与方向域说明 */
const DIRECTION_INTRO = {
  che: { intro: "化学工程与高分子科学导论", note: "通向化工/高分子/智能化工", icon: "⚗️" },
  polymer: { intro: "化学工程与高分子科学导论", note: "通向高分子/化工", icon: "🧪" },
  env: { intro: "环境科学与工程前沿导论", note: "通向环境工程/环境AI", icon: "🌱" },
  water: { intro: "环境科学与工程前沿导论", note: "通向给排水/数智水务", icon: "💧" },
  bme: { intro: "生物医学工程专业导论", note: "通向生医工程/智能医学", icon: "🫀" },
  smart_chem: { intro: "化学工程与高分子科学导论", note: "智能化工根植于化工", icon: "🤖" },
  env_ai: { intro: "环境科学与工程前沿导论", note: "环境AI根植于环境", icon: "🌍" },
  water_digital: { intro: "环境科学与工程前沿导论", note: "数智水务根植于环境/给排水", icon: "🌊" },
  smart_med: { intro: "生物医学工程专业导论", note: "智能医学根植于生医", icon: "🧠" },
  pharmacy: { intro: "药学导论", note: "药学方向", icon: "💊" },
};

/** 兴趣标签 → 推荐先导课 */
const INTEREST_INTRO = {
  chem: ["化学工程与高分子科学导论", "药学导论"],
  bio: ["生物医学工程专业导论", "药学导论"],
  env: ["环境科学与工程前沿导论"],
  phys: ["化学工程与高分子科学导论", "生物医学工程专业导论"],
  ai: ["环境科学与工程前沿导论", "化学工程与高分子科学导论"],
};

/** 方向模块标签（限选模块兴趣打分，供方向预览用） */
const DIRECTION_MODULE_TAGS = {
  che: { "生物医药模块": ["bio", "chem"], "能源材料模块": ["phys", "chem"], "人工智能与智慧化工模块": ["ai"], "先进高分子模块": ["chem"], "绿色资源模块": ["env"], "通识模块": [] },
  polymer: { "先进高分子模块": ["chem"], "生物医药模块": ["bio"], "能源材料模块": ["phys"], "人工智能与智慧化工模块": ["ai"], "绿色资源模块": ["env"], "通识模块": [] },
  env: { "介质类限选专业课（至少选2门）": ["env"], "环境人工智能": ["ai", "env"], "环境科学与技术": ["chem"], "环境工程与设计": ["phys"], "环境管理与规划": ["env"], "环境实践与决策": ["phys"], "全球胜任力": ["env"], "海外交流": [] },
  water: { "给排水方向核心课": ["env"], "环境人工智能": ["ai"], "科学与技术": ["chem"], "工程与设计": ["phys"], "管理与规划": ["env"], "实践与决策": ["phys"], "全球胜任力": [] },
  bme: { "微纳医学课组（三选一）": ["bio", "phys"], "神经工程课组（三选一）": ["bio", "ai"], "医学影像课组（三选一）": ["bio", "ai", "phys"] },
  smart_chem: { "计算机与智能科学子模块": ["ai"], "化学工程与高分子子模块（至少4学分）": ["chem", "phys"], "智能化工进阶实验子模块（至少2学分）": ["chem", "phys"] },
  env_ai: { "介质类专业课（7学分，至少两门）": ["env"], "环境人工智能（10学分）": ["ai", "env"] },
  water_digital: { "给排水方向核心课（5学分）": ["env"], "环境人工智能（10学分）": ["ai", "env"] },
  smart_med: { "微纳医学课组（三选一）": ["bio"], "神经工程课组（三选一）": ["bio", "ai"], "医学影像课组（三选一）": ["bio", "ai"] },
  pharmacy: { "限选（11学分，至少选3门课）": ["bio", "chem"], "任选课组": ["bio"] },
};

/** 通识任选 → 类别映射 */
const LIBERAL_GROUP_MAP = {
  "通识选修-人文": "humanity",
  "通识-日新/社科": "humanity",
  "通识选修-社科": "social",
  "通识选修-艺术": "art",
  "通识选修-科学": "science",
  "通识选修": "science",
};
