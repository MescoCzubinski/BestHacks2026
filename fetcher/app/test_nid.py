from app.config import REGION
from app.sources.nid import rows_for_region

HEADER = "INSPIRE_ID;NAZWA;MIEJSCOWOSC;ULICA\n"


def csv_bytes(*rows: str, encoding: str = "utf-8-sig") -> bytes:
    return (HEADER + "\n".join(rows) + "\n").encode(encoding)


def test_keeps_only_the_region_municipality():
    raw = csv_bytes("1;Ratusz;Wrocław;Rynek", "2;Rynek;Kraków;Rynek", "3;Hala;wrocław;Wystawowa")
    assert [r["INSPIRE_ID"] for r in rows_for_region(raw, REGION)] == ["1", "3"]


def test_falls_back_to_cp1250_when_the_file_is_not_utf8():
    raw = csv_bytes("1;Kościół św. Elżbiety;Wrocław;Kuźnicza", encoding="cp1250")
    rows = rows_for_region(raw, REGION)
    assert rows[0]["NAZWA"] == "Kościół św. Elżbiety"


def test_region_without_a_municipality_has_no_register_rows():
    region = type(REGION)(id="x", name="X", south=0, west=0, north=1, east=1)
    assert rows_for_region(csv_bytes("1;A;Wrocław;B"), region) == []
