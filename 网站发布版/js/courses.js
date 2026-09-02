/* ============================================================
   课程库：搜索 + 筛选
   ============================================================ */
"use strict";

const coursesApp = {
  all: [],
  page: 1,
  pageSize: 40,

  async init() {
    setActiveNav("courses");
    const data = await loadData();
    this.all = data.zhjwxk.courses || [];
    this.buildFilters();
    this.search();
  },

  buildFilters() {
    const groups = [...new Set(this.all.map(c => c.group))].sort();
    const sel = document.getElementById("groupFilter");
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `${g}（${this.all.filter(c => c.group === g).length}）`;
      sel.appendChild(opt);
    });
    document.getElementById("totalCount").textContent = this.all.length;
    document.getElementById("ratedCount").textContent = this.all.filter(c => c.eval && c.eval.count).length;

    // 快捷筛选
    const chips = document.getElementById("quickChips");
    const presets = [
      { label: "⭐ 高分课程（≥4分）", fn: c => c.eval && c.eval.count && c.eval.avg >= 4 },
      { label: "🧪 化生必修", fn: c => c.group === "化生必修" },
      { label: "🧮 数学必修", fn: c => c.group === "数学必修" },
      { label: "🔢 信计课程", fn: c => c.group === "信计课程" },
      { label: "🌱 先导课组", fn: c => c.group === "先导课组" },
      { label: "🆓 任选课程", fn: c => c.attr === "任选" },
    ];
    presets.forEach(p => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = p.label;
      b.addEventListener("click", () => {
        document.getElementById("searchInput").value = "";
        document.getElementById("groupFilter").value = "";
        document.getElementById("attrFilter").value = "";
        document.getElementById("scoreFilter").value = "";
        document.querySelectorAll("#quickChips .chip").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
        this._quickFn = p.fn;
        this.search();
      });
      chips.appendChild(b);
    });
  },

  search() {
    const kw = (document.getElementById("searchInput").value || "").trim().toLowerCase();
    const g = document.getElementById("groupFilter").value;
    const attr = document.getElementById("attrFilter").value;
    const sc = document.getElementById("scoreFilter").value;

    let list = this.all.filter(c => {
      if (g && c.group !== g) return false;
      if (attr && c.attr !== attr) return false;
      if (sc === "4" && !(c.eval && c.eval.count && c.eval.avg >= 4)) return false;
      if (sc === "3" && !(c.eval && c.eval.count && c.eval.avg >= 3)) return false;
      if (sc === "rated" && !(c.eval && c.eval.count)) return false;
      if (this._quickFn && !this._quickFn(c)) return false;
      if (kw) {
        const hit = (c.name || "").toLowerCase().includes(kw) ||
          (c.id || "").toLowerCase().includes(kw) ||
          (c.group || "").toLowerCase().includes(kw);
        if (!hit) return false;
      }
      return true;
    });

    // 排序：有评价的优先（按评分），无评价的按课组
    list.sort((a, b) => {
      const ea = a.eval && a.eval.count ? a.eval.avg : -1;
      const eb = b.eval && b.eval.count ? b.eval.avg : -1;
      if (ea !== eb) return eb - ea;
      return (a.group || "").localeCompare(b.group || "", "zh");
    });

    const total = list.length;
    const pageCount = Math.ceil(total / this.pageSize);
    const page = Math.min(this.page, pageCount) || 1;
    const slice = list.slice((page - 1) * this.pageSize, page * this.pageSize);

    const box = document.getElementById("courseList");
    if (!total) {
      box.innerHTML = `<p class="small" style="text-align:center;padding:30px">没有找到匹配的课程，换个关键词试试～</p>`;
      return;
    }

    box.innerHTML = `
      <p class="small mb16">共 ${total} 门 · 第 ${page}/${pageCount} 页</p>
      <div class="grid-2">${slice.map(c => this.cardHTML(c)).join("")}</div>
      <div class="mt16" style="text-align:center">
        <button class="btn btn-soft" onclick="coursesApp.pageDown()" ${page <= 1 ? "disabled" : ""}>← 上一页</button>
        <button class="btn btn-soft" style="margin-left:8px" onclick="coursesApp.pageUp()" ${page >= pageCount ? "disabled" : ""}>下一页 →</button>
      </div>`;
  },

  cardHTML(c) {
    const ev = c.eval;
    return `
      <div class="course-card">
        <div class="course-name">${esc(c.name)} ${attrPill(c.attr)}</div>
        <div class="course-meta">
          <span>${fmtCredit(c.credit)} 学分</span>
          <span class="pill pill-tag">${esc(c.group)}</span>
          ${c.id ? `<span>${esc(c.id)}</span>` : ""}
        </div>
        <div class="course-meta">${scoreBadge(ev, false)}</div>
        ${ev && ev.count ? `<details class="detail"><summary>${ev.count} 条学生评价</summary>${reviewBlock(ev, 3)}</details>` : ""}
      </div>`;
  },

  pageUp() { this.page++; this.search(); },
  pageDown() { this.page = Math.max(1, this.page - 1); this.search(); },
};

document.addEventListener("DOMContentLoaded", () => coursesApp.init());
