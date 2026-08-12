"""RetailRocket events.csv -> 대시보드용 집계 JSON.

봇으로 판정한 방문자를 제거한 뒤 전체 지표를 집계한다.
제거 전 수치도 함께 담아, 화면에서 정제 효과를 비교할 수 있게 한다.

봇 판정 (정밀도 우선):
    조회 100건 이상 AND 장바구니 0회 AND 구매 0회
왜 이 규칙만 쓰는지는 scripts/explore_visitors.py, compare_rules.py,
explore_category.py의 실패 기록을 참고. 볼륨이나 카테고리 다양성으로 자르면
우량 고객이 잘린다는 것이 세 번 확인됐다.

표준 라이브러리만 쓴다. events.csv를 두 번 훑는다.

출력 (app-ecom/src/data/):
  meta.json     기간, 총계, 봇 통계, 정제 전후 비교, 버킷 요약
  daily.json    날짜 x 이벤트타입 (정제 후) + 정제 전 원본
  hourly.json   날짜 x 시(UTC) x 이벤트타입 (정제 후)
  buckets.json  날짜 x 방문빈도 버킷 x 활동/구매 (정제 후)
"""

import csv
import json
import os
from array import array
from collections import defaultdict
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")
OUT = os.path.join(ROOT, "app-ecom", "src", "data")

EVENTS = ["view", "addtocart", "transaction"]

BOT_MIN_VIEW = 100

# 전체 기간(봇 제외 후) 이벤트 수로 방문자를 나눈다. 기간 필터를 좁혀도 소속은 안 바뀐다.
BUCKETS = [(1, 1, "1회"), (2, 5, "2-5회"), (6, 20, "6-20회"), (21, 10**9, "21회+")]


def bucket_of(n):
    for i, (lo, hi, _) in enumerate(BUCKETS):
        if lo <= n <= hi:
            return i
    return len(BUCKETS) - 1


def ymd_hour(ms):
    dt = datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d"), dt.hour


def main():
    # ---- 1회차: 방문자별 이벤트 수 -> 봇 판정
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
    raw_total = 0

    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            raw_total += 1
            v = int(row[1])
            ev = row[2]
            if ev == "view":
                n_view[v] += 1
            elif ev == "addtocart":
                n_cart[v] += 1
            elif ev == "transaction":
                n_txn[v] += 1

    is_bot = bytearray(n)
    bot_count = 0
    bot_events = 0
    for v in range(n):
        if n_view[v] >= BOT_MIN_VIEW and n_cart[v] == 0 and n_txn[v] == 0:
            is_bot[v] = 1
            bot_count += 1
            bot_events += n_view[v]

    raw_view, raw_cart, raw_txn = sum(n_view), sum(n_cart), sum(n_txn)

    # 봇 제외 후 방문자별 총 이벤트 -> 버킷
    visitor_bucket = {}
    clean_visitors = 0
    for v in range(n):
        if is_bot[v]:
            continue
        c = n_view[v] + n_cart[v] + n_txn[v]
        if c:
            visitor_bucket[v] = bucket_of(c)
            clean_visitors += 1

    # ---- 2회차: 날짜 큐브 (봇 제외)
    daily = defaultdict(lambda: {e: 0 for e in EVENTS})
    daily_raw = defaultdict(lambda: {e: 0 for e in EVENTS})
    daily_visitors = defaultdict(set)
    daily_orders = defaultdict(set)
    hourly = defaultdict(lambda: [[0] * 24 for _ in EVENTS])
    bucket_active = defaultdict(lambda: [set() for _ in BUCKETS])
    bucket_buyers = defaultdict(lambda: [set() for _ in BUCKETS])
    all_orders = set()

    with open(SRC, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "timestamp":
                continue
            ev = row[2]
            if ev not in EVENTS:
                continue
            date, hour = ymd_hour(row[0])
            daily_raw[date][ev] += 1

            v = int(row[1])
            if is_bot[v]:
                continue

            b = visitor_bucket[v]
            daily[date][ev] += 1
            daily_visitors[date].add(v)
            hourly[date][EVENTS.index(ev)][hour] += 1
            bucket_active[date][b].add(v)
            if ev == "transaction":
                bucket_buyers[date][b].add(v)
                tid = row[4]
                if tid:
                    daily_orders[date].add(tid)
                    all_orders.add(tid)

    dates = sorted(daily.keys())

    daily_out = {
        "dates": dates,
        "view": [daily[d]["view"] for d in dates],
        "addtocart": [daily[d]["addtocart"] for d in dates],
        "transaction": [daily[d]["transaction"] for d in dates],
        "visitors": [len(daily_visitors[d]) for d in dates],
        "orders": [len(daily_orders[d]) for d in dates],
        # 정제 전 원본. 봇 제거 효과를 화면에서 비교하는 데 쓴다.
        "rawView": [daily_raw[d]["view"] for d in dates],
        "rawAddtocart": [daily_raw[d]["addtocart"] for d in dates],
        "rawTransaction": [daily_raw[d]["transaction"] for d in dates],
    }

    hourly_out = {
        "dates": dates,
        "cube": [[hourly[d][i] for d in dates] for i in range(len(EVENTS))],
    }

    buckets_out = {
        "dates": dates,
        "labels": [b[2] for b in BUCKETS],
        "active": [[len(bucket_active[d][i]) for d in dates] for i in range(len(BUCKETS))],
        "buyers": [[len(bucket_buyers[d][i]) for d in dates] for i in range(len(BUCKETS))],
    }

    bucket_totals = []
    for i, (_, _, label) in enumerate(BUCKETS):
        act = set().union(*[bucket_active[d][i] for d in dates]) if dates else set()
        buy = set().union(*[bucket_buyers[d][i] for d in dates]) if dates else set()
        bucket_totals.append({
            "label": label,
            "visitors": len(act),
            "buyers": len(buy),
            "rate": len(buy) / len(act) if act else 0,
        })

    clean_view = sum(daily_out["view"])
    clean_cart = sum(daily_out["addtocart"])
    clean_txn = sum(daily_out["transaction"])

    meta = {
        "source": "RetailRocket recommender system dataset (Kaggle)",
        "sourceUrl": "https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset",
        "author": "Roman Zykov / Retail Rocket",
        "license": "CC BY-NC-SA 4.0",
        "dateFrom": dates[0],
        "dateTo": dates[-1],
        "timezone": "UTC",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "botRule": f"조회 {BOT_MIN_VIEW}건 이상 · 장바구니 0회 · 구매 0회",
        "bot": {
            "visitors": bot_count,
            "events": bot_events,
            "eventShare": bot_events / raw_total,
        },
        "raw": {
            "events": raw_total,
            "view": raw_view,
            "addtocart": raw_cart,
            "transaction": raw_txn,
            "cartRate": raw_cart / raw_view,
            "buyRate": raw_txn / raw_view,
        },
        "clean": {
            "events": clean_view + clean_cart + clean_txn,
            "view": clean_view,
            "addtocart": clean_cart,
            "transaction": clean_txn,
            "visitors": clean_visitors,
            "orders": len(all_orders),
            "cartRate": clean_cart / clean_view,
            "buyRate": clean_txn / clean_view,
        },
        "bucketTotals": bucket_totals,
    }

    os.makedirs(OUT, exist_ok=True)
    for name, obj in [
        ("meta.json", meta),
        ("daily.json", daily_out),
        ("hourly.json", hourly_out),
        ("buckets.json", buckets_out),
    ]:
        path = os.path.join(OUT, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  {name:14s} {os.path.getsize(path) / 1024:8.1f} KB")

    print()
    print(f"기간            {dates[0]} ~ {dates[-1]} ({len(dates)}일)")
    print(f"봇 판정         {bot_count:,}명 / 이벤트 {bot_events:,}건 "
          f"({bot_events / raw_total * 100:.2f}%)")
    print()
    print(f"{'':14s} {'정제 전':>12} {'정제 후':>12}")
    print(f"{'조회':14s} {raw_view:>12,} {clean_view:>12,}")
    print(f"{'장바구니':14s} {raw_cart:>12,} {clean_cart:>12,}")
    print(f"{'구매':14s} {raw_txn:>12,} {clean_txn:>12,}")
    print(f"{'조회→장바구니':14s} {raw_cart / raw_view * 100:>11.2f}% "
          f"{clean_cart / clean_view * 100:>11.2f}%")
    print(f"{'조회→구매':14s} {raw_txn / raw_view * 100:>11.2f}% "
          f"{clean_txn / clean_view * 100:>11.2f}%")
    print()
    print(f"주문 수(고유 transactionid) {len(all_orders):,}건 · "
          f"주문당 상품 {clean_txn / len(all_orders):.2f}개")
    print()
    print("방문 빈도별 구매 전환율 (봇 제외, 순 방문자)")
    for b in bucket_totals:
        print(f"  {b['label']:8s} 방문자 {b['visitors']:9,}명  "
              f"구매자 {b['buyers']:6,}명  {b['rate'] * 100:5.2f}%")


if __name__ == "__main__":
    main()
