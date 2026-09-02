/* ============================================================
   问卷交互 + 推荐结果渲染
   ============================================================ */
"use strict";

const quiz = {
  answers: {},
  step: 0,

  async init() {
    setActiveNav("guide");
    try {
      await loadData();
    } catch (e) {
      document.getElementById("quizView").innerHTML =
        `<div class="card"><div class="notice warn">⚠️ 数据加载失败：${esc(e.message)}。请确认通过本地服务器访问（如 <code>python3 -m http.server</code>）。</div></div>`;
      return;
    }
    this.buildSteps();
    // 恢复分享链接或上次保存的答案
    const shared = this.parseShareHash();
    if (shared) {
      this.answers = shared;
      // 分享链接直达结果
      this.showResult();
      return;
    }
    try {
      const saved = localStorage.getItem("tanwei_quiz_answers");
      if (saved) this.answers = JSON.parse(saved);
    } catch (e) { /* ignore */ }
    this.renderStep();
  },

  /** 解析分享链接 #q=<base64url of JSON> */
  parseShareHash() {
    const m = location.hash.match(/^#q=(.+)$/);
    if (!m) return null;
    try {
      const json = decodeURIComponent(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")));
      const ans = JSON.parse(json);
      // 校验 key
      const keys = Object.fromEntries(QUIZ.map(q => [q.id, 1]));
      const ok = Object.keys(ans).every(k => keys[k]);
      return ok ? ans : null;
    } catch (e) { return null; }
  },

  /** 生成分享链接 */
  shareHash() {
    const json = JSON.stringify(this.answers);
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + location.pathname + "#q=" + b64;
  },

  buildSteps() {
    const container = document.getElementById("quizSteps");
    const dots = document.getElementById("stepDots");
    container.innerHTML = "";
    dots.innerHTML = "";
    QUIZ.forEach((q, i) => {
      const step = document.createElement("div");
      step.className = "quiz-step";
      step.dataset.q = q.id;
      step.innerHTML = `
        <div class="q-title">${q.title}</div>
        <div class="q-desc">${q.desc}</div>
        <div class="options"></div>`;
      const optsBox = step.querySelector(".options");
      q.options.forEach(opt => {
        const el = document.createElement("div");
        el.className = "opt";
        el.dataset.value = opt.value;
        el.innerHTML = `
          <span class="opt-${q.type === "multi" ? "check" : "radio"}"></span>
          <span>
            <span class="opt-title">${esc(opt.title)}</span>
            ${opt.sub ? `<span class="opt-sub">${esc(opt.sub)}</span>` : ""}
          </span>`;
        el.addEventListener("click", () => this.toggleOption(q, opt.value, el));
        optsBox.appendChild(el);
      });
      container.appendChild(step);

      const d = document.createElement("span");
      if (i === this.step) d.className = "on";
      dots.appendChild(d);
    });
  },

  toggleOption(q, value, el) {
    if (q.type === "single") {
      const box = el.parentElement;
      box.querySelectorAll(".opt").forEach(o => o.classList.remove("selected"));
      el.classList.add("selected");
      this.answers[q.id] = [value];
    } else {
      const cur = this.answers[q.id] || [];
      const idx = cur.indexOf(value);
      if (idx >= 0) {
        cur.splice(idx, 1);
        el.classList.remove("selected");
      } else {
        if (q.max && cur.length >= q.max) {
          alert(`最多选择 ${q.max} 项`);
          return;
        }
        cur.push(value);
        el.classList.add("selected");
      }
      this.answers[q.id] = cur;
    }
    this.updateNextState();
  },

  renderStep() {
    const steps = document.querySelectorAll(".quiz-step");
    steps.forEach((s, i) => s.classList.toggle("active", i === this.step));
    document.getElementById("stepLabel").textContent = `${this.step + 1} / ${QUIZ.length}`;
    document.getElementById("quizBar").style.width = `${((this.step + 1) / QUIZ.length) * 100}%`;
    document.querySelectorAll("#stepDots span").forEach((d, i) => d.classList.toggle("on", i <= this.step));
    const btnPrev = document.getElementById("btnPrev");
    btnPrev.style.visibility = this.step === 0 ? "hidden" : "visible";
    const btnNext = document.getElementById("btnNext");
    btnNext.textContent = this.step === QUIZ.length - 1 ? "生成我的选课清单 🎉" : "下一步 →";
    // 恢复已选状态
    const q = QUIZ[this.step];
    const sel = this.answers[q.id] || [];
    const opts = steps[this.step].querySelectorAll(".opt");
    opts.forEach(o => {
      if (sel.includes(o.dataset.value)) o.classList.add("selected");
    });
    this.updateNextState();
  },

  updateNextState() {
    const q = QUIZ[this.step];
    const sel = this.answers[q.id] || [];
    document.getElementById("btnNext").disabled = sel.length === 0;
  },

  next() {
    if (this.step < QUIZ.length - 1) {
      this.step++;
      this.renderStep();
    } else {
      this.showResult();
    }
  },

  prev() {
    if (this.step > 0) {
      this.step--;
      this.renderStep();
    }
  },

  restart() {
    this.answers = {};
    this.step = 0;
    document.getElementById("resultView").style.display = "none";
    document.getElementById("quizView").style.display = "";
    this.renderStep();
    window.scrollTo(0, 0);
  },

  /* ============ 结果渲染 ============ */
  showResult() {
    // 保存答案到 localStorage，并更新分享链接
    try {
      localStorage.setItem("tanwei_quiz_answers", JSON.stringify(this.answers));
      history.replaceState(null, "", this.shareHash());
    } catch (e) { /* ignore */ }

    const rec = generateRecommendations(this.answers);
    const dirName = directionName(rec.direction);

    document.getElementById("quizView").style.display = "none";
    const rv = document.getElementById("resultView");
    rv.style.display = "";

    document.getElementById("resultHeader").innerHTML = `
      <div class="hero">
        <h1>🎉 你的专属选课清单已生成</h1>
        <p>方向：<b>${dirName}</b> · 依据「必选 / 限选 / 任选」框架整理。
        课程卡片上的评分来自 <a href="https://thubook.help/thucourse/" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline">THU选课社区</a> 学生真实评价，仅供参考。</p>
        <div class="badges">
          <span>📌 必选：照单全收</span>
          <span>🔍 限选：按兴趣+口碑选</span>
          <span>🆓 任选：自由拓展</span>
        </div>
      </div>`;

    const body = document.getElementById("resultBody");
    body.innerHTML = "";

    // ---- 必选 ----
    const reqSec = document.createElement("div");
    reqSec.className = "rec-section";
    reqSec.innerHTML = `
      <h2><span class="tag-icon bar-req">📌</span> 必选课程（Required）</h2>
      <div class="rec-desc">培养方案规定的必修课程，原则上都需要修读。带评分徽章的课程附有学长学姐的真实评价。</div>`;
    rec.required.forEach(s => {
      const block = document.createElement("div");
      block.className = "module-block";
      block.innerHTML = `
        <div class="mod-head">${esc(s.title)} <span class="mod-req">${esc(s.desc)}</span></div>
        <div class="grid-2">${s.courses.map(c => courseCardHTML(c)).join("")}</div>`;
      reqSec.appendChild(block);
    });
    body.appendChild(reqSec);

    // ---- 限选 ----
    const limSec = document.createElement("div");
    limSec.className = "rec-section";
    const limTitle = rec.direction === "undecided"
      ? "限选课程 · 基础课组的「二选一 / 三选一」"
      : "限选课程（Limited Electives）";
    limSec.innerHTML = `
      <h2><span class="tag-icon bar-lim">🔍</span> ${limTitle}</h2>
      <div class="rec-desc">在限定范围内按需选修，已按「你的兴趣匹配度 × 课程口碑」排序。未修满要求学分前，优先选排在前面的课程。</div>`;
    rec.limited.forEach(g => {
      const block = document.createElement("div");
      block.className = "module-block";
      block.innerHTML = `
        <div class="mod-head">${esc(g.groupName)} ${g.requirement ? `<span class="mod-req">${esc(g.requirement)}</span>` : ""}</div>
        <div class="grid-2">${g.items.slice(0, 8).map(c => courseCardHTML(c, true)).join("")}</div>
        ${g.items.length > 8 ? `<p class="small mt8">…共 ${g.items.length} 门，完整清单见 <a href="pyfa.html">培养方案</a> 页</p>` : ""}`;
      limSec.appendChild(block);
    });
    if (!rec.limited.length) {
      limSec.innerHTML += `<p class="small">该方向暂无额外限选课程（学分要求集中在必修）。</p>`;
    }
    body.appendChild(limSec);

    // ---- 任选 ----
    const freeSec = document.createElement("div");
    freeSec.className = "rec-section";
    freeSec.innerHTML = `
      <h2><span class="tag-icon bar-free">🆓</span> 任选推荐（Free Electives）</h2>
      <div class="rec-desc">通识选修四大课组每组至少 2 学分（共 11 学分），以下按你的拓展兴趣推荐高分课程。</div>`;
    rec.free.forEach(g => {
      const block = document.createElement("div");
      block.className = "module-block";
      block.innerHTML = `
        <div class="mod-head">${esc(g.groupName)} ${g.credit ? `<span class="mod-req">建议 ${g.credit}+ 学分</span>` : ""}</div>
        <div class="grid-2">${g.items.slice(0, 6).map(c => courseCardHTML(c, true)).join("")}</div>`;
      freeSec.appendChild(block);
    });
    if (!rec.free.length) {
      freeSec.innerHTML += `<p class="small">按你的选择暂无额外推荐，可去 <a href="courses.html">课程库</a> 自行探索。</p>`;
    }
    body.appendChild(freeSec);

    // ---- 学分规划 ----
    const planSec = document.createElement("div");
    planSec.className = "rec-section";
    const pc = rec.planCells;
    planSec.innerHTML = `
      <h2><span class="tag-icon" style="background:#eaf1fe;color:#175cd3">🗓️</span> 学分规划建议（${esc(pc.label)}）</h2>
      <div class="rec-desc">总学分约 <b>${pc.total}</b>（以所选方向培养方案为准），每学期约 <b>${pc.perSem}</b> 学分。通识+书院基础多集中在前两年。</div>
      <div class="plan-grid">${pc.cells.map(c => `
        <div class="plan-cell"><div class="sem">${esc(c.sem)}</div><div class="cr">≈${c.cr} 学分</div><div class="hint">${esc(c.hint)}</div></div>`).join("")}
      </div>`;
    body.appendChild(planSec);

    // 提示
    const notice = document.createElement("div");
    notice.className = "notice mt24";
    notice.innerHTML = `<b>💡 使用提示：</b>限选与任选课程每年开课情况、课容量可能变化，请以选课系统实际开放课程为准；评分高的课通常抢课激烈，建议提前规划备选。培养方案完整细节见 <a href="pyfa.html">培养方案</a> 页。<br>
    <b>🔗 分享：</b>当前页面链接已包含你的问卷答案，复制地址发给同学，对方打开即可看到同样结果。`;
    body.appendChild(notice);

    // 分享按钮
    const shareBar = document.createElement("div");
    shareBar.className = "card";
    shareBar.style.textAlign = "center";
    shareBar.innerHTML = `
      <p class="small mb8">把这份选课清单分享给同学：</p>
      <button class="btn btn-primary" onclick="quiz.copyShare()">📋 复制分享链接</button>`;
    body.appendChild(shareBar);

    window.scrollTo(0, 0);
  },

  /** 复制分享链接 */
  async copyShare() {
    const url = this.shareHash();
    try {
      await navigator.clipboard.writeText(url);
      alert("✅ 链接已复制！发给同学即可看到同样的选课清单。");
    } catch (e) {
      // 剪贴板不可用时提示手动复制
      prompt("请手动复制以下链接：", url);
    }
  },
};

function directionName(code) {
  const map = {
    che: "化学生物学+化学工程与工业生物工程", polymer: "化学生物学+高分子材料与工程",
    env: "化学生物学+环境工程", water: "化学生物学+给排水科学与工程",
    bme: "化学生物学+生物医学工程", pharmacy: "化学生物学（药学方向）",
    smart_chem: "交叉工程·智能化工", env_ai: "交叉工程·环境人工智能",
    water_digital: "交叉工程·数智水务", smart_med: "交叉工程·智能医学工程",
    undecided: "暂未确定（先规划基础课）",
  };
  return map[code] || code;
}

/** 课程卡片 HTML */
function courseCardHTML(c, showModule) {
  const ev = c.eval;
  const moduleTag = c._module ? `<span class="pill pill-module">${esc(c._module)}</span>` : "";
  const groupTag = c._group ? `<span class="pill pill-tag">${esc(c._group)}</span>` : "";
  return `
    <div class="course-card">
      <div class="course-name">${esc(c.name)}</div>
      <div class="course-meta">
        <span>${attrPill(c._attr || "必修")}</span>
        <span>${fmtCredit(c.credit)} 学分</span>
        ${moduleTag}${groupTag}
      </div>
      <div class="course-meta">
        ${scoreBadge(ev, true)}
        ${ev && ev.dept ? `<span>${esc(ev.dept)}</span>` : ""}
      </div>
      ${reviewBlock(ev, 1)}
      ${c.id ? `<details class="detail"><summary>课程编号 ${esc(c.id)}</summary></details>` : ""}
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => quiz.init());
