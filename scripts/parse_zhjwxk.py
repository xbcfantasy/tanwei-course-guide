# -*- coding: utf-8 -*-
"""
解析选课系统(zhjwxk)保存的培养方案课程明细
来源: 计划本科生培养方案管理_files/jhBks.vjhBksPyfakcbBs.html (课程明细, 3048门)
处理合并单元格: 所属课组/课程属性 使用 rowspan 合并
"""
import re, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "计划本科生培养方案管理_files", "jhBks.vjhBksPyfakcbBs.html")

with open(SRC, 'rb') as f:
    raw = f.read()
text = raw.decode('gbk', errors='replace')

rows = re.findall(r'<tr[^>]*class="(?:trr1|trr2|gridRow)[^"]*"[^>]*>(.*?)</tr>', text, re.S)
print('rows found:', len(rows))

courses = []          # list of {group, attr, id, name, credit}
cur_group = None      # carry-forward for rowspan merged cells
cur_attr = None

for r in rows:
    tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
    vals = []
    for t in tds:
        v = re.sub(r'<[^>]+>', '', t).replace('&nbsp;', '').strip()
        vals.append(v)
    vals = [v for v in vals if v != '']
    if not vals:
        continue
    # header row
    if vals[0] == '所属课组':
        continue
    # 5 cols: group attr id name credit
    if len(vals) >= 5:
        cur_group, cur_attr, cid, cname, credit = vals[0], vals[1], vals[2], vals[3], vals[4]
    elif len(vals) == 4:
        # merged group+attr (carry forward), row: id name credit + maybe attr
        cid, cname, credit = vals[-3], vals[-2], vals[-1]
    elif len(vals) == 3:
        cid, cname, credit = vals
    else:
        continue
    courses.append({
        "group": cur_group, "attr": cur_attr,
        "id": cid, "name": cname,
        "credit": float(credit) if credit.replace('.','').isdigit() else credit
    })

print('parsed courses:', len(courses))

# stats
from collections import Counter
attr_cnt = Counter(c['attr'] for c in courses)
grp_cnt = Counter(c['group'] for c in courses)
print('attr counts:', dict(attr_cnt))
print('\n课组分布:')
for g, n in grp_cnt.most_common():
    print(f'  {g}: {n}')

out = os.path.join(ROOT, "data", "zhjwxk_courses.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    json.dump(courses, f, ensure_ascii=False, indent=1)
print('\nwritten:', out, os.path.getsize(out), 'bytes')
