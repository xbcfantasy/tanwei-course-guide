/* ============================================================
   推荐引擎：按"必选 / 限选 / 任选"框架生成选课指导
   ============================================================ */
"use strict";

/** 生成推荐结果 */
function generateRecommendations(answers) {
  const data = SITE_DATA;
  const direction = answers.direction || "undecided";
  const style = answers.style || [];
  const priority = answers.course_priority || [];
  const load = answers.load || "normal";
  const plan = answers.plan || "undecided";
  const english = answers.english || "some";
  const extra = answers.extra || [];

  const interestWeight = buildInterestWeight(style, priority, plan, extra);

  // ---------- 1. 必选 ----------
  const required = buildRequired(data, direction, english);

  // ---------- 2. 限选 ----------
  const limited = direction === "undecided"
    ? buildUndecidedLimited(data, interestWeight)
    : buildLimited(data, direction, interestWeight, english);

  // ---------- 3. 任选 ----------
  const free = buildFree(data, direction, interestWeight, extra, english);

  // ---------- 4. 学分规划 ----------
  const planCells = buildCreditPlan(data, direction, load);

  return { direction, required, limited, free, planCells, interestWeight };
}

/* ---------------- 兴趣权重 ---------------- */
function buildInterestWeight(style, priority, plan, extra) {
  const w = {};
  const add = (k, v) => { w[k] = (w[k] || 0) + v; };

  // 学习风格
  style.forEach(s => add(s, 3));

  // 课程偏好
  if (priority.includes("grade")) { add("grade", 2); }
  if (priority.includes("light")) { add("light", 2); }
  if (priority.includes("fun")) { add("fun", 1.5); }
  if (priority.includes("teacher")) { add("teacher", 1.5); }
  if (priority.includes("rigorous")) { add("rigorous", 1); add("theory", 1); add("lab", 1); }

  // 未来规划
  if (plan === "grad") { add("lab", 1); add("theory", 1); add("rigorous", 1); }
  if (plan === "abroad") { add("english", 1.5); add("grade", 1); }
  if (plan === "work") { add("engineering", 1.5); }

  // 任选拓展方向
  extra.forEach(e => add(e, 1.5));
  if (extra.includes("science")) add("ai", 1);

  return w;
}

/** 综合得分：兴趣匹配 + 评价分 + 负荷调整 */
function scoreCourse(course, interestWeight, styleTags) {
  let score = 0;
  const tags = course.tags || styleTags || [];
  tags.forEach(t => { score += (interestWeight[t] || 0) * 0.6; });

  // 评价分：avg 5 → +3, 4 → +2, 3 → +1, 无评价 → +0.5
  const ev = course.eval;
  if (ev && ev.count) {
    score += Math.max(0.5, ev.avg - 2.5);
    if (interestWeight["grade"]) score += (ev.avg - 3) * 0.8;
    if (ev.count >= 3 && interestWeight["teacher"]) score += 0.5;
  } else {
    score += 0.3;
  }
  // 内容有趣偏好 → 有详细评价的课程加一点
  if (interestWeight["fun"] && ev && ev.reviews && ev.reviews.length) score += 0.6;
  return score;
}

function sortByScore(list) {
  return list.sort((a, b) => (b._score || 0) - (a._score || 0));
}

/* ---------------- 必选 ---------------- */
function buildRequired(data, direction, english) {
  const college = data.pyfa.college;
  const sections = [];

  // 书院基础必修
  const mathList = flattenCourses(college.math.required, "书院基础·数学", ["math", "theory"]);
  const mathAlt = flattenCourses(college.math.limited, "书院基础·数学", ["math", "theory"]);
  const physList = flattenCourses(college.physics.required, "书院基础·物理", ["physics", "theory"]);
  const chemList = flattenCourses(college.chem_bio.required, "书院基础·化学生物", ["chem", "lab"]);
  const csList = flattenCourses(college.cs.required, "书院基础·信计", ["cs", "ai"]);
  const pracList = flattenCourses(college.practice.required, "书院基础·书院实践", ["practice", "lab"]);

  sections.push({
    title: "数学课程（17学分）",
    desc: "微积分A、线性代数为必修；概率论三门任选其一",
    courses: [...mathList, ...mathAlt],
    totalCredit: "17学分",
  });
  sections.push({
    title: "物理课程（9学分）",
    desc: "大学物理（1）（2）各三选一 + 探微定制大学物理实验",
    courses: physList,
    totalCredit: "9学分",
  });
  sections.push({
    title: "化学生物课程（21学分）",
    desc: "化学原理、有机化学A、生物化学为探微核心必修",
    courses: chemList,
    totalCredit: "21学分",
  });
  sections.push({
    title: "信计课程（6学分）",
    desc: "程序设计三选一 + 数据结构与算法 + 人工智能导论二选一",
    courses: csList,
    totalCredit: "6学分",
  });
  sections.push({
    title: "书院实践（13学分）",
    desc: "专业导论四选二、科学训练I/II、综合论文训练",
    courses: pracList,
    totalCredit: "13学分",
  });

  // 专业课必修
  if (direction !== "undecided") {
    const mj = data.pyfa.majors[direction];
    if (mj && mj.required) {
      sections.push({
        title: `${mj.name}·专业课必修（${mj.required_credit}学分）`,
        desc: `本方向必修${mj.required.length}门专业课程`,
        courses: flattenCourses(mj.required, "专业必修", majorTags(direction)),
        totalCredit: mj.required_credit + "学分",
      });
    }
  }
  return sections;
}

function majorTags(direction) {
  const map = {
    che: ["chem", "engineering"], polymer: ["chem", "engineering", "lab"],
    env: ["sustain", "engineering"], water: ["sustain", "engineering"],
    bme: ["biomed", "engineering"], smart_chem: ["chem", "ai"],
    env_ai: ["sustain", "ai"], water_digital: ["sustain", "ai"],
    smart_med: ["biomed", "ai"], pharmacy: ["biomed", "lab"],
  };
  return map[direction] || [];
}

/** 扁平化课程列表（处理嵌套的 group/二选一结构），并附加默认标签 */
function flattenCourses(list, groupName, defaultTags, attr) {
  const out = [];
  const push = (c) => {
    if (!c || typeof c !== "object") return;
    if (c.name && typeof c.credit === "number") {
      out.push({
        ...c,
        _group: groupName,
        _attr: attr || "必修",
        tags: c.tags && c.tags.length ? c.tags : [...defaultTags],
      });
    } else if (c.courses) {
      c.courses.forEach(push);
    } else if (c.modules) {
      c.modules.forEach(m => m.courses && m.courses.forEach(push));
    }
  };
  list.forEach(push);
  return out;
}

/* ---------------- 限选 ---------------- */
function buildLimited(data, direction, interestWeight, english) {
  const mj = data.pyfa.majors[direction];
  if (!mj || !mj.limited) return [];
  const groups = [];

  mj.limited.forEach(g => {
    const items = [];
    // 直接课程
    (g.courses || []).forEach(c => {
      items.push({ ...c, _attr: "限选", _score: scoreCourse(c, interestWeight, majorTags(direction)) });
    });
    // 模块课程
    (g.modules || []).forEach(mod => {
      const modTags = (DIRECTION_MODULE_TAGS[direction] || {})[mod.name] || [];
      mod.courses.forEach(c => {
        const tags = [...majorTags(direction), ...modTags];
        items.push({ ...c, _attr: "限选", _module: mod.name, _tags: tags, _score: scoreCourse({ ...c, tags }, interestWeight, tags) });
      });
    });
    sortByScore(items);
    groups.push({
      groupName: g.group,
      credit: g.credit,
      requirement: g.credit ? `需修 ${g.credit} 学分` : "",
      items,
    });
  });
  return groups;
}

function buildUndecidedLimited(data, interestWeight) {
  // 未确定方向：展示书院基础中的"三选一/二选一"替代课，供提前了解
  const college = data.pyfa.college;
  const groups = [];
  const mk = (list, name) => {
    const items = flattenCourses(list, name, ["theory"]).map(c => ({
      ...c, _attr: "限选", _score: scoreCourse(c, interestWeight, ["theory"]),
    }));
    sortByScore(items);
    groups.push({ groupName: name, credit: null, requirement: "任选其一", items });
  };
  mk(college.math.limited, "概率论三选一（数学 3/5学分）");
  mk([{ courses: college.physics.required.map(g => g.courses).flat() }], "大学物理（1）三选一");
  mk([{ courses: college.cs.required[0].courses }], "程序设计三选一");
  mk([{ courses: college.cs.required[2].courses }], "人工智能导论二选一");
  mk([{ courses: college.practice.required[0].courses }], "专业导论四选二（帮你提前了解方向）");
  return groups;
}

/* ---------------- 任选 ---------------- */
function buildFree(data, direction, interestWeight, extra, english) {
  const out = [];
  const zhjwxk = data.zhjwxk;

  // 通识任选推荐：按用户拓展兴趣分组
  const libGroups = {};
  (zhjwxk.courses || []).forEach(c => {
    const cat = LIBERAL_GROUP_MAP[c.group];
    if (!cat || c.attr === "必修") return;
    (libGroups[cat] = libGroups[cat] || []).push(c);
  });

  const catNames = { humanity: "人文课组", social: "社科课组", art: "艺术课组", science: "科学课组" };
  const catKey = { humanity: "humanity", social: "social", art: "art", science: "science" };

  // 用户选择了拓展方向的课组 → 每类推荐前 5（按评分）
  extra.filter(e => catKey[e]).forEach(e => {
    const list = (libGroups[e] || []).map(c => ({
      ...c, _attr: "任选", _score: scoreCourse(c, interestWeight, [e]),
    }));
    sortByScore(list);
    const top = list.slice(0, 6);
    if (top.length) {
      out.push({ groupName: `通识选修·${catNames[e]}（每课组至少2学分）`, credit: 2, items: top });
    }
  });

  // 科学课组默认推荐（适合探微理工背景）
  if (!extra.includes("science") && !extra.includes("none")) {
    const list = (libGroups["science"] || []).map(c => ({ ...c, _attr: "任选", _score: scoreCourse(c, interestWeight, ["science"]) }));
    sortByScore(list);
    const top = list.slice(0, 5);
    if (top.length) out.push({ groupName: "通识选修·科学课组（适合理工科拓展）", credit: 2, items: top });
  }

  // 专业任选（药学方向有专门任选课组）
  if (direction === "pharmacy" && data.pyfa.majors.pharmacy.free) {
    const items = data.pyfa.majors.pharmacy.free.map(c => ({
      ...c, _attr: "任选", _score: scoreCourse(c, interestWeight, ["biomed", "lab"]),
    }));
    sortByScore(items);
    out.push({ groupName: "药学方向·任选课组", credit: null, items });
  }

  // 英文课程提示
  if (english === "ok" || english === "some") {
    const enCourses = (zhjwxk.courses || []).filter(c => /英|English/i.test(c.name) && c.eval && c.eval.count);
    const list = enCourses.map(c => ({ ...c, _attr: "任选", _score: scoreCourse(c, interestWeight, ["english"]) }));
    sortByScore(list);
    const top = list.slice(0, 5);
    if (top.length) out.push({ groupName: "英文授课课程推荐（练英语/国际课程）", credit: null, items: top });
  }

  return out;
}

/* ---------------- 学分规划 ---------------- */
function buildCreditPlan(data, direction, load) {
  const table = data.credit_table || [];
  let row = null;
  if (direction !== "undecided") {
    const nameMap = {
      che: "化学生物学+化学工程与工业生物工程", polymer: "化学生物学+高分子材料与工程",
      env: "化学生物学+环境工程", water: "化学生物学+给排水科学与工程",
      bme: "化学生物学+生物医学工程", pharmacy: "化学生物学（药学方向）",
      smart_chem: "化学生物学+交叉工程（智能化工）", env_ai: "化学生物学+交叉工程（环境人工智能）",
      water_digital: "化学生物学+交叉工程（数智水务）", smart_med: "化学生物学+交叉工程（智能医学工程）",
    };
    row = table.find(t => t.name === nameMap[direction]);
  }
  const total = row ? row.total : 160;

  const loadMap = {
    light: { perSem: 18, label: "轻松模式" },
    normal: { perSem: 21, label: "标准模式" },
    heavy: { perSem: 25, label: "学霸模式" },
  };
  const cfg = loadMap[load] || loadMap.normal;

  // 预估分布：通识43 + 书院基础66 主要集中在前两年
  const cells = [
    { sem: "大一秋", cr: Math.round(cfg.perSem * 0.95), hint: "微积分A(1)·大学物理(1)·化学原理·程序设计" },
    { sem: "大一春", cr: Math.round(cfg.perSem * 1.0), hint: "微积分A(2)·有机化学A·生物化学·英语" },
    { sem: "大二秋", cr: Math.round(cfg.perSem * 1.02), hint: "线性代数·概率统计·物理(2)·专业课启动" },
    { sem: "大二春", cr: Math.round(cfg.perSem * 0.98), hint: "方向确认·专业课加深·限选模块" },
    { sem: "大三", cr: Math.round(total / 4.2), hint: "专业课攻坚·限选模块·科研训练" },
    { sem: "大四", cr: Math.max(6, Math.round((total - cfg.perSem * 4.2) / 2)), hint: "综合论文训练·毕业设计" },
  ];
  return { total, perSem: cfg.perSem, label: cfg.label, cells };
}
