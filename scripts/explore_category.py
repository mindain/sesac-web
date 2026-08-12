"""카테고리 다양성이 이상 사용자 신호가 되는지 확인한다.

가설: 사람은 몇 개 카테고리만 본다. 무차별로 여러 카테고리를 훑으면 크롤러다.
검증 방법: 조회량이 비슷한 구간 안에서 '구매자'와 '무행동자'의 카테고리 다양성을 비교한다.
        같은 조회량인데 무행동자만 다양성이 높다면, 다양성은 볼륨과 독립된 신호다.

메모리를 아끼려고 2회차에서 조회 5건 이상인 방문자의 카테고리 집합만 모은다.
"""

import csv
import json
import os
from array import array
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")
MAP = os.path.join(ROOT, "data", "item_map.json")

MIN_VIEW = 5  # 다양성을 논할 수 있는 최소 조회수


def main():
    with open(MAP, encoding="utf-8") as f:
        item_map = json.load(f)
    cat_of = item_map["category"]
    avail_of = item_map["available"]

    # 1회차: 방문자별 이벤트 수
    max_id = 0
    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            v = int(row[1])
            if v > max_id:
                max_id = v
    n = max_id + 1

    n_view = array("i", bytes(4 * n))
    n_cart = array("i", bytes(4 * n))
    n_txn = array("i", bytes(4 * n))

    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            v = int(row[1])
            ev = row[2]
            if ev == "view":
                n_view[v] += 1
            elif ev == "addtocart":
                n_cart[v] += 1
            elif ev == "transaction":
                n_txn[v] += 1

    # 2회차: 조회 5건 이상인 방문자만 카테고리 집합 수집
    cats = defaultdict(set)
    unavail = defaultdict(int)   # 품절 상품 조회 수
    no_cat = 0
    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp" or row[2] != "view":
                continue
            v = int(row[1])
            if n_view[v] < MIN_VIEW:
                continue
            item = row[3]
            c = cat_of.get(item)
            if c is None:
                no_cat += 1
                continue
            cats[v].add(c)
            if avail_of.get(item) == "0":
                unavail[v] += 1

    print(f"조회 {MIN_VIEW}건 이상 방문자 {len(cats):,}명")
    print(f"카테고리를 못 찾은 조회 이벤트 {no_cat:,}건\n")

    # 조회량 구간별로 구매자 / 무행동자의 다양성 비교
    bands = [(5, 9), (10, 19), (20, 49), (50, 99), (100, 10**9)]
    print(f"{'조회량':>10} | {'집단':>8} | {'인원':>8} | {'평균 카테고리':>12} | {'카테고리/조회':>12} | {'품절조회비율':>10}")
    print("-" * 84)

    for lo, hi in bands:
        for label, is_member in [
            ("구매자", lambda v: n_txn[v] > 0),
            ("장바구니만", lambda v: n_txn[v] == 0 and n_cart[v] > 0),
            ("무행동", lambda v: n_txn[v] == 0 and n_cart[v] == 0),
        ]:
            members = [v for v in cats if lo <= n_view[v] <= hi and is_member(v)]
            if not members:
                continue
            avg_cat = sum(len(cats[v]) for v in members) / len(members)
            avg_ratio = sum(len(cats[v]) / n_view[v] for v in members) / len(members)
            avg_un = sum(unavail[v] / n_view[v] for v in members) / len(members)
            band = f"{lo}-{hi if hi < 10**9 else '+'}"
            print(f"{band:>10} | {label:>8} | {len(members):>8,} | {avg_cat:>12.1f} | "
                  f"{avg_ratio:>12.3f} | {avg_un:>10.3f}")
        print("-" * 84)


if __name__ == "__main__":
    main()
