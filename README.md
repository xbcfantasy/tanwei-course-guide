# 探微书院 2026 选课助手（Tanwei Course Guide）

面向清华大学探微书院 2026 级新生的**选课指导公开网站**。把官方培养方案和学长学姐的真实课程评价揉在一起，通过一份喜好问卷，按「**必选 / 限选 / 任选**」框架生成个性化选课清单。

## 🌐 线上地址

**https://xbcfantasy.github.io/tanwei-course-guide/**

## 🚀 快速使用

纯静态站点，无需构建，直接部署到任意静态托管即可。

**本地预览：**

```bash
cd tanwei-course-guide
python3 -m http.server 8080
# 打开 http://127.0.0.1:8080
```

> ⚠️ 由于页面通过 `fetch` 加载 `data/site_data.json`，请务必通过 HTTP 服务器访问（直接双击打开 html 会因 CORS 无法加载数据）。

**公开部署（任选其一）：**

| 平台 | 方式 |
|---|---|
| GitHub Pages | 把本目录推到仓库，Settings → Pages → 选择分支根目录 |
| Vercel | `vercel` CLI 或导入仓库，框架选 "Other"，构建命令留空 |
| Netlify | 拖拽本目录到 Netlify Drop（https://app.netlify.com/drop）即可 |
| Cloudflare Pages | 导入仓库，构建命令留空，输出目录 `/` |

## 📄 功能页面

- **首页 `index.html`** — 项目介绍、选课要点速览
- **选课指导 `guide.html`** — 7 题喜好问卷 → 个性化选课清单（核心功能）
  - 必选：书院基础必修 + 所选方向专业必修（附评价徽章）
  - 限选：按「兴趣匹配度 × 课程口碑」排序的模块课程（含点评关键词分析）
  - 任选：按拓展兴趣推荐高分通识课程
  - 学分规划：按负荷偏好给出每学期建议
  - 分享：结果页可一键复制带问卷答案的分享链接，同学打开即见同样结果
- **培养方案 `pyfa.html`** — 完整培养方案浏览：学分要求总表、通识教育、书院基础、10 个方向的必修/限选/任选课程清单
- **课程库 `courses.html`** — 3000+ 门课程搜索，按课组/属性/评分筛选，可展开查看学生评价

## 📊 数据来源

| 数据 | 来源 |
|---|---|
| 培养方案（通识+书院基础，3043 门课程含必修/限选/任选属性） | 选课系统培养方案 fajhh=263474011（`zhjwxk.cic.tsinghua.edu.cn`，需校内登录） |
| 培养方案（培养目标、学分总表、专业课组 10 方向） | 探微书院官网 2026 级培养方案 PDF（`twc.tsinghua.edu.cn/info/1018/3818.htm`） |
| 课程评价（759 门匹配到评分，含 100 条详细点评） | [THU选课社区 thubook.help/thucourse](https://thubook.help/thucourse/) |

原始抓取文件保存在 `sources/` 目录（含用户提供的选课系统完整保存页 `计划本科生培养方案管理.html` 及其资源目录）。

## 🛠️ 数据构建（可选，已内置构建好的 `data/site_data.json`）

```bash
# 0. 批量下载与培养方案匹配课程的学生评价（512 门课、1400+ 条点评）
python3 scripts/fetch_reviews.py   # 输出到 data/reviews_raw/

# 1. 解析官网培养方案 PDF → data/tanwei_pyfa.json
python3 scripts/build_pyfa_data.py

# 2. 解析选课系统课程明细 → data/zhjwxk_courses.json
python3 scripts/parse_zhjwxk.py

# 3. 融合培养方案 + 评价数据 → data/site_data.json
python3 scripts/merge_data.py
```

依赖：`pip install --target ./pylibs pypdf`（已装入 `pylibs/`，运行前 `export PYTHONPATH=./pylibs`）。

## 📁 目录结构

```
tanwei-course-guide/
├── index.html / guide.html / pyfa.html / courses.html   # 四个页面
├── css/style.css                                        # 样式
├── js/
│   ├── common.js        # 公共工具：数据加载、评分渲染
│   ├── quiz.js          # 问卷定义与方向→模块标签映射
│   ├── recommend.js     # 推荐引擎（必选/限选/任选/学分规划）
│   ├── guide.js         # 问卷交互 + 结果渲染
│   ├── pyfa.js          # 培养方案浏览页
│   └── courses.js       # 课程库搜索页
├── data/
│   ├── site_data.json   # 最终站点数据（624KB）
│   ├── tanwei_pyfa.json # 官网培养方案结构化数据
│   └── zhjwxk_courses.json  # 选课系统课程明细
├── scripts/             # 数据构建脚本
├── sources/             # 原始数据抓取归档
└── README.md
```

## ⚖️ 免责声明

- 课程评价来自学生自发分享（THU 选课社区），**仅供参考**，不代表学校官方观点；
- 选课请以教务系统与培养方案正式文件为准，本站与清华大学官方无关联；
- 课程开课情况、课容量、给分每年可能变化，请以选课系统实际为准。

## 📜 致谢

- [THU选课社区](https://thubook.help/thucourse/) 的课程评价数据
- 探微书院官网与选课系统的公开培养方案
