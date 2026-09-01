/* ============================================================
   问卷定义：询问用户喜好
   ============================================================ */
"use strict";

const QUIZ = [
  {
    id: "direction",
    title: "你最想选择的工科衔接方向是？",
    desc: "大二春季学期确认方向，选课将按此方向为你规划。也可先选“还没想好”，看看基础课怎么选。",
    type: "single",
    options: [
      { value: "che", title: "化学工程与工业生物工程", sub: "化工原理·反应工程·工艺设计（双学位，专业必修36+限选11学分）" },
      { value: "polymer", title: "高分子材料与工程", sub: "高分子化学/物理·聚合物成型加工（双学位，专业必修37+限选10学分）" },
      { value: "env", title: "环境工程", sub: "水·大气·固废处理工程（双学位，专业必修25+限选22学分）" },
      { value: "water", title: "给排水科学与工程", sub: "城市水系统·饮用水处理（双学位，专业必修37+限选10学分）" },
      { value: "bme", title: "生物医学工程", sub: "医学影像·神经工程·微纳医学（双学位，专业必修38+限选9学分）" },
      { value: "smart_chem", title: "交叉工程·智能化工", sub: "化工+AI：机器学习·智能化工（双学位，总学分160）" },
      { value: "env_ai", title: "交叉工程·环境人工智能", sub: "环境+AI：数据·模型·智慧环境（双学位）" },
      { value: "water_digital", title: "交叉工程·数智水务", sub: "水务+AI：智慧水务·智能控制（双学位）" },
      { value: "smart_med", title: "交叉工程·智能医学工程", sub: "医学+AI：影像·神经·生物信息（双学位）" },
      { value: "pharmacy", title: "药学方向（单学位）", sub: "药物化学·药剂·药理（单学位，总学分146，专业限选至少3门）" },
      { value: "undecided", title: "还没想好", sub: "先帮你规划书院基础必修与通识课程" },
    ],
  },
  {
    id: "style",
    title: "你更喜欢哪种学习/工作方式？（可多选）",
    desc: "这会影响限选模块和任选课程的方向推荐。",
    type: "multi",
    options: [
      { value: "theory", title: "理论推导与计算", sub: "物理化学、数学建模、仿真模拟" },
      { value: "lab", title: "实验动手操作", sub: "化学/生物/化工实验、仪器分析" },
      { value: "engineering", title: "工程设计与实践", sub: "工艺设计、设备设计、工程实践" },
      { value: "ai", title: "编程与人工智能", sub: "机器学习、数据分析、AI交叉应用" },
      { value: "biomed", title: "生物医药", sub: "分子生物学、药学、医学工程" },
      { value: "sustain", title: "环境与可持续发展", sub: "水处理、双碳、环境治理" },
    ],
  },
  {
    id: "course_priority",
    title: "选课时你最看重什么？（可多选，最多3项）",
    desc: "决定推荐排序时的权重。",
    type: "multi",
    max: 3,
    options: [
      { value: "grade", title: "给分友好", sub: "绩点友好，避免拉低 GPA" },
      { value: "light", title: "作业少、负担轻", sub: "留出时间做科研/社工/实习" },
      { value: "fun", title: "内容有趣", sub: "上课体验好、有意思" },
      { value: "teacher", title: "老师口碑好", sub: "讲得好、负责任" },
      { value: "rigorous", title: "严格但干货多", sub: "学得扎实，为科研/深造打基础" },
    ],
  },
  {
    id: "load",
    title: "你每学期的学分负荷打算？",
    desc: "影响推荐的学分规划建议。",
    type: "single",
    options: [
      { value: "light", title: "轻松模式", sub: "每学期约 16-19 学分，多留时间给课外" },
      { value: "normal", title: "标准模式（推荐）", sub: "每学期约 20-23 学分，四年稳扎稳打" },
      { value: "heavy", title: "学霸模式", sub: "每学期 24+ 学分，提前修完多修任选" },
    ],
  },
  {
    id: "plan",
    title: "你未来的规划更偏向？",
    desc: "影响科研训练、实践类课程与任选方向的建议。",
    type: "single",
    options: [
      { value: "grad", title: "保研/深造（科研导向）", sub: "重视科研训练、高阶课程与导师推荐" },
      { value: "abroad", title: "出国深造", sub: "重视 GPA、英文课程与国际视野" },
      { value: "work", title: "就业/创业", sub: "重视工程实践、项目经历与行业方向" },
      { value: "undecided", title: "还没想好", sub: "先保持 GPA 与方向弹性" },
    ],
  },
  {
    id: "english",
    title: "你能接受英文授课的课程吗？",
    desc: "部分专业必修与通识课程有英文版可选。",
    type: "single",
    options: [
      { value: "ok", title: "完全可以", sub: "英文课不影响学习效果，甚至想练英语" },
      { value: "some", title: "少量可以", sub: "个别核心课可接受英文版" },
      { value: "no", title: "偏好中文", sub: "尽量选中文授课，避免英文课程" },
    ],
  },
  {
    id: "extra",
    title: "除了培养方案内的课程，还想拓展哪些方向？",
    desc: "用于推荐通识任选课（每课组至少2学分）。",
    type: "multi",
    max: 3,
    options: [
      { value: "humanity", title: "人文与历史", sub: "文学、历史、哲学、艺术史" },
      { value: "social", title: "社科与经济", sub: "经济、管理、社会学、心理" },
      { value: "art", title: "艺术与审美", sub: "音乐、美术、电影、戏剧" },
      { value: "science", title: "科技前沿", sub: "AI、能源、新材料、脑科学" },
      { value: "none", title: "不拓展", sub: "按培养方案最低要求来" },
    ],
  },
];

/** 每个方向的关键词 → 用于限选模块兴趣打分 */
const DIRECTION_MODULE_TAGS = {
  che: { "生物医药模块": ["biomed", "lab"], "能源材料模块": ["theory", "engineering", "sustain"], "人工智能与智慧化工模块": ["ai", "theory"], "先进高分子模块": ["lab", "engineering"], "绿色资源模块": ["sustain", "engineering"], "通识模块": ["engineering"] },
  polymer: { "先进高分子模块": ["lab", "engineering"], "生物医药模块": ["biomed"], "能源材料模块": ["theory"], "人工智能与智慧化工模块": ["ai"], "绿色资源模块": ["sustain"], "通识模块": [] },
  env: { "介质类限选专业课（至少选2门）": ["sustain", "engineering"], "环境人工智能": ["ai", "sustain"], "环境科学与技术": ["theory", "lab"], "环境工程与设计": ["engineering"], "环境管理与规划": ["theory", "sustain"], "环境实践与决策": ["engineering"], "全球胜任力": ["sustain"], "海外交流": [] },
  water: { "给排水方向核心课": ["sustain", "engineering"], "环境人工智能": ["ai"], "科学与技术": ["theory"], "工程与设计": ["engineering"], "管理与规划": ["theory"], "实践与决策": ["engineering"], "全球胜任力": [] },
  bme: { "微纳医学课组（三选一）": ["biomed", "lab"], "神经工程课组（三选一）": ["biomed", "ai", "theory"], "医学影像课组（三选一）": ["biomed", "ai", "theory"] },
  smart_chem: { "计算机与智能科学子模块": ["ai", "theory"], "化学工程与高分子子模块（至少4学分）": ["engineering", "lab"], "智能化工进阶实验子模块（至少2学分）": ["lab", "engineering"] },
  env_ai: { "介质类专业课（7学分，至少两门）": ["sustain", "engineering"], "环境人工智能（10学分）": ["ai", "sustain"] },
  water_digital: { "给排水方向核心课（5学分）": ["sustain", "engineering"], "环境人工智能（10学分）": ["ai", "sustain"] },
  smart_med: { "微纳医学课组（三选一）": ["biomed", "lab"], "神经工程课组（三选一）": ["biomed", "ai"], "医学影像课组（三选一）": ["biomed", "ai"] },
  pharmacy: { "限选（11学分，至少选3门课）": ["biomed", "lab"], "任选课组": ["biomed", "theory"] },
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
