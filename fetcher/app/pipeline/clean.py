import re
from collections import Counter
from typing import Any

from ..config import Region
from .geo import Grid, meters
from .text import strip_city

GENERIC_KINDS = {"yes", "building", "house", "architecture", "heritage", "historic", "ruins?"}
VISITABLE_KINDS = re.compile(
    r"mural|graffiti|sculpture|statue|memorial|monument|wayside|shrine|viewpoint|tower|bunker|ruin|dwarf|tomb|"
    r"installation|artwork|fountain|bridge|synagog|church|chapel|castle|palace|villa",
    re.I,
)
NOT_PLACES = re.compile(r"^(ulica|droga|trasa|część miasta|część miejscowości|przystanek|przystań|osiedle \(jednostka\))", re.I)
SAME_SOURCE_RADIUS_M = 35.0
CROSS_SOURCE_RADIUS_M = 400.0
MIN_CROSS_NAME_LEN = 8
_GRID_DEG = CROSS_SOURCE_RADIUS_M / 111_200


def norm_name(name: str | None, region: Region) -> str:
    return re.sub(r"[^\w]+", " ", strip_city(name or "", region.municipality or region.name).lower()).strip()


def is_unnamed_junk(p: dict[str, Any]) -> bool:
    if (p.get("name") or "").strip():
        return False
    if p.get("description") or p.get("extract") or p.get("wikipedia") or p.get("media"):
        return False
    kinds = [k for k in p.get("kinds") or [] if k and k not in GENERIC_KINDS]
    return not any(VISITABLE_KINDS.search(k) for k in kinds)


def is_not_a_place(p: dict[str, Any]) -> bool:
    kinds = [k.lower() for k in p.get("kinds") or []]
    return bool(kinds) and any(NOT_PLACES.match(k) or k.startswith("droga") for k in kinds[:2])


def absorb(keep: dict[str, Any], dup: dict[str, Any]) -> None:
    for k, v in dup.items():
        if k in ("media", "sources", "kinds"):
            keep[k] = list(dict.fromkeys([*(keep.get(k) or []), *(v or [])]))
        elif k in ("refs", "flags"):
            keep.setdefault(k, {}).update({r: x for r, x in (v or {}).items() if r not in keep[k]})
        elif keep.get(k) in (None, "", [], {}) and v not in (None, "", [], {}):
            keep[k] = v


def clean(places: list[dict[str, Any]], region: Region) -> tuple[list[dict[str, Any]], Counter]:
    drops: Counter = Counter()
    kept = []
    for p in places:
        if p.get("lat") is None:
            drops["no_position"] += 1
        elif p["theme"] == "archaeology" and not (p.get("name") or "").strip():
            drops["unnamed_archaeological_site"] += 1
        elif is_not_a_place(p):
            drops["street_district_or_stop"] += 1
        elif is_unnamed_junk(p):
            drops["unnamed_not_visitable"] += 1
        else:
            kept.append(p)

    def richness(p: dict[str, Any]) -> int:
        return len(p.get("media") or []) * 2 + len(p["sources"]) * 3 + (5 if p.get("extract") else 0) + (2 if p.get("year") else 0)

    grid = Grid(cell_deg=_GRID_DEG)
    out: list[dict[str, Any]] = []
    for p in sorted(kept, key=richness, reverse=True):
        n = norm_name(p.get("name"), region)
        twin = None
        if n:
            for i in grid.near(p["lat"], p["lon"]):
                q = out[i]
                if norm_name(q.get("name"), region) != n:
                    continue
                d = meters(p["lat"], p["lon"], q["lat"], q["lon"])
                cross = set(p["sources"]) != set(q["sources"]) and len(n) >= MIN_CROSS_NAME_LEN
                if d < SAME_SOURCE_RADIUS_M or (cross and d < CROSS_SOURCE_RADIUS_M):
                    twin = q
        if twin:
            absorb(twin, p)
            drops["duplicate_name_nearby"] += 1
            continue
        grid.add(len(out), p["lat"], p["lon"])
        out.append(p)
    return out, drops
