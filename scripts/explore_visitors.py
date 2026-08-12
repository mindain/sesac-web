"""방문자별 행동 분포를 본다. 이상 트래픽 규칙의 임계값을 감이 아니라 분포로 정하려고.

출력은 사람이 읽고 판단하는 용도. JSON을 만들지 않는다.
메모리를 아끼려고 visitorid를 인덱스로 쓰는 array를 쓴다 (dict 6개보다 훨씬 가볍다).
"""

import csv
import os
from array import array

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")


def pct(sorted_vals, p):
    if not sorted_vals:
        return 0
    i = min(len(sorted_vals) - 1, int(len(sorted_vals) * p))
    return sorted_vals[i]


def main():
    # 1회차: visitorid 최댓값
    max_id = 0
    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            v = int(row[1])
            if v > max_id:
                max_id = v
    n = max_id + 1
    print(f"visitorid 최댓값 {max_id:,} (배열 {n:,}칸)\n")

    n_view = array("i", bytes(4 * n))
    n_cart = array("i", bytes(4 * n))
    n_txn = array("i", bytes(4 * n))
    first_ts = array("q", bytes(8 * n))
    last_ts = array("q", bytes(8 * n))

    total = 0
    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            ts = int(row[0])
            v = int(row[1])
            ev = row[2]
            total += 1
            if ev == "view":
                n_view[v] += 1
            elif ev == "addtocart":
                n_cart[v] += 1
            elif ev == "transaction":
                n_txn[v] += 1
            if first_ts[v] == 0 or ts < first_ts[v]:
                first_ts[v] = ts
            if ts > last_ts[v]:
                last_ts[v] = ts

    counts = []
    for v in range(n):
        c = n_view[v] + n_cart[v] + n_txn[v]
        if c:
            counts.append(c)
    counts.sort()
    nv = len(counts)
    print(f"총 이벤트 {total:,} / 방문자 {nv:,}명\n")

    print("방문자당 이벤트 수 분포")
    for p, label in [(0.5, "중앙값"), (0.9, "상위 10%"), (0.99, "상위 1%"),
                     (0.999, "상위 0.1%"), (0.9999, "상위 0.01%")]:
        print(f"  {label:10s} {pct(counts, p):>8,}건")
    print(f"  {'최댓값':10s} {counts[-1]:>8,}건")

    # 상위 집단이 전체 이벤트에서 차지하는 비중
    print("\n상위 방문자가 차지하는 이벤트 비중")
    for p in (0.001, 0.01, 0.05):
        k = max(1, int(nv * p))
        share = sum(counts[-k:]) / total
        print(f"  상위 {p * 100:>5.1f}%  {k:>7,}명이 전체 이벤트의 {share * 100:5.2f}%")

    # 규칙 후보별로 몇 명, 몇 이벤트가 걸리는지
    print("\n규칙 후보별 적발 규모")
    thr_top01 = pct(counts, 0.999)
    rules = {
        f"R1 이벤트 {thr_top01}건 이상 (상위 0.1%)": lambda v, c, gap: c >= thr_top01,
        "R2 평균 간격 1초 미만 (이벤트 5건 이상)": lambda v, c, gap: c >= 5 and gap is not None and gap < 1.0,
        "R3 조회 100건 이상, 장바구니·구매 0": lambda v, c, gap: n_view[v] >= 100 and n_cart[v] == 0 and n_txn[v] == 0,
    }
    hit_visitors = {k: 0 for k in rules}
    hit_events = {k: 0 for k in rules}
    any_v = 0
    any_e = 0
    # 제거 후 지표
    kept_view = kept_cart = kept_txn = 0

    for v in range(n):
        c = n_view[v] + n_cart[v] + n_txn[v]
        if not c:
            continue
        gap = None
        if c > 1:
            gap = (last_ts[v] - first_ts[v]) / 1000 / (c - 1)
        flagged = False
        for k, fn in rules.items():
            if fn(v, c, gap):
                hit_visitors[k] += 1
                hit_events[k] += c
                flagged = True
        if flagged:
            any_v += 1
            any_e += c
        else:
            kept_view += n_view[v]
            kept_cart += n_cart[v]
            kept_txn += n_txn[v]

    for k in rules:
        print(f"  {k}")
        print(f"      방문자 {hit_visitors[k]:>7,}명  이벤트 {hit_events[k]:>9,}건 "
              f"({hit_events[k] / total * 100:.2f}%)")
    print(f"  합집합(하나라도 걸림)")
    print(f"      방문자 {any_v:>7,}명  이벤트 {any_e:>9,}건 ({any_e / total * 100:.2f}%)")

    tv = sum(n_view)
    tc = sum(n_cart)
    tt = sum(n_txn)
    print("\n정제 전 → 후 지표 변화")
    print(f"  조회       {tv:>10,} → {kept_view:>10,}")
    print(f"  장바구니   {tc:>10,} → {kept_cart:>10,}")
    print(f"  구매       {tt:>10,} → {kept_txn:>10,}")
    print(f"  조회→장바구니  {tc / tv * 100:.2f}% → {kept_cart / kept_view * 100:.2f}%")
    print(f"  조회→구매      {tt / tv * 100:.2f}% → {kept_txn / kept_view * 100:.2f}%")


if __name__ == "__main__":
    main()
