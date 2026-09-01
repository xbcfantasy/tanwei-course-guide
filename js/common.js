/* ============================================================
   探微书院2026选课助手 - 公共工具
   ============================================================ */
"use strict";

const DATA_URL = "data/site_data.json";
let SITE_DATA = null;

/** 加载站点数据（缓存） */
async function loadData() {
  if (SITE_DATA) return SITE_DATA;
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error("数据加载失败: " + res.status);
  SITE_DATA = await res.json();
  return SITE_DATA;
}

/** 归一化课程名（用于匹配） */
function normName(s) {
  return (s || "")
    .replace(/[ \u3000]/g, "")
    .replace(/[（】]/g, "(")
    .replace(/[）】]/g, ")")
    .replace(/·/g, "")
    .trim();
}

/** 渲染星级 */
function stars(avg) {
  const a = Math.round((avg || 0) * 2) / 2; // 0.5 步进
  let s = "";
  for (let i = 1; i <= 5; i++) {
    if (a >= i) s += "★";
    else if (a >= i - 0.5) s += "⯨";
    else s += "☆";
  }
  return `<span class="stars">${s}</span>`;
}

/** 评分徽章 */
function scoreBadge(evalData, compact) {
  if (!evalData || !evalData.count) {
    return `<span class="score-none">暂无评价</span>`;
  }
  const avg = evalData.avg;
  const cls = avg >= 4 ? "good" : avg >= 3 ? "warn" : "bad";
  const color = { good: "#067647", warn: "#b54708", bad: "#b42318" }[cls];
  const bg = { good: "#e8f7ef", warn: "#fff7e6", bad: "#fdecea" }[cls];
  const starsHtml = compact ? "" : stars(avg) + " ";
  return `<span class="score-badge" style="background:${bg};color:${color};border-color:${bg}">
    ${starsHtml}<b>${avg.toFixed(1)}</b><span style="font-weight:400;opacity:.75">(${evalData.count}条)</span></span>`;
}

/** 课程标签渲染 */
function courseTags(course) {
  const tags = [];
  if (course.attr) tags.push(attrPill(course.attr));
  return tags.join(" ");
}

function attrPill(attr) {
  const map = { "必修": ["pill-req", "必修"], "限选": ["pill-lim", "限选"], "任选": ["pill-free", "任选"] };
  const [cls, txt] = map[attr] || ["pill-tag", attr];
  return `<span class="pill ${cls}">${txt}</span>`;
}

/** 展开课程评价 */
function reviewBlock(evalData, max) {
  if (!evalData || !evalData.reviews || !evalData.reviews.length) return "";
  const list = evalData.reviews.slice(0, max || 2);
  return list.map(r => `
    <div class="review">
      <div class="rv-head">
        <span>${r.score ? "等第 " + r.score : "评分 " + (r.rating ?? "-")}${r.teacher ? " · " + r.teacher : ""}</span>
        <span>${r.date || ""}</span>
      </div>
      <div>${(r.comment || "").slice(0, 220)}${(r.comment || "").length > 220 ? "…" : ""}</div>
    </div>`).join("");
}

/** 转义 HTML */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/** 格式化学分 */
function fmtCredit(c) {
  const n = Number(c);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n : n.toFixed(1)) : c;
}

/** 顶栏导航激活 */
function setActiveNav(key) {
  document.querySelectorAll(".nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === key);
  });
}

/** 渲染公共页脚 */
function renderFooter() {
  const footer = document.querySelector(".footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="wrap" style="padding-bottom:0">
      <p>本网站为公益选课辅助工具，数据来源：<a href="https://www.twc.tsinghua.edu.cn/info/1018/3818.htm" target="_blank" rel="noopener">探微书院培养方案（官网）</a>、
      <a href="https://zhjwxk.cic.tsinghua.edu.cn/jhBks.vjhBksPyfakzbBs.do?m=pyfakzFrame&fajhh=263474011&theModule=pyfa" target="_blank" rel="noopener">选课系统培养方案</a>、
      <a href="https://thubook.help/thucourse/" target="_blank" rel="noopener">THU选课社区（thubook.help）</a>。</p>
      <p class="mt8">课程评价来自学生自发分享，仅供参考；选课请以教务系统与培养方案正式文件为准。本站与清华大学官方无关联。</p>
    </div>`;
}

document.addEventListener("DOMContentLoaded", renderFooter);
