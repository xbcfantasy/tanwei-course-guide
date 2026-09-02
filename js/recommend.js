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
   eval 字段由运行时从站点数据按课程名/编号补齐。 */
const FRESHMAN_FALL_CORE = [
  { id: "10421055", name: "微积分A(1)", credit: 5, note: "数学必修·第一学期核心课，学分最重，务必跟上节奏", attr: "必修", scope: "definite" },
  { id: "10440144", name: "化学原理", credit: 4, note: "探微核心基础课·为后续有机/物化打底", attr: "必修", scope: "definite" },
  { id: "", name: "计算机程序设计基础（三选一）", credit: 2, note: "三选一：计算机程序设计基础 / 信息科学理论与实践 / Python版", attr: "必修", scope: "definite" },
  { id: "", name: "大学生思想文化素养", credit: 2, note: "思政必修·培养方案标注大一秋", attr: "必修", scope: "definite" },
  { id: "", name: "体育(1)", credit: 1, note: "第1-4学期体育必修，毕业须过游泳测试", attr: "必修", scope: "definite" },
  { id: "", name: "英语分级课", credit: 2, note: "按入学分级考试分到 C1/C2/B/A 课组，学期内完成对应级别", attr: "必修", scope: "definite" },
  { id: "10421324", name: "线性代数", credit: 4, note: "数学必修·若本学期未开则顺延，以教务安排为准", attr: "必修", scope: "maybe" },
  { id: "10430484", name: "大学物理(1)", credit: 4, note: "三选一（大学物理B(1)/大学物理(1)/英文版）·开课学期以教学计划为准", attr: "必修", scope: "maybe" },
];

/** 先导课四选二：选项 value → {课程名, 编号, 方向说明} */
const INTRO_COURSES = {
  che_intro: { id: "30340451", name: "化学工程与高分子科学导论", leads: ["化学工程与工业生物工程", "高分子材料与工程", "智能化工"], icon: "⚗️" },
  env_intro: { id: "30050411", name: "环境科学与工程前沿导论", leads: ["环境工程", "给排水科学与工程", "环境人工智能", "数智水务"], icon: "🌱" },
  bme_intro: { id: "34000271", name: "生物医学工程专业导论", leads: ["生物医学工程", "智能医学工程"], icon: "🫀" },
  pharma_intro: { id: "44000061", name: "药学导论", leads: ["药学方向"], icon: "💊" },
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

  // ---------- ⑥ 学业风格/方向意识提示 ----------
  const styleTips = styleTipsFor(answers);

  return {
    fallCore: { definite, maybe, definiteCredit, maybeCredit },
    loadAdvice,
    introCourses: { chosen: introWithEval, all: allIntro },
    liberal,
    directionPreview: preview,
    styleTips,
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
  const out = [];
  const zhjwxk = data.zhjwxk;
  const libGroups = {};
  (zhjwxk.courses || []).forEach(c => {
    const cat = LIBERAL_GROUP_MAP[c.group];
    if (!cat || c.attr === "必修") return;
    (libGroups[cat] = libGroups[cat] || []).push(c);
  });
  const sortByScore = (arr) => arr.sort((a, b) => {
    const ea = a.eval && a.eval.count ? a.eval.avg : -1;
    const eb = b.eval && b.eval.count ? b.eval.avg : -1;
    return eb - ea || (b.eval ? b.eval.count : 0) - (a.eval ? a.eval.count : 0);
  });

  const catMap = { science: "science", humanity: "humanity", social: "social", art: "art" };
  const catNames = { science: "科学课组", humanity: "人文课组", social: "社科课组", art: "艺术课组" };
  extra.filter(e => catMap[e]).forEach(e => {
    const top = sortByScore(libGroups[e] || []).slice(0, 4);
    if (top.length) out.push({ group: `通识选修·${catNames[e]}`, credit: "建议 2 学分", items: top });
  });

  if (extra.includes("ethic")) {
    const ethic = sortByScore((libGroups["science"] || []).filter(c => ETHIC_KEYWORDS.some(k => c.name.includes(k))));
    if (ethic.length) out.push({ group: "通识选修·工程/科学伦理类（培养方案建议选修）", credit: "2 学分", items: ethic.slice(0, 3) });
  }

  const pickedAny = extra.some(e => catMap[e]);
  if (!pickedAny && !extra.includes("ethic")) {
    const top = sortByScore(libGroups["science"] || []).slice(0, 4);
    if (top.length) out.push({ group: "通识选修·科学课组（适合理工科起步）", credit: "建议 2 学分", items: top });
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
