/* ============================================================
   培养方案浏览页
   ============================================================ */
"use strict";

let P = null; // pyfa data

async function initPyfa() {
  setActiveNav("pyfa");
  const data = await loadData();
  P = data.pyfa;
  render();
}

function render() {
  const root = document.getElementById("pyfaContent");
  const meta = P.meta;

  let html = `
    <div class="hero">
      <h1>📖 ${esc(meta.title)}</h1>
      <p>${esc(meta.target)}</p>
      <div class="badges">
        <span>学制 4 年</span>
        <span>总学分 146-160（按方向）</span>
        <span>数据源：官网培养方案 PDF + 选课系统（fajhh=263474011）</span>
      </div>
    </div>
    <div class="notice">${esc(meta.note)}</div>`;

  // ---------- 学分要求总表 ----------
  html += `<div class="card">
    <h2>📊 各方向学分要求一览</h2>
    <div class="sub">通识教育 + 书院基础 + 专业必修 + 专业限选 = 总学分</div>
    <div style="overflow-x:auto"><table class="tbl">
      <tr><th>专业方向</th><th>学位</th><th class="num">通识教育</th><th class="num">书院基础</th><th class="num">专业必修</th><th class="num">专业限选</th><th class="num">总学分</th></tr>
      ${P.credit_table.map(r => `
        <tr>
          <td>${esc(r.name)}</td><td>${esc(r.degree)}</td>
          <td class="num">${r.ge}</td><td class="num">${r.cb}</td>
          <td class="num">${r.mjr}</td><td class="num">${r.lim}</td>
          <td class="num"><b>${r.total}</b></td>
        </tr>`).join("")}
    </table></div>
  </div>`;

  // ---------- 选课系统学分修读要求 ----------
  const reqs = data.zhjwxk.credit_requirements;
  html += `<div class="card">
    <h2>🗂️ 选课系统课组学分要求（fajhh=263474011）</h2>
    <div class="sub">来自选课系统培养方案页面，展示每个课组最少修读门数/学分</div>
    <div style="overflow-x:auto"><table class="tbl">
      <tr><th>课组</th><th class="num">最少修读门数</th><th class="num">最少修读学分</th></tr>
      ${reqs.map(r => `<tr><td>${esc(r.group)}</td><td class="num">${r.min_courses === "" ? "-" : r.min_courses}</td><td class="num">${r.min_credit === "" ? "-" : r.min_credit}</td></tr>`).join("")}
    </table></div>
  </div>`;

  // ---------- 通识教育 ----------
  html += sectionCard("校级通识教育（43 学分）", renderGeneral());
  // ---------- 书院基础必修 ----------
  html += sectionCard("书院基础必修（66 学分）", renderCollege());
  // ---------- 专业课组 ----------
  html += `<div class="card">
    <h2>🎓 专业课组（按方向）</h2>
    <div class="sub">共 10 个方向：6 个双学位专业 + 药学单学位 + 4 个交叉工程项目。点击方向查看课程清单。</div>
    <div class="grid-3" id="majorCards">${Object.values(P.majors).map(m => `
      <div class="course-card" style="cursor:pointer" onclick="scrollToMajor('${m.code}')">
        <div class="course-name">${esc(m.name)}</div>
        <div class="course-meta">
          <span class="pill ${m.degree === "单学位" ? "pill-free" : "pill-req"}">${esc(m.degree)}</span>
          <span>专业必修 ${m.required_credit} + 限选 ${m.limited_credit} 学分</span>
        </div>
        <div class="course-meta"><span class="small">总学分 ${esc(String(m.total))}${m.extra ? "（" + esc(m.extra) + "）" : ""}</span></div>
      </div>`).join("")}
    </div>
  </div>`;

  // ---------- 各方向详情 ----------
  html += Object.values(P.majors).map(m => renderMajor(m)).join("");

  html += `<div class="card">
    <h2>📎 原始来源</h2>
    <ul style="margin:8px 0 0 20px;line-height:2">
      <li><a href="https://www.twc.tsinghua.edu.cn/info/1018/3818.htm" target="_blank" rel="noopener">探微书院官网·培养方案（2026级）PDF</a></li>
      <li><a href="https://zhjwxk.cic.tsinghua.edu.cn/jhBks.vjhBksPyfakzbBs.do?m=pyfakzFrame&fajhh=263474011&theModule=pyfa" target="_blank" rel="noopener">选课系统·本科生培养方案管理（需校内登录）</a></li>
      <li><a href="https://thubook.help/thucourse/" target="_blank" rel="noopener">THU选课社区（课程评价）</a></li>
    </ul>
  </div>`;

  root.innerHTML = html;
}

function sectionCard(title, inner) {
  return `<div class="card"><h2>${title}</h2>${inner}</div>`;
}

/* ---------- 通识教育 ---------- */
function renderGeneral() {
  const g = P.general;
  let h = "";
  h += renderGroup(g.ideological);
  h += renderGroup(g.pe);
  h += renderGroup(g.foreign_lang);
  h += renderGroup(g.writing);
  h += renderGroup(g.liberal);
  h += renderGroup(g.military);
  return h;
}

/* ---------- 书院基础 ---------- */
function renderCollege() {
  const c = P.college;
  return renderGroup(c.math) + renderGroup(c.physics) + renderGroup(c.chem_bio) + renderGroup(c.cs) + renderGroup(c.practice);
}

/** 渲染一个课组（含 required/limited/free/groups 结构） */
function renderGroup(grp) {
  let h = `<h3>${esc(grp.title)}</h3>`;
  if (grp.note) h += `<p class="small mb8">📌 ${esc(grp.note)}</p>`;

  const renderList = (list, attr) => {
    let out = "";
    list.forEach(item => {
      if (item.name && typeof item.credit === "number") {
        out += courseRow(item, attr);
      } else if (item.courses) {
        out += `<tr class="tbl-group-row"><td colspan="4">▸ ${esc(item.group || "任选其一")}</td></tr>`;
        item.courses.forEach(c => out += courseRow(c, attr));
      } else if (item.modules) {
        item.modules.forEach(mod => {
          out += `<tr class="tbl-group-row"><td colspan="4">▸ ${esc(mod.name)}</td></tr>`;
          mod.courses.forEach(c => out += courseRow(c, attr));
        });
      }
    });
    return out;
  };

  const rows = [];
  if (grp.required) rows.push(`<tr class="tbl-group-row"><td colspan="4">必修</td></tr>` + renderList(grp.required, "必修"));
  if (grp.limited) rows.push(`<tr class="tbl-group-row"><td colspan="4">限选</td></tr>` + renderList(grp.limited, "限选"));
  if (grp.free) rows.push(`<tr class="tbl-group-row"><td colspan="4">任选</td></tr>` + renderList(grp.free, "任选"));
  if (grp.groups) {
    grp.groups.forEach(sub => {
      rows.push(`<tr class="tbl-group-row"><td colspan="4">▸ ${esc(sub.name)}</td></tr>` + renderList(sub.courses, "限选"));
    });
  }
  if (!rows.length) return h;

  h += `<div style="overflow-x:auto"><table class="tbl">
    <tr><th style="width:110px">课程编号</th><th>课程名称</th><th class="num" style="width:70px">学分</th><th>备注</th></tr>
    ${rows.join("")}
  </table></div>`;
  return h;
}

/** 课程行（含评价徽章） */
function courseRow(c, attr) {
  return `
    <tr>
      <td>${c.id ? esc(c.id) : "新开课"}</td>
      <td>${esc(c.name)} ${scoreBadge(c.eval, true)}</td>
      <td class="num">${fmtCredit(c.credit)}</td>
      <td class="small">${esc(c.note || "")}</td>
    </tr>`;
}

/* ---------- 方向详情 ---------- */
function renderMajor(m) {
  let h = `<div class="card" id="major-${m.code}">
    <h2>${esc(m.name)} ${m.degree === "单学位" ? `<span class="pill pill-free">单学位</span>` : `<span class="pill pill-req">双学位</span>`}</h2>
    <div class="sub">专业总学分 ${m.total}（专业必修 ${m.required_credit} + 限选 ${m.limited_credit}）${m.extra ? " · " + esc(m.extra) : ""}</div>`;

  if (m.required) {
    h += `<h3>📌 必修课组（${m.required_credit} 学分）</h3>
      <div style="overflow-x:auto"><table class="tbl">
        <tr><th style="width:110px">课程编号</th><th>课程名称</th><th class="num" style="width:70px">学分</th><th>备注</th></tr>`;
    m.required.forEach(item => {
      if (item.name && typeof item.credit === "number") {
        h += courseRow(item, "必修");
      } else if (item.courses) {
        h += `<tr class="tbl-group-row"><td colspan="4">▸ ${esc(item.group || "任选其一")}</td></tr>`;
        item.courses.forEach(c => h += courseRow(c, "必修"));
      } else if (item.modules) {
        item.modules.forEach(mod => {
          h += `<tr class="tbl-group-row"><td colspan="4">▸ ${esc(mod.name)}</td></tr>`;
          mod.courses.forEach(c => h += courseRow(c, "必修"));
        });
      }
    });
    h += `</table></div>`;
  }

  if (m.limited) {
    h += `<h3>🔍 限选课组（${m.limited_credit} 学分）</h3>`;
    m.limited.forEach(g => {
      h += `<p class="small" style="font-weight:600;margin:10px 0 4px">${esc(g.group)}${g.credit ? `（需修 ${g.credit} 学分）` : ""}</p>`;
      h += `<div style="overflow-x:auto"><table class="tbl">
        <tr><th style="width:110px">课程编号</th><th>课程名称</th><th class="num" style="width:70px">学分</th><th>备注</th></tr>`;
      (g.courses || []).forEach(c => h += courseRow(c, "限选"));
      (g.modules || []).forEach(mod => {
        h += `<tr class="tbl-group-row"><td colspan="4">▸ ${esc(mod.name)}</td></tr>`;
        mod.courses.forEach(c => h += courseRow(c, "限选"));
      });
      h += `</table></div>`;
    });
  }

  if (m.free) {
    h += `<h3>🆓 任选课组</h3><div style="overflow-x:auto"><table class="tbl">
      <tr><th style="width:110px">课程编号</th><th>课程名称</th><th class="num" style="width:70px">学分</th><th>备注</th></tr>`;
    m.free.forEach(c => h += courseRow(c, "任选"));
    h += `</table></div>`;
  }

  if (m.other_note) h += `<p class="small mt8">📌 ${esc(m.other_note)}</p>`;
  if (m.grad) {
    h += `<h3>🎓 本研衔接课程（推研后可提前修读，不计入本科总学分）</h3><div style="overflow-x:auto"><table class="tbl">
      <tr><th style="width:110px">课程编号</th><th>课程名称</th><th class="num" style="width:70px">学分</th><th>备注</th></tr>`;
    m.grad.forEach(c => h += courseRow(c, "限选"));
    h += `</table></div>`;
  }

  h += `</div>`;
  return h;
}

function scrollToMajor(code) {
  const el = document.getElementById("major-" + code);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

let data = null;
document.addEventListener("DOMContentLoaded", () => {
  loadData().then(d => { data = d; return initPyfa(); });
});
