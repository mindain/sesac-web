"""item_properties zip 2개에서 상품 -> 카테고리 / 품절여부 맵을 뽑는다.

zip을 풀지 않고 스트리밍으로 읽는다 (원본 2,027만 행, 압축 해제 시 1GB+).
해시되지 않은 값은 categoryid와 available 둘뿐이라 그 두 property만 남긴다.
속성은 시간에 따라 변하므로 timestamp가 가장 최근인 스냅샷을 취한다.

출력: data/item_map.json  { "category": {itemid: categoryid}, "available": {itemid: 0|1} }
"""

import csv
import io
import json
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
ZIPS = [
    r"C:\Users\darwi\Downloads\item_properties_part1.csv.zip",
    r"C:\Users\darwi\Downloads\item_properties_part2.csv.zip",
]
OUT = os.path.join(DATA, "item_map.json")


def main():
    category = {}   # itemid -> (ts, categoryid)
    available = {}  # itemid -> (ts, 0|1)
    rows = 0

    for zpath in ZIPS:
        with zipfile.ZipFile(zpath) as z:
            name = z.namelist()[0]
            print(f"읽는 중: {name}")
            with z.open(name) as raw:
                reader = csv.reader(io.TextIOWrapper(raw, encoding="utf-8"))
                next(reader, None)  # 헤더
                for ts, itemid, prop, value in reader:
                    rows += 1
                    if prop == "categoryid":
                        t = int(ts)
                        cur = category.get(itemid)
                        if cur is None or t > cur[0]:
                            category[itemid] = (t, value)
                    elif prop == "available":
                        t = int(ts)
                        cur = available.get(itemid)
                        if cur is None or t > cur[0]:
                            available[itemid] = (t, value)

    out = {
        "category": {k: v[1] for k, v in category.items()},
        "available": {k: v[1] for k, v in available.items()},
    }
    os.makedirs(DATA, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    cats = set(out["category"].values())
    print()
    print(f"전체 속성 행      {rows:,}")
    print(f"카테고리 있는 상품 {len(out['category']):,}개")
    print(f"고유 카테고리      {len(cats):,}개")
    print(f"available 있는 상품 {len(out['available']):,}개")
    print(f"저장: {OUT} ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
