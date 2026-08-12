"""세션 / 구매 리드타임 / 코호트 리텐션 / 파레토 / 요일 분석.

이벤트를 (방문자, 시각) 순으로 한 번 정렬해 두고 네 분석이 그 결과를 공유한다.
정렬을 각자 하면 네 번 하게 되므로 한 스크립트로 묶었다.

봇(조회 100건+ / 장바구니 0 / 구매 0)은 build_ecom_data.py와 같은 기준으로 제외한다.

출력: app-ecom/src/data/deep.json + 사람이 읽는 요약
"""

import csv
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "events.csv")
MAP = os.path.join(ROOT, "data", "item_map.json")
OUT = os.path.join(ROOT, "app-ecom", "src", "data", "deep.json")

SESSION_GAP_MS = 30 * 60 * 1000  # 30분 무활동이면 다른 방문으로 본다 (웹 분석 관행)
BOT_MIN_VIEW = 100
EV = {"view": 0, "addtocart": 1, "transaction": 2}
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]


def pctl(sorted_vals, p):
    if not sorted_vals:
        return 0
    return sorted_vals[min(len(sorted_vals) - 1, int(len(sorted_vals) * p))]


def main():
    print("이벤트 읽는 중…")
    rows = []
    n_view = Counter()
    n_cart = Counter()
    n_txn = Counter()

    with open(SRC, newline="", encoding="utf-8") as f:
        for r in csv.reader(f):
            if r[0] == "timestamp":
                continue
            v = int(r[1])
            e = EV[r[2]]
            rows.append((v, int(r[0]), e, int(r[3])))
            if e == 0:
                n_view[v] += 1
            elif e == 1:
                n_cart[v] += 1
            else:
                n_txn[v] += 1

    bots = {v for v, c in n_view.items() if c >= BOT_MIN_VIEW and not n_cart[v] and not n_txn[v]}
    rows = [r for r in rows if r[0] not in bots]
    print(f"봇 {len(bots):,}명 제외 · 남은 이벤트 {len(rows):,}건")

    print("정렬 중…")
    rows.sort()  # (visitor, ts, ...)

    # ---------- 세션 분리 ----------
    # 세션 = 같은 방문자의 이벤트 중 직전 이벤트와 30분 이내로 이어지는 묶음
    sess_events = []       # 세션당 이벤트 수
    sess_minutes = []      # 세션 길이(분)
    sess_with_cart = 0
    sess_with_buy = 0
    total_sessions = 0
    sessions_per_visitor = Counter()
    # 방문자의 몇 번째 세션에서 구매가 일어나는가
    ordinal_sessions = Counter()
    ordinal_buys = Counter()

    # ---------- 리드타임 ----------
    first_ts = {}
    first_buy_ts = {}
    views_before_buy = Counter()

    # ---------- 코호트 ----------
    visitor_first_day = {}
    visitor_active_days = defaultdict(set)

    cur_v = None
    cur_start = cur_last = None
    cur_n = 0
    cur_cart = cur_buy = False
    cur_ordinal = 0
    seen_buy = set()

    def close_session():
        nonlocal total_sessions, sess_with_cart, sess_with_buy
        if cur_v is None or cur_n == 0:
            return
        total_sessions += 1
        sessions_per_visitor[cur_v] += 1
        sess_events.append(cur_n)
        sess_minutes.append((cur_last - cur_start) / 60000)
        if cur_cart:
            sess_with_cart += 1
        if cur_buy:
            sess_with_buy += 1
        ordinal_sessions[min(cur_ordinal, 10)] += 1
        if cur_buy:
            ordinal_buys[min(cur_ordinal, 10)] += 1

    for v, ts, e, _item in rows:
        day = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).date()

        if v != cur_v:
            close_session()
            cur_v, cur_start, cur_last, cur_n = v, ts, ts, 0
            cur_cart = cur_buy = False
            cur_ordinal = 1
            first_ts[v] = ts
        elif ts - cur_last > SESSION_GAP_MS:
            close_session()
            cur_start, cur_last, cur_n = ts, ts, 0
            cur_cart = cur_buy = False
            cur_ordinal += 1

        cur_n += 1
        cur_last = ts
        if e == 1:
            cur_cart = True
        elif e == 2:
            cur_buy = True
            if v not in seen_buy:
                seen_buy.add(v)
                first_buy_ts[v] = ts
        elif e == 0 and v not in seen_buy:
            views_before_buy[v] += 1

        if v not in visitor_first_day:
            visitor_first_day[v] = day
        visitor_active_days[v].add(day)

    close_session()

    sess_events.sort()
    sess_minutes.sort()

    # ---------- 리드타임 집계 ----------
    lead_buckets = [
        ("1시간 이내", 0, 1 / 24),
        ("당일 (24시간)", 1 / 24, 1),
        ("1-7일", 1, 7),
        ("8-30일", 7, 30),
        ("31일 이상", 30, 10**9),
    ]
    lead_counts = Counter()
    lead_days_all = []
    for v, bts in first_buy_ts.items():
        d = (bts - first_ts[v]) / 86400000
        lead_days_all.append(d)
        for label, lo, hi in lead_buckets:
            if lo <= d < hi:
                lead_counts[label] += 1
                break
    lead_days_all.sort()
    vb = sorted(views_before_buy[v] for v in first_buy_ts)

    # ---------- 코호트 (첫 방문 주차 -> 이후 주차 재방문율) ----------
    def week_of(d):
        return d.isocalendar()[:2]

    all_weeks = sorted({week_of(d) for d in visitor_first_day.values()})
    week_index = {w: i for i, w in enumerate(all_weeks)}
    cohort_size = Counter()
    cohort_ret = defaultdict(Counter)  # cohort_idx -> {offset: 인원}
    for v, fd in visitor_first_day.items():
        ci = week_index[week_of(fd)]
        cohort_size[ci] += 1
        offsets = {week_index[week_of(d)] - ci for d in visitor_active_days[v] if week_of(d) in week_index}
        for off in offsets:
            if off >= 0:
                cohort_ret[ci][off] += 1

    max_off = 8
    cohort_out = []
    for ci in range(len(all_weeks)):
        size = cohort_size[ci]
        if size < 500:  # 표본이 적은 주차는 비율이 튄다
            continue
        cohort_out.append({
            "week": f"{all_weeks[ci][0]}-W{all_weeks[ci][1]:02d}",
            "size": size,
            "retention": [
                round(cohort_ret[ci][o] / size, 4) for o in range(max_off) if ci + o < len(all_weeks)
            ],
        })

    # ---------- 파레토 / 카테고리 / 요일 ----------
    item_views = Counter()
    item_buys = Counter()
    weekday_ev = [[0] * 7 for _ in range(3)]
    for v, ts, e, item in rows:
        wd = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).weekday()
        weekday_ev[e][wd] += 1
        if e == 0:
            item_views[item] += 1
        elif e == 2:
            item_buys[item] += 1

    def concentration(counter):
        vals = sorted(counter.values(), reverse=True)
        total = sum(vals)
        out = []
        for p in (0.01, 0.05, 0.1, 0.2, 0.5):
            k = max(1, int(len(vals) * p))
            out.append({"topPct": p, "share": round(sum(vals[:k]) / total, 4), "items": k})
        return out, len(vals), total

    view_conc, view_items, view_total = concentration(item_views)
    buy_conc, buy_items, buy_total = concentration(item_buys)

    with open(MAP, encoding="utf-8") as f:
        cat_of = json.load(f)["category"]
    cat_views = Counter()
    cat_buys = Counter()
    for item, c in item_views.items():
        k = cat_of.get(str(item))
        if k:
            cat_views[k] += c
    for item, c in item_buys.items():
        k = cat_of.get(str(item))
        if k:
            cat_buys[k] += c
    cat_rows = [
        {
            "category": k,
            "views": cat_views[k],
            "buys": cat_buys[k],
            "rate": round(cat_buys[k] / cat_views[k], 5),
        }
        for k in cat_views
        if cat_views[k] >= 5000  # 표본이 적은 카테고리는 전환율이 튄다
    ]
    cat_rows.sort(key=lambda r: -r["rate"])

    out = {
        "session": {
            "total": total_sessions,
            "perVisitor": round(total_sessions / len(sessions_per_visitor), 2),
            "eventsMedian": pctl(sess_events, 0.5),
            "eventsMean": round(sum(sess_events) / len(sess_events), 2),
            "eventsP90": pctl(sess_events, 0.9),
            "minutesMedian": round(pctl(sess_minutes, 0.5), 1),
            "minutesP90": round(pctl(sess_minutes, 0.9), 1),
            "cartRate": round(sess_with_cart / total_sessions, 4),
            "buyRate": round(sess_with_buy / total_sessions, 4),
            "byOrdinal": [
                {
                    "ordinal": o,
                    "sessions": ordinal_sessions[o],
                    "buys": ordinal_buys[o],
                    "rate": round(ordinal_buys[o] / ordinal_sessions[o], 4) if ordinal_sessions[o] else 0,
                }
                for o in range(1, 11)
                if ordinal_sessions[o]
            ],
        },
        "leadtime": {
            "buyers": len(first_buy_ts),
            "buckets": [{"label": l, "count": lead_counts[l]} for l, _, _ in lead_buckets],
            "daysMedian": round(pctl(lead_days_all, 0.5), 2),
            "daysP90": round(pctl(lead_days_all, 0.9), 2),
            "viewsMedian": pctl(vb, 0.5),
            "viewsP90": pctl(vb, 0.9),
        },
        "cohort": {"maxOffset": max_off, "rows": cohort_out},
        "pareto": {
            "viewItems": view_items,
            "buyItems": buy_items,
            "views": view_conc,
            "buys": buy_conc,
        },
        "category": {"top": cat_rows[:12], "bottom": cat_rows[-8:], "counted": len(cat_rows)},
        "weekday": {
            "labels": WEEKDAYS,
            "view": weekday_ev[0],
            "addtocart": weekday_ev[1],
            "transaction": weekday_ev[2],
        },
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"저장: deep.json ({os.path.getsize(OUT) / 1024:.1f} KB)\n")

    s = out["session"]
    print("=== 세션 (30분 무활동 기준) ===")
    print(f"  총 세션 {s['total']:,}개 · 방문자당 {s['perVisitor']}개")
    print(f"  세션당 이벤트 중앙값 {s['eventsMedian']}건 / 평균 {s['eventsMean']} / 상위10% {s['eventsP90']}건")
    print(f"  세션 길이 중앙값 {s['minutesMedian']}분 / 상위10% {s['minutesP90']}분")
    print(f"  장바구니 발생 세션 {s['cartRate'] * 100:.2f}% · 구매 발생 세션 {s['buyRate'] * 100:.2f}%")
    print("  몇 번째 방문에서 사는가")
    for r in s["byOrdinal"]:
        label = f"{r['ordinal']}번째" if r["ordinal"] < 10 else "10번째+"
        print(f"    {label:8s} 세션 {r['sessions']:>8,}개  구매 {r['buys']:>6,}개  {r['rate'] * 100:5.2f}%")

    l = out["leadtime"]
    print("\n=== 구매 리드타임 (첫 이벤트 -> 첫 구매) ===")
    print(f"  구매자 {l['buyers']:,}명 · 중앙값 {l['daysMedian']}일 / 상위10% {l['daysP90']}일")
    print(f"  구매 전 조회 수 중앙값 {l['viewsMedian']}건 / 상위10% {l['viewsP90']}건")
    for b in l["buckets"]:
        print(f"    {b['label']:14s} {b['count']:>6,}명 ({b['count'] / l['buyers'] * 100:5.1f}%)")

    print("\n=== 코호트 리텐션 (첫 방문 주차별, 주 단위 재방문율) ===")
    for r in out["cohort"]["rows"]:
        line = "  ".join(f"{x * 100:5.1f}%" for x in r["retention"][:6])
        print(f"  {r['week']} ({r['size']:>7,}명)  {line}")

    p = out["pareto"]
    print("\n=== 집중도 (파레토) ===")
    print(f"  조회된 상품 {p['viewItems']:,}개 / 구매된 상품 {p['buyItems']:,}개")
    for c in p["views"]:
        print(f"    상위 {c['topPct'] * 100:>4.0f}% 상품이 조회의 {c['share'] * 100:5.2f}%")
    for c in p["buys"]:
        print(f"    상위 {c['topPct'] * 100:>4.0f}% 상품이 구매의 {c['share'] * 100:5.2f}%")

    print(f"\n=== 카테고리 전환율 (조회 5,000건 이상 {out['category']['counted']}개) ===")
    for r in out["category"]["top"][:8]:
        print(f"    {r['category']:>6s}  조회 {r['views']:>8,}  구매 {r['buys']:>6,}  {r['rate'] * 100:5.2f}%")

    w = out["weekday"]
    print("\n=== 요일별 ===")
    for i, d in enumerate(w["labels"]):
        rate = w["transaction"][i] / w["view"][i] * 100
        print(f"    {d}  조회 {w['view'][i]:>8,}  구매 {w['transaction'][i]:>6,}  전환 {rate:5.3f}%")


if __name__ == "__main__":
    main()
