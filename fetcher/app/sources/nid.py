import csv
import io
import logging
import math
import re
from collections.abc import Iterator
from typing import Any

from ..cache import Cache
from ..config import Region
from ..http import BROWSER_UA, Http
from ..pipeline.text import year_of
from ..pipeline.themes import theme_of

log = logging.getLogger("source.nid")

NID_URL = "https://api.dane.gov.pl/resources/2730055,rejestr-zabytkow-nieruchomych-plik-csv/file"
NID_HISTORY_URL = "https://api.dane.gov.pl/resources/2730107,pomniki-historii-plik-csv/file"
UUG_URL = "https://services.gugik.gov.pl/uug/"
CACHE_TTL_S = 30 * 24 * 3600
GEOCODE_PAUSE_S = 0.25
SAVE_EVERY = 100

_A = 6378137.0
_F = 1 / 298.257222101
_E2 = _F * (2 - _F)
_EP2 = _E2 / (1 - _E2)
_K0, _LON0, _FE, _FN = 0.9993, math.radians(19.0), 500000.0, -5300000.0


def puwg_to_wgs(e: float, n: float) -> tuple[float, float]:
    x, y = e - _FE, n - _FN
    mu = (y / _K0) / (_A * (1 - _E2 / 4 - 3 * _E2**2 / 64 - 5 * _E2**3 / 256))
    e1 = (1 - math.sqrt(1 - _E2)) / (1 + math.sqrt(1 - _E2))
    phi1 = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    s, c, t = math.sin(phi1), math.cos(phi1), math.tan(phi1)
    n1 = _A / math.sqrt(1 - _E2 * s * s)
    t1, c1 = t * t, _EP2 * c * c
    r1 = _A * (1 - _E2) / (1 - _E2 * s * s) ** 1.5
    d = x / (n1 * _K0)
    lat = phi1 - (n1 * t / r1) * (
        d**2 / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * _EP2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * _EP2 - 3 * c1**2) * d**6 / 720
    )
    lon = _LON0 + (d - (1 + 2 * t1 + c1) * d**3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * _EP2 + 24 * t1**2) * d**5 / 120) / c
    return math.degrees(lat), math.degrees(lon)


def iter_csv(raw: bytes, encoding: str) -> Iterator[dict[str, str]]:
    with io.TextIOWrapper(io.BytesIO(raw), encoding=encoding, errors="replace" if encoding == "cp1250" else "strict", newline="") as text:
        yield from csv.DictReader(text, delimiter=";")


def rows_for_region(raw: bytes, region: Region) -> list[dict[str, str]]:
    if not region.municipality:
        return []
    wanted = region.municipality.casefold()
    try:
        return [r for r in iter_csv(raw, "utf-8-sig") if (r.get("MIEJSCOWOSC") or "").casefold() == wanted]
    except UnicodeDecodeError:
        return [r for r in iter_csv(raw, "cp1250") if (r.get("MIEJSCOWOSC") or "").casefold() == wanted]


def parse_csv(raw: bytes) -> list[dict[str, str]]:
    try:
        return list(iter_csv(raw, "utf-8-sig"))
    except UnicodeDecodeError:
        return list(iter_csv(raw, "cp1250"))


def _locate(region: Region, x: float, y: float) -> tuple[float, float] | None:
    for e, n in ((x, y), (y, x)):
        lat, lon = puwg_to_wgs(e, n)
        if region.contains(lat, lon):
            return lat, lon
    return None


def geocode(http: Http, region: Region, address: str) -> tuple[float, float, float] | None:
    data = http.get_json(UUG_URL, params={"request": "GetAddress", "address": address}, headers={"User-Agent": BROWSER_UA})
    best: tuple[float, float, float] | None = None
    for v in (data.get("results") or {}).values():
        if not isinstance(v, dict) or "x" not in v:
            continue
        if (v.get("city") or "").casefold() != region.municipality.casefold():
            continue
        point = _locate(region, float(v["x"]), float(v["y"]))
        acc = float(v.get("accuracy", 0))
        if point and (best is None or acc > best[2]):
            best = (point[0], point[1], acc)
    return best


def _address_queries(region: Region, row: dict[str, str]) -> tuple[list[str], str]:
    street = re.sub(r"^(ul\.|pl\.|al\.)\s*", "", (row.get("ULICA") or "").strip())
    number = re.split(r"[ ,;/-]", (row.get("NR_ADRESOWY") or "").strip())[0]
    queries = []
    if street and number:
        queries.append(f"{region.municipality}, {street} {number}")
    if street:
        queries.append(f"{region.municipality}, {street}")
    return queries, number


def geocode_rows(http: Http, cache: Cache, region: Region, rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    done: dict[str, dict[str, Any]] = cache.get("nid_geocoded", float("inf")) or {}
    todo = [r for r in rows if r["INSPIRE_ID"] not in done]
    log.info("nid: %d rows in region, %d to geocode", len(rows), len(todo))
    for i, row in enumerate(todo, start=1):
        queries, number = _address_queries(region, row)
        result: dict[str, Any] = {}
        for q in queries:
            try:
                hit = geocode(http, region, q)
            except Exception as exc:
                log.warning("geocode %r failed: %s", q, exc)
                hit = None
            http.sleep(GEOCODE_PAUSE_S)
            if hit:
                result = {"lat": round(hit[0], 6), "lon": round(hit[1], 6), "accuracy": hit[2], "exact_number": bool(number and q.endswith(number))}
                break
        done[row["INSPIRE_ID"]] = result
        if i % SAVE_EVERY == 0:
            cache.put("nid_geocoded", done)
            log.info("nid geocoding %d/%d", i, len(todo))
    cache.put("nid_geocoded", done)
    return done


def fetch_rows(http: Http, cache: Cache, region: Region) -> list[dict[str, str]]:
    def fetch() -> list[dict[str, str]]:
        return rows_for_region(http.get_bytes(NID_URL), region)

    return cache.load_or_fetch("nid_rows", CACHE_TTL_S, fetch)


def to_records(rows: list[dict[str, str]], geocoded: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for x in rows:
        g = geocoded.get(x["INSPIRE_ID"]) or {}
        name = (x.get("NAZWA") or "").strip()
        address = " ".join(v for v in (x.get("ULICA"), x.get("NR_ADRESOWY")) if v).strip()
        records.append(
            {
                "name": name,
                "theme": theme_of(name, x.get("FUNKCJA")),
                "lat": g.get("lat"),
                "lon": g.get("lon"),
                "pos_quality": 4 if g.get("exact_number") else 2,
                "year": year_of(x.get("CHRONOLOGIA")),
                "date_text": x.get("CHRONOLOGIA") or "",
                "function": x.get("FUNKCJA") or "",
                "style": x.get("STYL_ARCHITEKTONICZNY") or "",
                "material": x.get("MATERIAL_BUDOWY") or "",
                "address": address,
                "protection": x.get("FORMA_OCHRONY") or "",
                "inscribed_date": x.get("DATA_WPISU") or "",
                "nid_link": x.get("LINK") or "",
                "kinds": [x["FUNKCJA"]] if x.get("FUNKCJA") else [],
                "sources": ["nid"],
                "refs": {"nid": x["INSPIRE_ID"]},
                "geom": "point",
            }
        )
    return records


def fetch_history_monuments(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    def fetch() -> list[dict[str, str]]:
        rows = parse_csv(http.get_bytes(NID_HISTORY_URL))
        out = []
        for r in rows:
            try:
                lat, lon = float(r["N"].replace(",", ".")), float(r["E"].replace(",", "."))
            except (KeyError, ValueError):
                continue
            if region.contains(lat, lon):
                out.append({**r, "lat": str(lat), "lon": str(lon)})
        return out

    rows = cache.load_or_fetch("nid_history", CACHE_TTL_S, fetch)
    return [
        {
            "name": r.get("NAZWA", ""),
            "theme": theme_of(r.get("NAZWA"), r.get("RODZAJ_POMNIKA_HISTORII"), hint="architecture"),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "pos_quality": 4,
            "kinds": ["pomnik historii", r.get("RODZAJ_POMNIKA_HISTORII", "")],
            "protection": "pomnik historii",
            "inscribed_date": r.get("DATA_WPISU", ""),
            "nid_link": r.get("LINK", ""),
            "sources": ["nid_pomniki_historii"],
            "refs": {"nid_ph": r.get("INSPIRE_ID", "")},
            "geom": "point",
        }
        for r in rows
    ]
