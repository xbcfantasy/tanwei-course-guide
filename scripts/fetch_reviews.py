# -*- coding: utf-8 -*-
"""批量下载 thubook 课程评价文件 data/courses/{sqid}.json"""
import json, os, time, urllib.request, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "reviews_raw")
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(ROOT, "data", "matched_sqids.json"), encoding="utf-8") as f:
    matched = json.load(f)
sqids = sorted(set(v["sqid"] for v in matched))
print(f"共 {len(sqids)} 个 sqid", flush=True)

done = 0
for sqid in sqids:
    path = os.path.join(OUT, f"{sqid}.json")
    if os.path.exists(path) and os.path.getsize(path) > 10:
        done += 1
        continue
    url = f"https://thubook.help/data/courses/{sqid}.json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        with open(path, "wb") as f:
            f.write(data)
        done += 1
        if done % 50 == 0:
            print(f"  已下载 {done}/{len(sqids)}", flush=True)
    except Exception as e:
        print(f"  FAIL {sqid}: {e}", flush=True)
    time.sleep(0.12)

print(f"完成: {done}/{len(sqids)}", flush=True)
