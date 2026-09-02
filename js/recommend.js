/* ============================================================
   推荐引擎 v2：新生模式
   输出「大一上选课计划书」：
   ① 大一上核心必选清单（推断版，标注供参考）
   ② 学分预算建议（按负荷偏好）
   ③ 先导课（方向导论）推荐——直接按用户四选二的答案
   ④ 通识选修推荐（按兴趣 + 高分评价）
   ⑤ 方向提前预览（可选：用户有倾向时）
   ============================================================ */
"use strict";

/* 答案解包助手：问卷答案统一存为数组（单选为单元素数组） */
const one = (ans, k) => { const v = ans[k]; return Array.isArray(v) ? v[0] : v; };
const many = (ans, k) => { const v = ans[k]; return Array.isArray(v) ? v : (v ? [v] : []); };

/* ---------- 大一上核心必选清单（推断参考版） ----------
   依据：2026级培养方案 + 清华理工科第一学期常规安排。
   标注「供参考」：以入学后教务系统与书院通知为准。
   eval 字段由运行时从站点数据按课程名/编号补齐。
   intro 字段为该课程的一段简介（人工编写）。 */
const FRESHMAN_FALL_CORE = [
  { id: "10421055", name: "微积分A(1)", credit: 5, note: "数学必修·第一学期核心课，学分最重，务必跟上节奏", intro: "一元函数微积分：极限、导数、积分及应用。理工科一切课程的数学地基，作业量大但收获最大的一门课，期中期末为主。", attr: "必修", scope: "definite" },
  { id: "10440144", name: "化学原理", credit: 4, note: "探微核心基础课·为后续有机/物化打底", intro: "无机化学与化学基本原理（原子结构、化学键、化学热力学与动力学入门），帮你把高中化学衔接成大学化学的思维，化学系授课。", attr: "必修", scope: "definite" },
  { id: "", name: "计算机程序设计基础（三选一）", credit: 2, note: "三选一：计算机程序设计基础 / 信息科学理论与实践 / Python版", intro: "第一门编程入门课，可选 C 语言、Python 或信息科学方向版本；大二 AI 相关课程与科研都要用到编程，值得认真打底。", attr: "必修", scope: "definite" },
  { id: "", name: "大学生思想文化素养", credit: 2, note: "思政必修·培养方案标注大一秋", intro: "思想政治理论课，课堂讲授与研讨/实践结合，主要考核为平时分+期末论文或报告。", attr: "必修", scope: "definite" },
  { id: "", name: "体育(1)", credit: 1, note: "第1-4学期体育必修，毕业须过游泳测试", intro: "体育必修课，学期初自选项目（游泳/球类/健身等），每周一次课；毕业前须通过游泳测试，可在大一体育课上练习。", attr: "必修", scope: "definite" },
  { id: "", name: "英语分级课", credit: 2, note: "按入学分级考试分到 C1/C2/B/A 课组，学期内完成对应级别", intro: "按入学分级考试定级：C1/C2 组为英语综合训练，B/A 组为阅读写作+听说交流分项训练，每周 2-4 学时。", attr: "必修", scope: "definite" },
  { id: "10421324", name: "线性代数", credit: 4, note: "数学必修·若本学期未开则顺延，以教务安排为准", intro: "矩阵、线性空间、线性变换与特征值——现代 AI/机器学习/数据分析的数学语言，和微积分同等重要的基础课。", attr: "必修", scope: "maybe" },
  { id: "10430484", name: "大学物理(1)", credit: 4, note: "三选一（大学物理B(1)/大学物理(1)/英文版）·开课学期以教学计划为准", intro: "力学与热学为主（含振动与波），理工科第二门硬课；分大学物理B/大学物理/英文版三档，探微学生可选物理B（与化学工程衔接更顺）。", attr: "必修", scope: "maybe" },
];

/** 先导课四选二：选项 value → {课程名, 编号, 方向说明} */
const INTRO_COURSES = {
  che_intro: { id: "30340451", name: "化学工程与高分子科学导论", leads: ["化学工程与工业生物工程", "高分子材料与工程", "智能化工"], icon: "⚗️", intro: "化工与高分子学科全景导论：过程工业、反应工程、材料合成与成型概览，各系教授轮讲，1 学分讲座式，是了解「化工/高分子/智能化工」的窗口。" },
  env_intro: { id: "30050411", name: "环境科学与工程前沿导论", leads: ["环境工程", "给排水科学与工程", "环境人工智能", "数智水务"], icon: "🌱", intro: "水、大气、固废、土壤等环境问题与治理技术前沿，环境学院教授轮讲，1 学分讲座式，通向「环境/给排水/环境AI/数智水务」。" },
  bme_intro: { id: "34000271", name: "生物医学工程专业导论", leads: ["生物医学工程", "智能医学工程"], icon: "🫀", intro: "医学成像、神经工程、生物材料与智能诊疗等生医交叉领域导论，1 学分讲座式，通向「生医工程/智能医学」。" },
  pharma_intro: { id: "44000061", name: "药学导论", leads: ["药学方向"], icon: "💊", intro: "药物研发全链条入门：从靶点发现、候选分子到药代动力学与临床，1 学分讲座式，是药学方向（单学位）的首选窗口。" },
};

/** 通识伦理类关键词 */
const ETHIC_KEYWORDS = ["伦理", "工程伦理", "科学伦理", "人工智能伦理", "生命伦理", "科技伦理"];

/* ============================================================
   主入口：新生计划生成
   ============================================================ */
function generateFreshmanPlan(answers) {
  const data = SITE_DATA;

  // ---------- ① 大一上核心必选 ----------
  const fallCore = FRESHMAN_FALL_CORE.map(c => {
    const ev = findEval(c);
    return { ...c, eval: ev, _attr: c.attr };
  });
  const definite = fallCore.filter(c => c.scope === "definite");
  const maybe = fallCore.filter(c => c.scope === "maybe");
  const definiteCredit = definite.reduce((s, c) => s + c.credit, 0);
  const maybeCredit = maybe.reduce((s, c) => s + c.credit, 0);

  // ---------- ② 学分预算 ----------
  const loadAdvice = loadAdviceFor(answers, definiteCredit, maybeCredit);

  // ---------- ③ 先导课（用户四选二直接答案） ----------
  const chosenIntro = many(answers, "intro_courses").map(v => INTRO_COURSES[v]).filter(Boolean);
  const introWithEval = chosenIntro.map(ic => ({ ...ic, eval: findEvalByName(ic.name) }));
  const allIntro = Object.values(INTRO_COURSES).map(ic => ({ ...ic, eval: findEvalByName(ic.name) }));

  // ---------- ④ 通识推荐 ----------
  const liberal = buildLiberalRecs(answers, data);

  // ---------- ⑤ 方向预览（可选） ----------
  const direction = one(answers, "direction");
  let preview = null;
  if (direction && direction !== "skip" && data.pyfa.majors[direction]) {
    preview = buildDirectionPreview(data.pyfa.majors[direction], direction, answers);
  }

  // ---------- ⑥ 外语规划（清华外语要求 + 建议） ----------
  const foreignLang = buildForeignLang(answers, data);

  // ---------- ⑦ 学业风格/方向意识提示 ----------
  const styleTips = styleTipsFor(answers);

  return {
    fallCore: { definite, maybe, definiteCredit, maybeCredit },
    loadAdvice,
    introCourses: { chosen: introWithEval, all: allIntro },
    liberal,
    foreignLang,
    directionPreview: preview,
    styleTips,
  };
}

/* ---------- 外语规划 ----------
   清华要求（一外英语学生）：外语共 8 学分
   = ① 英语综合能力课组 必修 4 学分（按入学分级考试定级别）
   + ② 「第二外语 / 外国语言文化 / 外语专项提高」课组 选修 4 学分
   一外小语种学生共 6 学分；国际学生共 8 学分。 */
function buildForeignLang(answers, data) {
  const english = one(answers, "english") || "c1";
  const style = one(answers, "style") || "steady";
  const fi = one(answers, "foreign_interest") || "open";

  // ① 必修课组建议（按分级）
  const levelMap = {
    c1: { label: "入学分级 1-2 级", courses: "英语综合训练（C1/C2）", note: "听说读写综合训练为主，先打牢基础" },
    ba: { label: "入学分级 2-4 级", courses: "英语阅读写作 / 英语听说交流（B/A）", note: "B 级开始分项训练，A 级可衔接高阶与选修课组" },
  };
  const level = (english === "c1") ? levelMap.c1 : levelMap.ba;

  // ② 选修课组推荐：从「英语限选课组」中按类别推荐高分课
  const engCourses = (data.zhjwxk.courses || []).filter(c => c.group === "英语限选课组");
  const categorize = (c) => {
    const n = c.name;
    if (/第二外国语|西班牙语|意大利语|日语|德语|法语|韩国语|韩语|阿拉伯语|俄语/.test(n)) return "second";
    if (/文化|经典|文学|艺术|电影|音乐|社会/.test(n)) return "culture";
    if (/视听说|口译|笔译|学术英语|进阶|演讲|写作|应用/.test(n)) return "improve";
    return "other";
  };
  const recScore = (c) => {
    const ev = c.eval;
    if (!ev || !ev.count) return 0.2;
    let s = ev.avg + Math.min(ev.count, 10) * 0.05;
    if (c.credit <= 2) s += 0.1; // 2 学分课程时间成本低
    if (style === "competitive") s += 0.1;
    return s;
  };

  const buckets = { second: [], culture: [], improve: [] };
  engCourses.forEach(c => {
    const cat = categorize(c);
    if (buckets[cat] === undefined) return;
    c._cat = cat;
    c._score = recScore(c);
    buckets[cat].push(c);
  });
  Object.values(buckets).forEach(arr => arr.sort((a, b) => (b._score || 0) - (a._score || 0)));

  const tips = [];
  if (english === "ba") tips.push("你在 B/A 级：综合能力课完成后即可选择英语限选课组，想出国建议优先「外语专项提高」（学术英语/口译方向）。");
  if (english === "c1") tips.push("你在 C1/C2 级：第一学期先完成英语综合训练，打好听说读写基础，选修课组可留到后续学期。");
  if (english === "no") tips.push("偏中文授课不影响外语学分要求——外语课组内的课程本身也以中文讲授为主，可选文化类课程兼顾兴趣。");
  if (english === "ok") tips.push("不介意英文授课：可以早点衔接「外语专项提高」课组，全英文课堂也是练习场。");
  if (fi === "second") tips.push("二外通常从（1）开始按学期连修（如西班牙语（1）（2）…），建议入学后尽早选课占位；日语/西班牙语最热门，竞争较激烈。");
  if (fi === "improve") tips.push("「外语专项提高」多面向高年级/出国党，若你仍是大一，可先修 1 门视听说类适应，学术英语留到大二更从容。");
  if (fi === "culture") tips.push("文化类课程 2 学分/门最灵活，可与其他类搭配；有些课（如西方文化基础）口碑很好但抢课激烈，留意选课时间。");

  // 按倾向调整三类展示数量（倾向类展示更多）
  const preferred = fi === "second" ? "second" : fi === "improve" ? "improve" : fi === "culture" ? "culture" : null;
  const BUCKET_INTRO = {
    second: "从零系统学一门新语言（西班牙语/日语/法语/德语/韩语/意大利语等），2-4 学分/门，按学期连修（(1)→(2)→(3)→(4)）。适合想真正掌握一门新语言、或计划去非英语国家交流的同学；⚠️ 一旦开始建议坚持连修。",
    culture: "用语言讲文化（西方文化基础、语言文化类），2 学分/门、单门灵活。适合想开阔文化视野、还没想好是否投入一门新语言、或需要灵活搭配学分的同学。",
    improve: "英语应用进阶（科技英语视听说、口译入门、英语进阶读写、走近公众演说、学术英语等），2 学分/门。适合英语基础较好、计划出国深造或参与国际学术交流的同学。",
  };
  const mkBucket = (key, title) => {
    const n = fi === "open" ? 6 : (key === preferred ? 8 : 3);
    return { title, desc: BUCKET_INTRO[key], items: buckets[key].slice(0, n), highlighted: key === preferred };
  };

  return {
    requirement: "一外英语学生：外语共 8 学分 = ①英语综合能力必修 4 学分 + ②第二外语/外国语言文化/外语专项提高选修 4 学分",
    levelLabel: level.label,
    levelCourses: level.courses,
    levelNote: level.note,
    preferenceLabel: fi === "second" ? "你的倾向：第二外语" : fi === "improve" ? "你的倾向：英语进阶/学术" : fi === "culture" ? "你的倾向：外国语言文化" : "你的倾向：不局限，看口碑",
    buckets: {
      second: mkBucket("second", "第二外语（系统学一门新语言）"),
      culture: mkBucket("culture", "外国语言文化（文化视野，2 学分灵活）"),
      improve: mkBucket("improve", "外语专项提高（英语进阶/学术英语）"),
    },
    tips,
  };
}

/* ---------- 在站点数据中按编号/名称找评价 ---------- */
function findEval(c) {
  if (c.id) {
    const hit = SITE_DATA.zhjwxk.courses.find(x => x.id === c.id && x.eval && x.eval.count);
    if (hit) return hit.eval;
  }
  return findEvalByName(c.name.replace(/（三选一）.*$/, ""));
}
function findEvalByName(name) {
  const hit = SITE_DATA.zhjwxk.courses.find(x => x.name === name && x.eval && x.eval.count);
  if (hit) return hit.eval;
  const hit2 = SITE_DATA.zhjwxk.courses.find(x => x.name.indexOf(name.slice(0, 6)) >= 0 && x.eval && x.eval.count);
  return hit2 ? hit2.eval : null;
}

/* ---------- 学分预算建议 ---------- */
function loadAdviceFor(answers, definiteCredit, maybeCredit) {
  const load = one(answers, "load") || "normal";
  const style = one(answers, "style") || "steady";
  const map = {
    light: { label: "少而精（17 学分左右）", total: 17, note: "把微积分、化学原理这两门最重的课学扎实，余力探索大学生活。" },
    normal: { label: "标准（19-20 学分）", total: 19.5, note: "核心课 + 先导课 + 1-2 门通识，节奏均衡。" },
    heavy: { label: "多修一些（21+ 学分）", total: 21.5, note: "基础扎实可加选通识/旁听方向课，注意别挤占主课时间。" },
  };
  const m = map[load] || map.normal;
  const styleNote = {
    competitive: "想冲绩点：把每门核心课当主战场，预习+作业+答疑闭环；通识选轻松高分款，把精力留给主课。",
    steady: "稳扎稳打：保证核心课质量，通识每周占用控制在 6 小时以内即可。",
    explore: "想多探索：核心课外只加 1 门通识，把时间留给社团/社工/科研宣讲。",
  }[style] || "";
  const room = Math.max(0, Math.round((m.total - definiteCredit) * 10) / 10);
  const topUp = m.total > definiteCredit
    ? `核心课已占约 ${definiteCredit} 学分，还剩约 ${room} 学分自由安排——优先 2 学分先导课，其余给通识。`
    : `核心课约 ${definiteCredit} 学分已接近预算，通识课量力而行，先导课（2 学分）务必安排。`;

  return { label: m.label, total: m.total, note: m.note, styleNote, topUp };
}

/* ---------- 通识推荐 ---------- */
function buildLiberalRecs(answers, data) {
  const extra = many(answers, "extra");
  const style = one(answers, "style") || "steady";
  const out = [];
  const zhjwxk = data.zhjwxk;
  const libGroups = {};
  (zhjwxk.courses || []).forEach(c => {
    const cat = LIBERAL_GROUP_MAP[c.group];
    if (!cat || c.attr === "必修") return;
    (libGroups[cat] = libGroups[cat] || []).push(c);
  });

  /** 推荐分：评分 + 评价数信任加成 + 课时成本 + 学业风格 */
  const recScore = (c) => {
    const ev = c.eval;
    if (!ev || !ev.count) return 0.2; // 无评价：给基础分，排在后面但仍可见
    let s = ev.avg;
    s += Math.min(ev.count, 15) * 0.04;      // 评价数越多越可信
    if (c.credit && c.credit <= 2) s += 0.15; // 1-2 学分小课时间成本低
    if (style === "competitive") s += 0.15;   // 冲绩点更看重口碑
    if (style === "explore") s += 0.05;
    return s;
  };

  const catMap = { science: "science", humanity: "humanity", social: "social", art: "art" };
  const catNames = { science: "科学课组", humanity: "人文课组", social: "社科课组", art: "艺术课组" };

  // 用户选的类别 → 每组给 12 门，按推荐分排序
  extra.filter(e => catMap[e]).forEach(e => {
    const list = (libGroups[e] || []).slice();
    list.forEach(c => { c._score = recScore(c); });
    list.sort((a, b) => (b._score || 0) - (a._score || 0));
    const items = list.slice(0, 12);
    if (items.length) out.push({
      group: `通识选修·${catNames[e]}`,
      credit: "每课组至少 2 学分",
      total: libGroups[e].length,
      items,
    });
  });

  // 伦理类（建议探微选修）
  if (extra.includes("ethic")) {
    const ethic = (libGroups["science"] || []).filter(c => ETHIC_KEYWORDS.some(k => c.name.includes(k)));
    ethic.forEach(c => { c._score = recScore(c); });
    ethic.sort((a, b) => (b._score || 0) - (a._score || 0));
    if (ethic.length) out.push({
      group: "通识选修·工程/科学伦理类（培养方案建议选修 1 门）",
      credit: "建议 2 学分",
      total: ethic.length,
      items: ethic.slice(0, 8),
    });
  }

  // 完全没选类别时：默认科学课组 + 让其他课组也各露一手
  const pickedAny = extra.some(e => catMap[e]);
  if (!pickedAny && !extra.includes("ethic")) {
    const order = ["science", "humanity", "social", "art"];
    order.forEach(e => {
      const list = (libGroups[e] || []).slice();
      list.forEach(c => { c._score = recScore(c); });
      list.sort((a, b) => (b._score || 0) - (a._score || 0));
      const items = list.slice(0, e === "science" ? 12 : 4);
      if (items.length) out.push({
        group: `通识选修·${catNames[e]}`,
        credit: e === "science" ? "每课组至少 2 学分" : "（另需留意，可作补充）",
        total: libGroups[e].length,
        items,
      });
    });
  }
  return out;
}

/* ---------- 方向预览（可选） ---------- */
function buildDirectionPreview(mj, code, answers) {
  const intro = DIRECTION_INTRO[code];
  const required = [];
  const flatten = (list) => {
    (list || []).forEach(item => {
      if (item.name && typeof item.credit === "number") required.push({ ...item, _attr: "必修" });
      else if (item.courses) item.courses.forEach(c => required.push({ ...c, _attr: "必修" }));
      else if (item.modules) item.modules.forEach(m => (m.courses || []).forEach(c => required.push({ ...c, _attr: "必修" })));
    });
  };
  flatten(mj.required);

  const interest = many(answers, "interests");
  const majorDomain = {
    che: ["chem", "phys"], polymer: ["chem", "phys"], env: ["env", "chem"],
    water: ["env", "phys"], bme: ["bio", "phys"], smart_chem: ["ai", "chem"],
    env_ai: ["env", "ai"], water_digital: ["env", "ai"], smart_med: ["bio", "ai"],
    pharmacy: ["bio", "chem"],
  }[code] || [];
  required.forEach(c => {
    c.eval = findEval(c);
    c._score = (c.eval && c.eval.count ? c.eval.avg - 2.5 : 0.3) + (majorDomain.some(d => interest.includes(d)) ? 1 : 0);
  });
  required.sort((a, b) => (b._score || 0) - (a._score || 0));

  return {
    code,
    name: mj.name,
    degree: mj.degree,
    total: mj.total,
    requiredCredit: mj.required_credit,
    limitedCredit: mj.limited_credit,
    intro,
    requiredCount: required.length,
    required: required.slice(0, 8),
    more: Math.max(0, required.length - 8),
    limitedGroups: (mj.limited || []).map(g => ({ name: g.group, credit: g.credit })),
  };
}

/* ---------- 学业风格/方向意识提示 ---------- */
function styleTipsFor(answers) {
  const style = one(answers, "style") || "steady";
  const awareness = one(answers, "awareness") || "none";
  const tips = [];
  if (style === "competitive") tips.push("四门核心课+英语是绩点主战场，期中前建立复习节奏，别考前突击。");
  if (style === "explore") tips.push("大一上别排满，通识/社团/科研宣讲会都是探索方向的好途径。");
  if (awareness === "none") tips.push("先导课就是你的「方向试吃」——认真上完两门，大二春确认时心里就有谱了。");
  if (awareness === "some") tips.push("把两门先导课选在最感兴趣的领域，用真实课程验证你的直觉。");
  return tips;
}
