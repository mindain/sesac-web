"""서울 아파트 실거래 CSV에서 특정 자치구의 고가 거래 상위 5건을 뽑는다.

표준 라이브러리(csv)만 사용한다.

사용법:
    py analyze.py            # 기본값: 중구
    py analyze.py 강남구      # 구 이름을 인자로 지정
"""

import csv
import os
import sys

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seoul-apt-latest.csv")

DEFAULT_GU = "중구"
TOP_N = 5

# 실제 CSV 헤더 이름 (한글 컬럼명이 아니라 영문 헤더다)
# gu=자치구명, dong=법정동명, complex=건물명, contract_date=계약일,
# price=물건금액(만원), area_m2=건물면적(㎡), floor=층, deal_type=거래구분
COL_GU = "gu"
COL_COMPLEX = "complex"
COL_DATE = "contract_date"
COL_PRICE = "price"
COL_DEAL_TYPE = "deal_type"


def to_int(text):
    """'138000' 또는 '138,000' 형태의 금액 문자열을 정수로. 비었거나 숫자가 아니면 None."""
    if text is None:
        return None
    text = text.strip().replace(",", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def read_rows(path, target_gu):
    """대상 자치구의 매매 건만 골라 (금액, 건물명, 계약일) 목록으로 반환."""
    rows = []
    skipped_no_price = 0

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        need = (COL_GU, COL_COMPLEX, COL_DATE, COL_PRICE)
        missing = [c for c in need if c not in (reader.fieldnames or [])]
        if missing:
            raise SystemExit(
                "CSV에 필요한 컬럼이 없습니다: %s\n실제 컬럼: %s"
                % (", ".join(missing), ", ".join(reader.fieldnames or []))
            )

        for row in reader:
            if (row.get(COL_GU) or "").strip() != target_gu:
                continue
            if (row.get(COL_DEAL_TYPE) or "").strip() != "매매":
                continue

            price = to_int(row.get(COL_PRICE))
            if price is None:
                skipped_no_price += 1
                continue

            rows.append(
                (price, (row.get(COL_COMPLEX) or "").strip(), (row.get(COL_DATE) or "").strip())
            )

    return rows, skipped_no_price


def main():
    target_gu = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_GU

    rows, skipped = read_rows(CSV_PATH, target_gu)

    print("대상 파일 : %s" % os.path.basename(CSV_PATH))
    print("대상 자치구: %s (매매 기준) — 물건금액 상위 %d건" % (target_gu, TOP_N))
    print("-" * 56)

    if not rows:
        print("해당 조건에 맞는 거래가 없습니다. (구 이름을 확인하세요)")
        return

    # 금액 내림차순 정렬 후 상위 N건
    top = sorted(rows, key=lambda r: r[0], reverse=True)[:TOP_N]

    print("{:<28} {:>12} {:>12}".format("건물명", "물건금액(만원)", "계약일"))
    print("-" * 56)
    for price, complex_name, contract_date in top:
        print("{:<28} {:>12,} {:>12}".format(complex_name, price, contract_date))

    if skipped:
        print("\n(금액이 비어 있어 제외한 건: {:,}건)".format(skipped))


if __name__ == "__main__":
    main()
