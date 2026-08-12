"""재고 상태를 '조회/장바구니 시점' 기준으로 정확히 붙여서 이탈 원인을 본다.

앞선 explore_category.py는 available의 최신 스냅샷만 썼다. 그건 "관측 종료 시점에 품절인가"라
"조회 시점에 품절이었나"가 아니다. 여기서는 상품별 재고 변경 이력을 시간순으로 세우고,
각 이벤트 시각에 유효했던 값을 이분탐색으로 찾는다.

핵심 질문: 장바구니에 담을 때 품절이었던 상품은 구매로 덜 이어지는가?
"""

import bisect
import csv
import io
import json
import os
import zipfile
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")
ZIPS = [
    r"C:\Users\darwi\Downloads\item_properties_part1.csv.zip",
    r"C:\Users\darwi\Downloads\item_properties_part2.csv.zip",
]

BOT_MIN_VIEW = 100


def main():
    # ---- 상품별 재고 변경 이력
    ts_of = defaultdict(list)
    val_of = defaultdict(list)
    raw = 0
    for zpath in ZIPS:
        with zipfile.ZipFile(zpath) as z:
            name = z.namelist()[0]
            print(f"읽는 중: {name}")
            with z.open(name) as fh:
                reader = csv.reader(io.TextIOWrapper(fh, encoding="utf-8"))
                next(reader, None)
                for ts, itemid, prop, value in reader:
                    if prop != "available":
                        continue
                    raw += 1
                    i = int(itemid)
                    ts_of[i].append(int(ts))
                    val_of[i].append(1 if value == "1" else 0)

    for i in ts_of:
        pairs = sorted(zip(ts_of[i], val_of[i]))
        ts_of[i] = [p[0] for p in pairs]
        val_of[i] = [p[1] for p in pairs]
    print(f"재고 변경 기록 {raw:,}건 · 상품 {len(ts_of):,}개\n")

    def state_at(item, ts):
        """이벤트 시각에 유효했던 재고 상태. 첫 스냅샷보다 이르면 None."""
        arr = ts_of.get(item)
        if not arr:
            return None
        k = bisect.bisect_right(arr, ts) - 1
        if k < 0:
            return None
        return val_of[item][k]

    # ---- 봇 판정
    n_view, n_cart, n_txn = Counter(), Counter(), Counter()
    with open(SRC, newline="", encoding="utf-8") as f:
        for r in csv.reader(f):
            if r[0] == "timestamp":
                continue
            v = int(r[1])
            if r[2] == "view":
                n_view[v] += 1
            elif r[2] == "addtocart":
                n_cart[v] += 1
            else:
                n_txn[v] += 1
    bots = {v for v, c in n_view.items() if c >= BOT_MIN_VIEW and not n_cart[v] and not n_txn[v]}

    # ---- 이벤트에 재고 상태 붙이기
    view_state = Counter()          # 상태별 조회 수
    cart_state = Counter()          # 상태별 장바구니 담기 수
    buy_state = Counter()           # 상태별 구매 수
    # (방문자, 상품)별로 담았는지 / 샀는지
    carted = {}
    bought = set()

    with open(SRC, newline="", encoding="utf-8") as f:
        for r in csv.reader(f):
            if r[0] == "timestamp":
                continue
            v = int(r[1])
            if v in bots:
                continue
            ts, ev, item = int(r[0]), r[2], int(r[3])
            st = state_at(item, ts)
            key = "재고 있음" if st == 1 else "품절" if st == 0 else "기록 없음"
            if ev == "view":
                view_state[key] += 1
            elif ev == "addtocart":
                cart_state[key] += 1
                if (v, item) not in carted:
                    carted[(v, item)] = key
            else:
                buy_state[key] += 1
                bought.add((v, item))

    tv = sum(view_state.values())
    print("조회 시점 재고 상태")
    for k in ("재고 있음", "품절", "기록 없음"):
        print(f"  {k:8s} {view_state[k]:>10,}건 ({view_state[k] / tv * 100:5.2f}%)")

    tc = sum(cart_state.values())
    print("\n장바구니 담은 시점 재고 상태")
    for k in ("재고 있음", "품절", "기록 없음"):
        print(f"  {k:8s} {cart_state[k]:>10,}건 ({cart_state[k] / tc * 100:5.2f}%)")

    # ---- 핵심: 담을 때 상태별 구매 전환
    print("\n장바구니 → 구매 전환율 (담은 시점 재고 상태별, 방문자-상품 단위)")
    by_state = Counter()
    buy_by_state = Counter()
    for key_pair, st in carted.items():
        by_state[st] += 1
        if key_pair in bought:
            buy_by_state[st] += 1
    for k in ("재고 있음", "품절", "기록 없음"):
        if by_state[k]:
            print(f"  {k:8s} 담김 {by_state[k]:>8,}건  구매 {buy_by_state[k]:>7,}건  "
                  f"{buy_by_state[k] / by_state[k] * 100:5.2f}%")

    # ---- 진짜 차이는 조회 -> 장바구니 단계에 있다
    print("\n조회 → 장바구니 전환율 (조회 시점 재고 상태별)")
    states = []
    for k in ("재고 있음", "품절", "기록 없음"):
        v2c = cart_state[k] / view_state[k] if view_state[k] else 0
        c2b = buy_by_state[k] / by_state[k] if by_state[k] else 0
        print(f"  {k:8s} 조회 {view_state[k]:>10,}  담기 {cart_state[k]:>7,}  {v2c * 100:5.3f}%")
        states.append({
            "state": k,
            "views": view_state[k],
            "carts": cart_state[k],
            "viewShare": view_state[k] / tv,
            "viewToCart": v2c,
            "cartToBuy": c2b,
            "cartedPairs": by_state[k],
            "boughtPairs": buy_by_state[k],
        })

    out = {
        "records": raw,
        "items": len(ts_of),
        "states": states,
        "note": "available은 주 단위 스냅샷이라 시점 정확도는 ±1주다",
    }
    dest = os.path.join(ROOT, "app-ecom", "src", "data", "stock.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"\n저장: stock.json ({os.path.getsize(dest) / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
