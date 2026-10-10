"""Second duplicate pass, on final display names.

The first merge matches records by name similarity while they are still raw ("czesalnia" from the
register vs "czesalnia, Stabłowicka 118a" from Wikidata). After names are normalised the same object
shows up under names where one contains the other. This pass joins those, with guards against merging
different things that merely share a word ("Pomnik", "Plac Solny" vs the shelter below it).
"""

import re
from collections import defaultdict
from typing import Any

from ..config import Region
from ..taxonomy import GROUPS
from .clean import absorb
from .geo import Grid, meters
from .normalize import display_name
from .tagging import explicit_scores
from .text import norm

CROSS_SOURCE_RADIUS_M = 60.0
SAME_SOURCE_RADIUS_M = 35.0
IMPRECISE_POSITION_RADIUS_M = 220.0
IMPRECISE_QUALITY = 2
TYPE_TAG_MIN_PERCENT = 70
_GRID_DEG = 0.0018
PLACE_WORDS = set("plac rynek ulica aleja skwer park osiedle".split())

KIND_WORDS = set(
    """kamienica dom budynek willa kosciol kaplica pomnik cmentarz park mur ogrodzenie schron fort most stacja
    plac ulica mieszkalny apteka stajnia palac szkola szpital hala zespol dworzec rzezba krzyz przydrozny
    kapliczka fontanna ruiny grobowiec mural graffiti wieza punkt widokowy bunkier instalacja artystyczna
    dzielo sztuki rynek ogrod skwer pawilon magazyn gmach""".split()
)
NOISE = set("wroclaw wroclawiu we w d ob obecnie dawny dawna dawne pw przy ul al pl im".split())


def _tokens(name: str) -> set[str]:
    return {t for t in norm(name).split() if t and t not in NOISE}


def _type_tags(p: dict[str, Any]) -> set[str]:
    scores = explicit_scores(p)
    return {t for t in GROUPS["type"] if scores.get(t, 0) >= TYPE_TAG_MIN_PERCENT}


def _same_object(a: dict[str, Any], b: dict[str, Any], ta: set[str], tb: set[str]) -> bool:
    d = meters(a["lat"], a["lon"], b["lat"], b["lon"])
    same_sources = set(a["sources"]) == set(b["sources"])
    limit = SAME_SOURCE_RADIUS_M if same_sources else CROSS_SOURCE_RADIUS_M
    if min(a.get("pos_quality", 3), b.get("pos_quality", 3)) <= IMPRECISE_QUALITY and not same_sources:
        limit = IMPRECISE_POSITION_RADIUS_M
    if d > limit:
        return False
    x, y = a["_tokens"], b["_tokens"]
    if not x or not y:
        return False
    small, big = (x, y) if len(x) <= len(y) else (y, x)
    if not small <= big:
        return False
    if not (small - KIND_WORDS):
        return False
    if small & PLACE_WORDS and any(re.search(r"\d", t) for t in big - small):
        return False
    if ta and tb and not (ta & tb):
        return False
    return True


def merge_near_duplicates(places: list[dict[str, Any]], region: Region) -> tuple[list[dict[str, Any]], int]:
    """Join places whose display names contain one another and that stand on the same spot."""
    for p in places:
        p["_tokens"] = _tokens(display_name(p, region))
    types = [_type_tags(p) for p in places]

    order = sorted(
        range(len(places)),
        key=lambda i: -(len(places[i].get("media") or []) * 2 + len(places[i]["sources"]) * 3 + (5 if places[i].get("extract") else 0)),
    )
    grid = Grid(cell_deg=_GRID_DEG)
    for i in range(len(places)):
        grid.add(i, places[i]["lat"], places[i]["lon"])

    parent = list(range(len(places)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    rank = {idx: n for n, idx in enumerate(order)}
    for i in order:
        a = places[i]
        for j in grid.near(a["lat"], a["lon"], rings=2):
            if j == i or rank[j] < rank[i]:
                continue
            if find(i) == find(j):
                continue
            if _same_object(a, places[j], types[i], types[j]):
                parent[find(j)] = find(i)

    groups: dict[int, list[int]] = defaultdict(list)
    for i in order:
        groups[find(i)].append(i)
    kept: list[dict[str, Any]] = []
    merged = 0
    for root, members in groups.items():
        survivor = places[members[0]]
        for k in members[1:]:
            absorb(survivor, places[k])
            merged += 1
        kept.append(survivor)
    for p in kept:
        p.pop("_tokens", None)
    return kept, merged
