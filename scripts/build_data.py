"""
Build compact JSON data files for the Seoul apartment dashboard.

Reads seoul-apt-latest.csv (매매 only) and writes three JSON files into
app/src/data/: meta.json, monthly.json, transactions.json

These live under app/src so Vite includes them in the asset graph and emits
them with content-hashed filenames on build, preventing stale-cache/new-JS
mismatches (see app/src/utils/loadData.ts).

Standard library only.
"""
import csv
import json
import os
import statistics
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "seoul-apt-latest.csv")
OUT_DIR = os.path.join(BASE_DIR, "app", "src", "data")

EPOCH = datetime.date(2025, 7, 1)
TARGET_GU = "중구"


def to_int(s):
    if s is None:
        return None
    s = s.strip()
    if s == "":
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def to_float(s):
    if s is None:
        return None
    s = s.strip()
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    gu_index = {}
    gu_list = []
    dong_index = {}
    dong_list = []
    complex_index = {}
    complex_list = []

    months = set()

    # column-oriented transaction arrays
    t_gu = []
    t_dong = []
    t_complex = []
    t_date = []
    t_area = []
    t_floor = []
    t_price = []

    # for monthly aggregation: (gu, ym) -> list of (price, pyeong)
    seoul_month = {}  # ym -> list[(price, pyeong)]
    gu_month = {}  # (gu, ym) -> list[(price, pyeong)]

    total_rows_seen = 0
    kept_rows = 0

    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows_seen += 1
            if row.get("deal_type") != "매매":
                continue

            price = to_int(row.get("price"))
            if price is None:
                continue

            gu = row["gu"]
            dong = row["dong"]
            complex_name = row["complex"]
            ym = row["contract_ym"]
            contract_date = row["contract_date"]
            area_m2 = to_float(row.get("area_m2"))
            floor = to_int(row.get("floor"))
            pyeong_price = to_int(row.get("price_per_pyeong"))

            if area_m2 is None:
                continue

            # date -> days elapsed since 2025-07-01
            try:
                y, m, d = contract_date.split("-")
                dt = datetime.date(int(y), int(m), int(d))
            except Exception:
                continue
            date_offset = (dt - EPOCH).days

            months.add(ym)

            # Seoul-wide monthly baseline uses ALL 25 gu (comparison baseline in
            # the trend chart), independent of the TARGET_GU row filter below.
            seoul_month.setdefault(ym, []).append((price, pyeong_price))

            if gu != TARGET_GU:
                continue

            if gu not in gu_index:
                gu_index[gu] = len(gu_list)
                gu_list.append(gu)
            if dong not in dong_index:
                dong_index[dong] = len(dong_list)
                dong_list.append(dong)
            if complex_name not in complex_index:
                complex_index[complex_name] = len(complex_list)
                complex_list.append(complex_name)

            t_gu.append(gu_index[gu])
            t_dong.append(dong_index[dong])
            t_complex.append(complex_index[complex_name])
            t_date.append(date_offset)
            t_area.append(round(area_m2 * 10))
            t_floor.append(floor if floor is not None else 0)
            t_price.append(price)

            gu_month.setdefault((gu, ym), []).append((price, pyeong_price))

            kept_rows += 1

    months_sorted = sorted(months)

    def aggregate(entries):
        prices = [p for p, _ in entries]
        pyeongs = [pp for _, pp in entries if pp is not None]
        avg_price = round(sum(prices) / len(prices))
        median_price = round(statistics.median(prices))
        avg_pyeong = round(sum(pyeongs) / len(pyeongs)) if pyeongs else 0
        return avg_price, avg_pyeong, len(prices), median_price

    seoul_monthly = []
    for ym in months_sorted:
        entries = seoul_month.get(ym, [])
        if not entries:
            seoul_monthly.append({
                "ym": ym, "avgPrice": None, "avgPyeong": None,
                "count": 0, "medianPrice": None
            })
            continue
        avg_price, avg_pyeong, count, median_price = aggregate(entries)
        seoul_monthly.append({
            "ym": ym,
            "avgPrice": avg_price,
            "avgPyeong": avg_pyeong,
            "count": count,
            "medianPrice": median_price,
        })

    gu_monthly = {}
    for gu in gu_list:
        arr = []
        for ym in months_sorted:
            entries = gu_month.get((gu, ym), [])
            if not entries:
                arr.append({
                    "ym": ym, "avgPrice": None, "avgPyeong": None,
                    "count": 0, "medianPrice": None
                })
                continue
            avg_price, avg_pyeong, count, median_price = aggregate(entries)
            arr.append({
                "ym": ym,
                "avgPrice": avg_price,
                "avgPyeong": avg_pyeong,
                "count": count,
                "medianPrice": median_price,
            })
        gu_monthly[gu] = arr

    meta = {
        "gu": gu_list,
        "dong": dong_list,
        "complex": complex_list,
        "months": months_sorted,
        "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
        "totalCount": kept_rows,
    }

    monthly = {
        "seoul": seoul_monthly,
        "gu": gu_monthly,
    }

    transactions = {
        "fields": ["gu", "dong", "complex", "date", "area", "floor", "price"],
        "gu": t_gu,
        "dong": t_dong,
        "complex": t_complex,
        "date": t_date,
        "area": t_area,
        "floor": t_floor,
        "price": t_price,
    }

    paths = {
        "meta.json": meta,
        "monthly.json": monthly,
        "transactions.json": transactions,
    }

    sizes = {}
    for name, obj in paths.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        sizes[name] = os.path.getsize(path)

    print("Total CSV rows seen:", total_rows_seen)
    print(f"Kept rows (매매, valid price, gu=={TARGET_GU}):", kept_rows)
    print("Gu count:", len(gu_list))
    print("Dong count:", len(dong_list))
    print("Complex count:", len(complex_list))
    print("Months:", months_sorted)
    for name, size in sizes.items():
        print(f"{name}: {size:,} bytes")
    total_size = sum(sizes.values())
    print(f"Total: {total_size:,} bytes ({total_size / 1024 / 1024:.2f} MB)")

    # ---- Verification ----
    with open(os.path.join(OUT_DIR, "meta.json"), "r", encoding="utf-8") as f:
        meta_check = json.load(f)
    with open(os.path.join(OUT_DIR, "transactions.json"), "r", encoding="utf-8") as f:
        tx_check = json.load(f)

    lengths = {k: len(v) for k, v in tx_check.items() if k != "fields"}
    assert len(set(lengths.values())) == 1, f"Column length mismatch: {lengths}"
    print("All column arrays length:", list(lengths.values())[0])

    max_gu = max(tx_check["gu"])
    max_dong = max(tx_check["dong"])
    max_complex = max(tx_check["complex"])
    assert max_gu < len(meta_check["gu"]), "gu index out of range"
    assert max_dong < len(meta_check["dong"]), "dong index out of range"
    assert max_complex < len(meta_check["complex"]), "complex index out of range"
    print("Index range check passed: gu max", max_gu, "/", len(meta_check["gu"]),
          "dong max", max_dong, "/", len(meta_check["dong"]),
          "complex max", max_complex, "/", len(meta_check["complex"]))

    print("VERIFICATION OK")


if __name__ == "__main__":
    main()
