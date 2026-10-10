"""Wikidata items inside the region (SPARQL box query), their Wikipedia intros, and heritage claims."""

import logging
import math
import re
import urllib.parse
from typing import Any

from ..cache import Cache
from ..config import Region
from ..http import Http
from ..pipeline.text import year_of
from ..pipeline.themes import theme_of

log = logging.getLogger("source.wikidata")

SPARQL_URL = "https://query.wikidata.org/sparql"
API_URL = "https://www.wikidata.org/w/api.php"
CACHE_TTL_S = 14 * 24 * 3600
EXTRACT_MAX_CHARS = 1200
CLAIM_PROPS = ("P1435", "P140", "P149")
BATCH = 50


TILE_LAT_DEG = 0.12
TILE_LON_DEG = 0.20
TILE_PAUSE_S = 2.0


def _tiles(region: Region) -> list[tuple[float, float, float, float]]:
    south, west, north, east = region.bbox
    rows = max(1, math.ceil((north - south) / TILE_LAT_DEG))
    cols = max(1, math.ceil((east - west) / TILE_LON_DEG))
    dlat, dlon = (north - south) / rows, (east - west) / cols
    return [(south + r * dlat, west + c * dlon, south + (r + 1) * dlat, west + (c + 1) * dlon) for r in range(rows) for c in range(cols)]


def _sparql(region: Region, bbox: tuple[float, float, float, float]) -> str:
    south, west, north, east = bbox
    wiki = f"https://{region.lang}.wikipedia.org/"
    return f"""
SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?article ?typeLabel ?inception WHERE {{
  SERVICE wikibase:box {{
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point({west} {south})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point({east} {north})"^^geo:wktLiteral .
  }}
  OPTIONAL {{ ?item wdt:P18 ?image }}
  OPTIONAL {{ ?item wdt:P31 ?type }}
  OPTIONAL {{ ?item wdt:P571 ?inception }}
  OPTIONAL {{ ?article schema:about ?item ; schema:isPartOf <{wiki}> }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "{region.lang},en" }}
}}
LIMIT 20000"""


def fetch_items(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    def fetch() -> list[dict[str, Any]]:
        items: dict[str, dict[str, Any]] = {}
        for tile in _tiles(region):
            data = http.get_json(SPARQL_URL, params={"query": _sparql(region, tile), "format": "json"}, headers={"Accept": "application/sparql-results+json"})
            for r in data["results"]["bindings"]:
                qid = r["item"]["value"].rsplit("/", 1)[1]
                m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["coord"]["value"])
                if not m:
                    continue
                d = items.setdefault(qid, {"qid": qid, "types": set()})
                d["name"] = r.get("itemLabel", {}).get("value")
                d["desc"] = r.get("itemDescription", {}).get("value")
                d["lon"], d["lat"] = float(m.group(1)), float(m.group(2))
                if "image" in r:
                    d["image"] = r["image"]["value"]
                if "article" in r:
                    d["wiki"] = r["article"]["value"]
                if "typeLabel" in r:
                    d["types"].add(r["typeLabel"]["value"])
                if "inception" in r:
                    d["inception"] = r["inception"]["value"][:10]
            http.sleep(TILE_PAUSE_S)
        out = []
        for d in items.values():
            d["types"] = sorted(d["types"])
            out.append(d)
        log.info("wikidata: %d items with coordinates", len(out))
        return out

    return cache.load_or_fetch("wikidata_items", CACHE_TTL_S, fetch)


def fill_extracts(http: Http, cache: Cache, region: Region, items: list[dict[str, Any]]) -> None:
    """Add `extract` (Wikipedia intro) in place. Missing ones are retried on the next run."""
    by_title: dict[str, dict[str, Any]] = {}
    for d in items:
        if d.get("wiki") and "extract" not in d:
            title = urllib.parse.unquote(d["wiki"].rsplit("/wiki/", 1)[1]).replace("_", " ")
            by_title[title] = d
    titles = list(by_title)
    log.info("wikipedia: %d extracts to fetch", len(titles))
    api = f"https://{region.lang}.wikipedia.org/w/api.php"
    step = 10
    for i in range(0, len(titles), step):
        batch = titles[i : i + step]
        try:
            res = http.get_json(
                api,
                params={"action": "query", "prop": "extracts", "exintro": 1, "explaintext": 1, "exlimit": step, "titles": "|".join(batch), "format": "json", "redirects": 1},
            )["query"]
        except Exception as exc:
            log.warning("extracts batch %d skipped: %s", i, exc)
            continue
        back = {n["to"]: n["from"] for n in res.get("normalized", [])}
        for n in res.get("redirects", []):
            back[n["to"]] = back.get(n["from"], n["from"])
        for page in res["pages"].values():
            title = page.get("title")
            d = by_title.get(back.get(title, title)) or by_title.get(title)
            if d and page.get("extract"):
                d["extract"] = page["extract"].strip()[:EXTRACT_MAX_CHARS]
        http.sleep(1.0)
    cache.put("wikidata_items", items)


def fetch_claims(http: Http, cache: Cache, qids: list[str]) -> dict[str, dict[str, Any]]:
    def fetch() -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for i in range(0, len(qids), BATCH):
            data = http.get_json(API_URL, params={"action": "wbgetentities", "ids": "|".join(qids[i : i + BATCH]), "props": "claims", "format": "json"})
            for qid, entity in data.get("entities", {}).items():
                claims = entity.get("claims", {})
                flat: dict[str, Any] = {}
                for prop in CLAIM_PROPS:
                    vals = [s["mainsnak"]["datavalue"]["value"]["id"] for s in claims.get(prop, []) if s["mainsnak"].get("datavalue")]
                    if vals:
                        flat[prop] = vals
                if "P757" in claims:
                    flat["P757"] = True
                out[qid] = flat
            http.sleep(0.5)
        return out

    return cache.load_or_fetch("wikidata_claims_" + "_".join(CLAIM_PROPS), CACHE_TTL_S, fetch)


def to_records(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for d in items:
        name = d.get("name") or ""
        if re.fullmatch(r"Q\d+", name):
            continue
        kinds = d.get("types", [])
        records.append(
            {
                "name": name,
                "theme": theme_of(" ".join(kinds), name, d.get("desc")),
                "lat": round(d["lat"], 6),
                "lon": round(d["lon"], 6),
                "pos_quality": 3,
                "year": year_of(d.get("inception")),
                "description": d.get("desc") or "",
                "image": d.get("image") or "",
                "wikipedia": d.get("wiki") or "",
                "wikidata": d["qid"],
                "extract": d.get("extract", ""),
                "kinds": kinds[:6],
                "sources": ["wikidata"],
                "refs": {"wikidata": d["qid"]},
                "geom": "point",
            }
        )
    return records
