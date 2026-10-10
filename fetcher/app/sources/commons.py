"""Geotagged Wikimedia Commons photos inside the region (thumbnail URL, licence, author)."""

import logging
import math
import re
from typing import Any

from ..cache import Cache
from ..config import Region
from ..http import Http

log = logging.getLogger("source.commons")

API = "https://commons.wikimedia.org/w/api.php"
CACHE_TTL_S = 30 * 24 * 3600
CELL_M = 2400  # grid step between geosearch queries
RADIUS_M = 1700
LIMIT = 500  # API maximum; a full cell is split into four smaller ones
THUMB_WIDTH = 480
INFO_BATCH = 50
PAUSE_S = 0.3
_TAG = re.compile(r"<[^>]+>")


def _geosearch(http: Http, found: dict[int, dict[str, Any]], lat: float, lon: float, radius: float, depth: int = 0) -> None:
    try:
        data = http.get_json(
            API, params={"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": int(radius), "gslimit": LIMIT, "gsnamespace": 6, "format": "json"}
        )
    except Exception as exc:  # a missed cell only loses some photos; keep going
        log.warning("geosearch cell %.4f,%.4f skipped: %s", lat, lon, exc)
        return
    if "error" in data or "query" not in data:  # e.g. coordinates out of range, or an API error body
        log.warning("geosearch cell %.4f,%.4f returned %s", lat, lon, data.get("error", {}).get("info", "no result"))
        return
    hits = data["query"]["geosearch"]
    for x in hits:
        found[x["pageid"]] = {"pageid": x["pageid"], "title": x["title"], "lat": x["lat"], "lon": x["lon"]}
    if len(hits) >= LIMIT and radius > 150 and depth < 4:
        d = radius / 2 / 111_320
        dl = d / math.cos(math.radians(lat))
        for sy in (-1, 1):
            for sx in (-1, 1):
                _geosearch(http, found, lat + sy * d, lon + sx * dl, radius / 2, depth + 1)
    http.sleep(PAUSE_S)


def fetch_files(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    def fetch() -> list[dict[str, Any]]:
        found: dict[int, dict[str, Any]] = {}
        south, west, north, east = region.bbox
        dlat = CELL_M / 111_320
        lat = south
        while lat <= north + dlat:
            dlon = CELL_M / (111_320 * math.cos(math.radians(lat)))
            lon = west
            while lon <= east + dlon:
                _geosearch(http, found, lat, lon, RADIUS_M)
                lon += dlon
            lat += dlat
        files = {pid: f for pid, f in found.items() if region.contains(f["lat"], f["lon"])}
        log.info("commons: %d geotagged files", len(files))
        ids = list(files)
        for i in range(0, len(ids), INFO_BATCH):
            batch = ids[i : i + INFO_BATCH]
            try:
                pages = http.get_json(
                    API,
                    params={
                        "action": "query",
                        "pageids": "|".join(map(str, batch)),
                        "prop": "imageinfo",
                        "iiprop": "url|extmetadata|size",
                        "iiurlwidth": THUMB_WIDTH,
                        "iiextmetadatafilter": "LicenseShortName|Artist|ImageDescription|DateTimeOriginal",
                        "format": "json",
                    },
                )["query"]["pages"]
            except Exception as exc:
                log.warning("imageinfo batch %d skipped: %s", i, exc)
                continue
            for pid, p in pages.items():
                f = files.get(int(pid))
                if not f:
                    continue
                ii = (p.get("imageinfo") or [{}])[0]
                md = ii.get("extmetadata", {})
                f.update(
                    {
                        "thumb": ii.get("thumburl"),
                        "page": ii.get("descriptionurl"),
                        "license": (md.get("LicenseShortName") or {}).get("value", ""),
                        "artist": _TAG.sub("", (md.get("Artist") or {}).get("value", ""))[:160].strip(),
                        "description": _TAG.sub("", (md.get("ImageDescription") or {}).get("value", ""))[:300].strip(),
                    }
                )
            http.sleep(PAUSE_S)
        return [f for f in files.values() if f.get("thumb")]

    return cache.load_or_fetch("commons_files", CACHE_TTL_S, fetch)
