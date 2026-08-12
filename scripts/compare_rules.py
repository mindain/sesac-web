"""이상 트래픽 규칙 후보를 나란히 비교한다.

1차 탐색에서 배운 것:
  - 이벤트 수만으로 자르면(R1) 우량 고객이 잘려 전환율이 오히려 떨어진다
  - 평균 간격은 4.5개월에 희석돼 쓸모가 없다(11명만 적발)
그래서 후보를 전부 "많이 봤는데 아무 행동도 안 했다" 축으로 다시 세운다.

각 후보에 대해 적발 규모와 정제 후 지표를 출력한다. 사람이 읽고 고른다.
"""

import csv
import os
from array import array

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")


def main():
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

    total = 0
    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            v = int(row[1])
            ev = row[2]
            total += 1
            if ev == "view":
                n_view[v] += 1
            elif ev == "addtocart":
                n_cart[v] += 1
            elif ev == "transaction":
                n_txn[v] += 1

    tv, tc, tt = sum(n_view), sum(n_cart), sum(n_txn)

    # 상위 0.1% 임계값
    counts = sorted(
        n_view[v] + n_cart[v] + n_txn[v]
        for v in range(n)
        if n_view[v] or n_cart[v] or n_txn[v]
    )
    thr_top01 = counts[int(len(counts) * 0.999)]

    candidates = [
        ("R3-a 조회 100건+ / 장바구니·구매 0", lambda v: n_view[v] >= 100 and n_cart[v] == 0 and n_txn[v] == 0),
        ("R3-b 조회  50건+ / 장바구니·구매 0", lambda v: n_view[v] >= 50 and n_cart[v] == 0 and n_txn[v] == 0),
        ("R3-c 조회  30건+ / 장바구니·구매 0", lambda v: n_view[v] >= 30 and n_cart[v] == 0 and n_txn[v] == 0),
        (f"R3-d 상위 0.1%({thr_top01}건+) / 구매 0", lambda v: (n_view[v] + n_cart[v] + n_txn[v]) >= thr_top01 and n_txn[v] == 0),
    ]

    print(f"정제 전  조회 {tv:,} / 장바구니 {tc:,} / 구매 {tt:,}")
    print(f"         조회→장바구니 {tc / tv * 100:.2f}%  조회→구매 {tt / tv * 100:.2f}%")
    print()

    for label, fn in candidates:
        hv = he = 0
        kv = kc = kt = 0
        for v in range(n):
            c = n_view[v] + n_cart[v] + n_txn[v]
            if not c:
                continue
            if fn(v):
                hv += 1
                he += c
            else:
                kv += n_view[v]
                kc += n_cart[v]
                kt += n_txn[v]
        print(label)
        print(f"  적발    방문자 {hv:>6,}명  이벤트 {he:>9,}건 ({he / total * 100:5.2f}%)")
        print(f"  정제 후 조회 {kv:,} / 장바구니 {kc:,} / 구매 {kt:,}")
        print(f"          조회→장바구니 {tc / tv * 100:.2f}% → {kc / kv * 100:.2f}%"
              f"   조회→구매 {tt / tv * 100:.2f}% → {kt / kv * 100:.2f}%")
        print(f"  구매 손실 {tt - kt:,}건")
        print()


if __name__ == "__main__":
    main()
