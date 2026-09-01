# -*- coding: utf-8 -*-
"""
数据融合：生成网站最终数据
1. 选课系统(zhjwxk) 3043门课程 → 通识教育 + 书院基础（含必修/限选/任选属性）
2. 官网PDF专业课组 → 10个方向的必修/限选/任选
3. thubook.help 评价数据 → 按课程名匹配 count/avg/reviews
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- load sources ----------
with open(os.path.join(ROOT, "data", "zhjwxk_courses.json"), encoding="utf-8") as f:
    zhjwxk = json.load(f)
with open(os.path.join(ROOT, "data", "tanwei_pyfa.json"), encoding="utf-8") as f:
    pyfa = json.load(f)
with open(os.path.join(ROOT, "with_comment_index.json"), encoding="utf-8") as f:
    wc = json.load(f)["courses"]
with open(os.path.join(ROOT, "reviews_latest.json"), encoding="utf-8") as f:
    latest = json.load(f)

# ---------- evaluation index by normalized course name ----------
def norm(s):
    s = (s or "").replace(" ", "").replace("　", "")
    s = s.replace("（", "(").replace("）", ")").replace("·", "").strip()
    return s

eval_by_name = {}
for k, v in wc.items():
    n = norm(v["kcm"])
    eval_by_name[n] = {
        "name": v["kcm"], "count": v.get("count", 0),
        "avg": round(float(v.get("avg", 0)), 2), "dept": (v.get("kkdw") or "").strip(),
    }
reviews_by_course = {}
for r in latest:
    n = norm(r.get("_course_name", ""))
    reviews_by_course.setdefault(n, []).append({
        "rating": r.get("rating"), "score": r.get("score"),
        "comment": (r.get("comment") or "").strip(), "teacher": r.get("_course_teacher"),
        "date": r.get("created_at"),
    })

def lookup_eval(name):
    n = norm(name)
    if n in eval_by_name:
        e = eval_by_name[n]
        return {**e, "reviews": reviews_by_course.get(n, [])}
    # fuzzy: exact match on first 6 chars
    for k, v in eval_by_name.items():
        if len(n) >= 6 and (n[:6] == k[:6]):
            return {**v, "reviews": reviews_by_course.get(k, [])}
    return None

# ---------- attach eval to zhjwxk courses ----------
zhjwxk_merged = []
for c in zhjwxk:
    e = lookup_eval(c["name"])
    item = dict(c)
    item["eval"] = e
    zhjwxk_merged.append(item)

# ---------- attach eval to pyfa courses (recursive) ----------
def attach(obj):
    if isinstance(obj, dict):
        if "name" in obj and "credit" in obj and isinstance(obj.get("credit"), (int, float)):
            obj["eval"] = lookup_eval(obj["name"])
        for v in obj.values():
            attach(v)
    elif isinstance(obj, list):
        for v in obj:
            attach(v)

attach(pyfa)

# ---------- stats ----------
matched = sum(1 for c in zhjwxk_merged if c.get("eval"))
print(f"zhjwxk 课程: {len(zhjwxk_merged)}, 有评价: {matched}")

# ---------- write merged data ----------
final = {
    "meta": pyfa["meta"],
    "credit_table": pyfa["credit_table"],
    "zhjwxk": {
        "source": "https://zhjwxk.cic.tsinghua.edu.cn/jhBks.vjhBksPyfakzbBs.do?m=pyfakzFrame&fajhh=263474011&theModule=pyfa",
        "credit_requirements": [
            {"group": "思政必修课", "min_courses": "", "min_credit": 12},
            {"group": "思政限选课", "min_courses": 1, "min_credit": 1},
            {"group": "形势与政策(1)", "min_courses": 1, "min_credit": 1},
            {"group": "形势与政策(2)", "min_courses": 1, "min_credit": 1},
            {"group": "政治理论课(信)", "min_courses": 9, "min_credit": 19},
            {"group": "港澳台学生课程", "min_courses": "", "min_credit": 5},
            {"group": "中国概况(国际生必修)", "min_courses": 1, "min_credit": 2},
            {"group": "政治理论课（大类）", "min_courses": 7, "min_credit": 21},
            {"group": "军事课(内地及港澳)", "min_courses": 2, "min_credit": 4},
            {"group": "军事课(中国台湾学生)", "min_courses": 1, "min_credit": 3},
            {"group": "军事课(国际学生)", "min_courses": 1, "min_credit": 3},
            {"group": "体育必修", "min_courses": 7, "min_credit": 4},
            {"group": "体育选修", "min_courses": "", "min_credit": ""},
            {"group": "运动训练", "min_courses": 8, "min_credit": ""},
            {"group": "英语必修课组(1级)", "min_courses": "", "min_credit": 4},
            {"group": "英语必修课组(2级)", "min_courses": "", "min_credit": 4},
            {"group": "英语必修课组(3、4级)", "min_courses": "", "min_credit": 4},
            {"group": "英语限选课组", "min_courses": "", "min_credit": 4},
            {"group": "英语排课课组", "min_courses": "", "min_credit": ""},
            {"group": "外文认定课", "min_courses": "", "min_credit": ""},
            {"group": "留学生汉语基础课", "min_courses": "", "min_credit": 4},
            {"group": "国际生语言课", "min_courses": "", "min_credit": 8},
            {"group": "通识选修", "min_courses": "", "min_credit": 11},
            {"group": "通识选修-科学", "min_courses": "", "min_credit": 2},
            {"group": "通识选修-人文", "min_courses": "", "min_credit": 2},
            {"group": "通识选修-社科", "min_courses": "", "min_credit": 2},
            {"group": "通识选修-艺术", "min_courses": "", "min_credit": 2},
            {"group": "通识-日新/社科", "min_courses": "", "min_credit": 8},
            {"group": "写作与沟通(春季)", "min_courses": 1, "min_credit": 2},
            {"group": "数学必修", "min_courses": 4, "min_credit": 17},
            {"group": "物理基础", "min_courses": 3, "min_credit": 9},
            {"group": "化生必修", "min_courses": 7, "min_credit": 21},
            {"group": "书院实践", "min_courses": 3, "min_credit": 11},
            {"group": "先导课组", "min_courses": 2, "min_credit": 2},
            {"group": "信计课程", "min_courses": 3, "min_credit": 6},
            {"group": "写沟", "min_courses": 1, "min_credit": 2},
        ],
        "courses": zhjwxk_merged,
    },
    "pyfa": pyfa,
    "eval_meta": {
        "source": "https://thubook.help/thucourse/",
        "with_comment_courses": len(wc),
        "total_reviews_public": 2689,
    },
}

out = os.path.join(ROOT, "data", "site_data.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False)
print("written:", out, os.path.getsize(out), "bytes")
