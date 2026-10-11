import logging
import urllib.parse
from typing import Any

from ..cache import Cache
from ..config import Region
from ..http import BROWSER_UA, Http
from ..pipeline.geo import geometry_point
from ..pipeline.themes import theme_of

log = logging.getLogger("source.wroclaw_gis")

BASE = "https://gis.um.wroc.pl/portal_srv/rest/services"
CACHE_TTL_S = 30 * 24 * 3600
PAGE = 1000
MAX_FEATURES = 20000
CULTURE = "studium2018/NR_03_UWAR_DZIEDZICTWO_KULTUROWE"
POLICY = "studium2018/NR_12_KIER_POLITYKA_DZIEDZICTWA_KULTUROWEGO"

LAYERS: list[tuple[str, int, str | None, str, str | None]] = [
    ("Pomniki_przyrody", 0, "nature", "nature monument", "NAZWA"),
    (CULTURE, 4, "fortifications", "fortress object", None),
    (CULTURE, 5, "fortifications", "defensive works complex", None),
    (CULTURE, 6, "towers", "viewpoint", None),
    (CULTURE, 8, "architecture", "modern heritage object", None),
    (CULTURE, 9, "architecture", "modern heritage complex", None),
    (CULTURE, 10, "memorials", "penance cross / boundary post", "TYP"),
    (CULTURE, 13, "archaeology", "archaeological site", None),
    (CULTURE, 16, "archaeology", "hillfort", None),
    (CULTURE, 17, "fortifications", "former city wall", "TYP"),
    (CULTURE, 18, "fortifications", "former city wall / fortification", "TYP"),
    (CULTURE, 26, "cemeteries", "former cemetery", "NAZWA"),
    (POLICY, 27, "industrial", "industrial / railway heritage zone", None),
    (POLICY, 28, "nature", "historic green area", None),
    ("obiekty_zzm_scalone", 0, "nature", "city green space (ZZM)", "NAZWA"),
]
REGISTER_LAYER = (CULTURE, 3)


def _fetch_layer(http: Http, service: str, layer: int) -> list[dict[str, Any]]:
    base = f"{BASE}/{urllib.parse.quote(service, safe='/')}/MapServer/{layer}"
    headers = {"User-Agent": BROWSER_UA}
    count = http.get_json(f"{base}/query", params={"where": "1=1", "returnCountOnly": "true", "f": "json"}, headers=headers).get("count", 0)
    if not 0 < count <= MAX_FEATURES:
        return []
    features: list[dict[str, Any]] = []
    while len(features) < count:
        page = http.get_json(
            f"{base}/query",
            params={"where": "1=1", "outFields": "*", "outSR": 4326, "returnGeometry": "true", "resultOffset": len(features), "resultRecordCount": PAGE, "f": "geojson"},
            headers=headers,
        ).get("features", [])
        if not page:
            break
        features += page
        http.sleep(0.2)
    return features


def fetch(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for service, layer, hint, label, name_field in LAYERS:
        key = f"gis_{service.replace('/', '_')}_{layer}"
        try:
            features = cache.load_or_fetch(key, CACHE_TTL_S, lambda s=service, l=layer: _fetch_layer(http, s, l))
        except Exception as exc:
            log.warning("layer %s/%d skipped: %s", service, layer, exc)
            continue
        for ft in features:
            gp = geometry_point(ft["geometry"]) if ft.get("geometry") else None
            if not gp or not region.contains(gp[0], gp[1]):
                continue
            lat, lon, kind = gp
            props = ft.get("properties") or {}
            name = (props.get(name_field) or "").strip() if name_field else ""
            if name == "None":
                name = ""
            area = props.get("SHAPE.AREA")
            records.append(
                {
                    "name": name,
                    "theme": hint or theme_of(name, props.get("KATEGORIA")),
                    "lat": lat,
                    "lon": lon,
                    "pos_quality": 3 if kind == "point" else 1,
                    "description": (props.get("OPIS") or "")[:400],
                    "area_m2": round(float(area)) if area else None,
                    "kinds": [label, props.get("TYP") or label],
                    "protection": props.get("PODST_PR") or "",
                    "website": props.get("LINK") or "",
                    "sources": ["wroclaw_gis"],
                    "refs": {"gis": [f"{service.rsplit('/', 1)[-1]}_{layer}:{props.get('OBJECTID')}"]},
                    "geom": kind,
                }
            )
    return records


def fetch_register_points(http: Http, cache: Cache, region: Region) -> list[dict[str, Any]]:
    service, layer = REGISTER_LAYER
    try:
        features = cache.load_or_fetch("gis_register_points", CACHE_TTL_S, lambda: _fetch_layer(http, service, layer))
    except Exception as exc:
        log.warning("register points skipped: %s", exc)
        return []
    out = []
    for ft in features:
        gp = geometry_point(ft["geometry"]) if ft.get("geometry") else None
        if not gp or not region.contains(gp[0], gp[1]):
            continue
        props = ft.get("properties") or {}
        kind = props.get("OBIEKT") or "registered monument"
        out.append(
            {
                "name": "",
                "theme": theme_of(kind),
                "lat": gp[0],
                "lon": gp[1],
                "pos_quality": 3,
                "kinds": [kind],
                "protection": "rejestr zabytków",
                "sources": ["wroclaw_gis"],
                "refs": {"gis": [f"register_point:{props.get('OBJECTID')}"]},
                "geom": "point",
            }
        )
    return out
