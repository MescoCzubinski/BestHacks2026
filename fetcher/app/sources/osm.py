"""OpenStreetMap heritage objects via the Overpass API.

Raw elements are cached as returned by Overpass (`out center tags`); `to_records` turns them into
pipeline records.
"""

import logging
from typing import Any

from ..cache import Cache
from ..config import Region
from ..http import Http
from ..pipeline.text import year_of
from ..pipeline.themes import osm_theme

log = logging.getLogger("source.osm")

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
# Split into several queries: one big query times out on the public mirrors.
PARTS = {
    "historic": 'nwr["historic"]',
    "artwork": 'nwr["tourism"~"artwork|viewpoint|attraction|gallery|museum"]',
    "manmade": 'nwr["man_made"~"bunker|tower|water_tower|watermill|windmill|obelisk"]',
    "military": 'nwr["military"="bunker"]',
    "misc": 'nwr["amenity"~"fountain|clock"]; nwr["building"~"synagogue|bunker|chapel"]; nwr["natural"~"spring|cave_entrance"]["name"]',
}
CACHE_TTL_S = 14 * 24 * 3600
FLAG_KEYS = ("wheelchair", "fee", "religion")


def _query(http: Http, region: Region, name: str, body: str) -> list[dict[str, Any]]:
    south, west, north, east = region.bbox
    q = f"[out:json][timeout:90][bbox:{south},{west},{north},{east}];({body};);out center tags;"
    last: Exception | None = None
    for endpoint in ENDPOINTS:
        try:
            elements = http.post_form_json(endpoint, {"data": q})["elements"]
            log.info("overpass %s: %d elements via %s", name, len(elements), endpoint.split("/")[2])
            return elements
        except Exception as exc:  # mirrors fail in many ways; try the next one
            last = exc
            log.warning("overpass %s failed on %s: %s", name, endpoint.split("/")[2], exc)
    raise RuntimeError(f"all Overpass mirrors failed for part {name}") from last


def fetch_elements(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    def fetch() -> list[dict[str, Any]]:
        unique: dict[tuple[str, int], dict[str, Any]] = {}
        for name, body in PARTS.items():
            for e in _query(http, region, name, body):
                unique[(e["type"], e["id"])] = e
        return list(unique.values())

    return cache.load_or_fetch("osm_elements", CACHE_TTL_S, fetch)


def to_records(elements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for e in elements:
        tags = e.get("tags") or {}
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lon = e.get("lon") or (e.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        if tags.get("attraction") == "animal":  # zoo enclosures are tagged as attractions
            continue
        kind = (
            tags.get("artwork_type")
            or tags.get("historic")
            or tags.get("man_made")
            or tags.get("military")
            or tags.get("tourism")
            or tags.get("building")
            or tags.get("amenity")
            or ""
        )
        ref = f"{e['type'][0]}{e['id']}"
        records.append(
            {
                "name": tags.get("name") or (tags.get("inscription") or "")[:60],
                "theme": osm_theme(tags),
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "pos_quality": 3,
                "year": year_of(tags.get("start_date")),
                "description": tags.get("description") or "",
                "inscription": (tags.get("inscription") or "")[:300],
                "image": tags.get("image") or "",
                "wikipedia": tags.get("wikipedia") or "",
                "wikidata": tags.get("wikidata") or "",
                "website": tags.get("website") or "",
                "kinds": [kind] if kind else [],
                "flags": {k: tags[k] for k in FLAG_KEYS if k in tags},
                "sources": ["osm"],
                "refs": {"osm": ref},
                "geom": "point",
            }
        )
    return records
