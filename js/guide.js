/* ============================================================
   问卷交互 v2 + 新生版结果渲染
   ============================================================ */
"use strict";

const quiz = {
  answers: {},
  step: 0, // 在 QUIZ 数组中的索引（始终指向可见题）

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
      this.showResult();
      return;
    }
    try {
      const saved = localStorage.getItem("tanwei_quiz_answers");
      if (saved) this.answers = JSON.parse(saved);
    } catch (e) { /* ignore */ }
    const vis = this.visible();
    this.step = vis.length ? QUIZ.indexOf(vis[0]) : 0;
    this.renderStep();
  },

  visible() {
    return visibleQuestions(this.answers);
  },

  /** 当前题 */
  currentQ() {
    return QUIZ[this.step];
  },

  /** 当前题在可见列表中的序号 */
  visIndexOfCurrent() {
    const vis = this.visible();
    return vis.findIndex(q => q.id === this.currentQ()?.id);
  },

  /** 解析分享链接 #q=<base64url of JSON> */
  parseShareHash() {
    const m = location.hash.match(/^#q=(.+)$/);
    if (!m) return null;
    try {
      const json = decodeURIComponent(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")));
      const ans = JSON.parse(json);
      return typeof ans === "object" && ans !== null ? ans : null;
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
    QUIZ.forEach((q) => {
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
      dots.appendChild(d);
    });
  },

  toggleOption(q, value, el) {
    if (q.type === "single") {
      const box = el.parentElement;
      if (box) box.querySelectorAll(".opt").forEach(o => o.classList.remove("selected"));
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
    const vis = this.visible();
    // 当前题不可见时（条件变化导致），移到可见区间开头
    if (this.visIndexOfCurrent() < 0) {
      this.step = vis.length ? QUIZ.indexOf(vis[0]) : 0;
    }
    const curVisIdx = this.visIndexOfCurrent();

    // 进度点数量 = 可见题数
    const dots = document.querySelectorAll("#stepDots span");
    vis.forEach((v, i) => {
      if (dots[i]) dots[i].classList.toggle("on", i <= curVisIdx);
    });

    QUIZ.forEach((q, i) => {
      const visible = vis.some(v => v.id === q.id);
      const st = steps[i];
      if (!st) return;
      st.style.display = visible ? "" : "none";
      st.classList.toggle("active", i === this.step);
    });

    document.getElementById("stepLabel").textContent = `${curVisIdx + 1} / ${vis.length}`;
    document.getElementById("quizBar").style.width = `${((curVisIdx + 1) / Math.max(1, vis.length)) * 100}%`;
    const btnPrev = document.getElementById("btnPrev");
    btnPrev.style.visibility = curVisIdx <= 0 ? "hidden" : "visible";
    const btnNext = document.getElementById("btnNext");
    btnNext.textContent = curVisIdx >= vis.length - 1 ? "生成我的选课计划书 🎉" : "下一步 →";

    // 恢复当前题已选状态
    const q = this.currentQ();
    const sel = this.answers[q?.id] || [];
    const stepEl = steps[this.step];
    if (stepEl) {
      stepEl.querySelectorAll(".opt").forEach(o => {
        o.classList.toggle("selected", sel.includes(o.dataset.value));
      });
    }
    this.updateNextState();
  },

  updateNextState() {
    const q = this.currentQ();
    if (!q) return;
    const sel = this.answers[q.id] || [];
    // optional 题允许跳过
    document.getElementById("btnNext").disabled = q.optional ? false : sel.length === 0;
  },

  next() {
    const vis = this.visible();
    const cur = this.visIndexOfCurrent();
    if (cur < vis.length - 1) {
      this.step = QUIZ.indexOf(vis[cur + 1]);
      this.renderStep();
    } else {
      this.showResult();
    }
  },

  prev() {
    const vis = this.visible();
    const cur = this.visIndexOfCurrent();
    if (cur > 0) {
      this.step = QUIZ.indexOf(vis[cur - 1]);
      this.renderStep();
    }
  },

  restart() {
    this.answers = {};
    const vis = this.visible();
    this.step = vis.length ? QUIZ.indexOf(vis[0]) : 0;
    document.getElementById("resultView").style.display = "none";
    document.getElementById("quizView").style.display = "";
    this.renderStep();
    window.scrollTo(0, 0);
  },

  /* ============ 新生版结果渲染 ============ */
  showResult() {
    try {
      localStorage.setItem("tanwei_quiz_answers", JSON.stringify(this.answers));
      history.replaceState(null, "", this.shareHash());
    } catch (e) { /* ignore */ }

    const rec = generateFreshmanPlan(this.answers);
    const awareness = (this.answers.awareness || [])[0];

    document.getElementById("quizView").style.display = "none";
    const rv = document.getElementById("resultView");
    rv.style.display = "";

    document.getElementById("resultHeader").innerHTML = `
      <div class="hero">
        <h1>🎉 你的大一上选课计划书已生成</h1>
        <p>方向大二春才确认，不用急——这份计划帮你把<b>大一第一学期</b>安排明白：
        核心必修打底，先导课探索方向，通识课开阔视野。
        评分来自 <a href="https://thubook.help/thucourse/" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline">THU选课社区</a> 学生真实评价，仅供参考。</p>
        <div class="badges">
          <span>📌 核心课：打牢基础</span>
          <span>🔭 先导课：探索方向</span>
          <span>🆓 通识课：开阔视野</span>
        </div>
      </div>`;

    const body = document.getElementById("resultBody");
    body.innerHTML = "";

    // ============ A. 大一上核心必选 ============
    const secA = document.createElement("div");
    secA.className = "rec-section";
    secA.innerHTML = `
      <h2><span class="tag-icon bar-req">📌</span> 大一上核心必选（共约 ${rec.fallCore.definiteCredit} 学分）</h2>
      <div class="rec-desc">探微书院统一底盘，第一学期全班基本一致。下表为<b>推断参考版</b>——以入学后教务系统与书院通知为准。</div>`;
    secA.innerHTML += planTableHTML("本学期确定开设", rec.fallCore.definite);
    if (rec.fallCore.maybe.length) {
      secA.innerHTML += planTableHTML("视教学计划（可能本学期或顺延）", rec.fallCore.maybe, true);
    }
    body.appendChild(secA);

    // ============ B. 学分预算 ============
    const secB = document.createElement("div");
    secB.className = "rec-section";
    const la = rec.loadAdvice;
    secB.innerHTML = `
      <h2><span class="tag-icon" style="background:#eaf1fe;color:#175cd3">🎯</span> 学分预算：${esc(la.label)}</h2>
      <div class="card">
        <p>${esc(la.note)}</p>
        <p class="mt8">${esc(la.topUp)}</p>
        <p class="mt8">${esc(la.styleNote)}</p>
        <p class="small mt8">四年总学分 146-160，通识 43 + 书院基础 66 是所有人共同的底盘，前两年节奏决定后两年余裕。</p>
      </div>`;
    body.appendChild(secB);

    // ============ C. 先导课（方向导论） ============
    const secC = document.createElement("div");
    secC.className = "rec-section";
    secC.innerHTML = `
      <h2><span class="tag-icon bar-lim">🔭</span> 你的先导课选择（四选二 · 各 1 学分）</h2>
      <div class="rec-desc">导论课是「方向试吃」——大二春确认方向前，这两门课是你了解探微各方向的窗口。你选了：</div>
      <div class="grid-2">${rec.introCourses.chosen.map(introCardHTML).join("") || '<p class="small">（未选择）</p>'}</div>
      <details class="detail mt8"><summary>另外两门也可以了解一下（选课开放后按兴趣调整）</summary>
      <div class="grid-2 mt8">${rec.introCourses.all.filter(i => !rec.introCourses.chosen.some(c => c.name === i.name)).map(introCardHTML).join("")}</div></details>`;
    body.appendChild(secC);

    // ============ D. 通识推荐 ============
    const secD = document.createElement("div");
    secD.className = "rec-section";
    secD.innerHTML = `
      <h2><span class="tag-icon bar-free">🆓</span> 通识选修推荐（本学期 1-2 门即可）</h2>
      <div class="rec-desc">通识共 11 学分分四年完成，四大课组每课组至少 2 学分。以下按你的偏好推荐高分课程。</div>`;
    if (rec.liberal.length) {
      rec.liberal.forEach(g => {
        const blk = document.createElement("div");
        blk.className = "module-block";
        blk.innerHTML = `<div class="mod-head">${esc(g.group)} <span class="mod-req">${esc(g.credit)}</span></div>
          <div class="grid-2">${g.items.map(c => courseCardHTML({ ...c, _attr: "任选" })).join("")}</div>`;
        secD.appendChild(blk);
      });
    } else {
      secD.innerHTML += `<p class="small">未选具体类别——可去 <a href="courses.html">课程库</a> 按课组浏览高分通识课。</p>`;
    }
    body.appendChild(secD);

    // ============ E. 方向预览（可选） ============
    if (rec.directionPreview) {
      const pv = rec.directionPreview;
      const secE = document.createElement("div");
      secE.className = "rec-section";
      secE.innerHTML = `
        <h2><span class="tag-icon" style="background:#f0e6ff;color:#6941c6">🧭</span> 方向提前预览：${esc(pv.name)}</h2>
        <div class="rec-desc">大二春确认前的提前预览：该方向专业必修 ${pv.requiredCredit} 学分 + 限选 ${pv.limitedCredit} 学分（专业总 ${pv.total} 学分）。导论窗口：${esc(pv.intro?.icon || "")} ${esc(pv.intro?.intro || "")}（${esc(pv.intro?.note || "")}）</div>`;
      secE.innerHTML += previewTableHTML(pv);
      body.appendChild(secE);
    }

    // ============ F. 给新生的提示 ============
    const secF = document.createElement("div");
    secF.className = "rec-section";
    secF.innerHTML = `
      <h2><span class="tag-icon" style="background:#fff4e5;color:#dc6803">💡</span> 给新生的提示</h2>
      <div class="card">
        <ul style="margin:4px 0 0 20px;line-height:2">
          ${rec.styleTips.map(t => `<li>${esc(t)}</li>`).join("")}
          <li>📅 入学节奏：英语分级考试（开学前后）→ 军训/军事理论 → 正式上课 → 期中 → 期末选大一下。体育必修 4 学期，毕业前须通过游泳测试。</li>
          <li>🚀 大一期间方向探索：先导课 + 书院导师交流 + 各系开放日/实验室参观 + 学长学姐经验——大二春确认前有整整一年半。</li>
          <li>📌 本计划为推断参考版，具体课程与学期以入学后<a href="pyfa.html">培养方案</a>和教务系统为准。</li>
        </ul>
      </div>`;
    body.appendChild(secF);

    // ============ 分享 ============
    const share = document.createElement("div");
    share.className = "card";
    share.style.textAlign = "center";
    share.innerHTML = `
      <p class="small mb8">把这份计划分享给同学（链接包含你的问卷答案，对方打开即见同样结果）：</p>
      <button class="btn btn-primary" onclick="quiz.copyShare()">📋 复制分享链接</button>
      <a class="btn btn-outline" href="pyfa.html" style="margin-left:10px">📖 查看完整培养方案</a>`;
    body.appendChild(share);

    window.scrollTo(0, 0);
  },

  async copyShare() {
    const url = this.shareHash();
    try {
      await navigator.clipboard.writeText(url);
      alert("✅ 链接已复制！发给同学即可看到同样的计划。");
    } catch (e) {
      prompt("请手动复制以下链接：", url);
    }
  },
};

/* ---------- 计划表格 ---------- */
function planTableHTML(title, courses, isMaybe) {
  return `
    <div class="module-block">
      <div class="mod-head">${esc(title)} <span class="mod-req">${isMaybe ? "⚠️ 以教务系统为准" : ""}</span></div>
      <div style="overflow-x:auto"><table class="tbl">
        <tr><th style="width:60px">学分</th><th>课程</th><th>说明</th><th style="width:150px">学生评价</th></tr>
        ${courses.map(c => `
          <tr>
            <td class="num"><b>${fmtCredit(c.credit)}</b></td>
            <td>${esc(c.name)}${c.id ? `<span class="small muted"> · ${esc(c.id)}</span>` : ""}</td>
            <td class="small">${esc(c.note || "")}</td>
            <td>${scoreBadge(c.eval, true)}</td>
          </tr>`).join("")}
      </table></div>
    </div>`;
}

/* ---------- 先导课卡片 ---------- */
function introCardHTML(ic) {
  return `
    <div class="course-card">
      <div class="course-name">${ic.icon || ""} ${esc(ic.name)}</div>
      <div class="course-meta"><span>1 学分 · 四选二</span></div>
      <div class="course-meta"><span class="small">通向：${(ic.leads || []).map(esc).join(" / ")}</span></div>
      <div class="course-meta">${scoreBadge(ic.eval, true)}</div>
      ${reviewBlock(ic.eval, 1)}
    </div>`;
}

/* ---------- 方向预览表格 ---------- */
function previewTableHTML(pv) {
  return `
    <div style="overflow-x:auto"><table class="tbl">
      <tr><th>方向构成</th><th>学分</th><th>说明</th></tr>
      <tr><td>专业必修</td><td class="num">${pv.requiredCredit}</td><td class="small">共 ${pv.requiredCount} 门核心专业课</td></tr>
      <tr><td>专业限选</td><td class="num">${pv.limitedCredit}</td><td class="small">${(pv.limitedGroups || []).map(g => esc(g.name)).join("；") || "-"}</td></tr>
      <tr><td>专业总学分</td><td class="num">${pv.total}</td><td class="small">${pv.degree}（另加通识43+书院基础66）</td></tr>
    </table></div>
    <div class="mod-head mt16">该方向部分必修课预览（按你的兴趣排序，带评价）</div>
    <div class="grid-2">${pv.required.map(c => courseCardHTML(c)).join("")}</div>
    ${pv.more > 0 ? `<p class="small mt8">…还有 ${pv.more} 门必修课，完整清单见 <a href="pyfa.html">培养方案</a> 页</p>` : ""}`;
}

function directionName(code) {
  const map = {
    che: "化学生物学+化学工程与工业生物工程", polymer: "化学生物学+高分子材料与工程",
    env: "化学生物学+环境工程", water: "化学生物学+给排水科学与工程",
    bme: "化学生物学+生物医学工程", pharmacy: "化学生物学（药学方向）",
    smart_chem: "交叉工程·智能化工", env_ai: "交叉工程·环境人工智能",
    water_digital: "交叉工程·数智水务", smart_med: "交叉工程·智能医学工程",
  };
  return map[code] || code;
}

/** 课程卡片 HTML */
function courseCardHTML(c) {
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
