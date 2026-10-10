"""Source records -> place documents ready for the backend (merge, link photos, clean, normalise, tag)."""

import hashlib
import logging
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from ..config import Region
from ..taxonomy import GROUP_OF
from .clean import clean
from .dedupe import merge_near_duplicates
from .geo import Grid, meters
from .merge import Merger
from .normalize import DESCRIPTION_MAX_CHARS, clean_kinds, clip, collect_images, display_name, significance, split_address
from .tagging import (
    WD_POMNIK_HISTORII,
    Embedder,
    apply_signals,
    explicit_scores,
    finalise,
    infer_styles,
    theme_scores,
)
from .text import name_sim

log = logging.getLogger("build")

POSITION_NAMES = {4: "address", 3: "point", 2: "street", 1: "centroid"}
OSM_RADIUS_M = 20.0
NID_EXACT_RADIUS_M = 60.0
NID_STREET_RADIUS_M = 120.0
GIS_POINT_RADIUS_M = 30.0
GIS_AREA_RADIUS_M = 15.0
HISTORY_RADIUS_M = 200.0
PHOTO_RADIUS_M = 40.0
PHOTOS_PER_PLACE_LINKS = 2  # a photo is attached to at most this many nearby places
POMNIK_HISTORII_BONUS = 25


@dataclass
class SourceData:
    osm: list[dict[str, Any]] = field(default_factory=list)
    wikidata: list[dict[str, Any]] = field(default_factory=list)
    nid: list[dict[str, Any]] = field(default_factory=list)
    nid_history: list[dict[str, Any]] = field(default_factory=list)
    gis: list[dict[str, Any]] = field(default_factory=list)
    gis_register_points: list[dict[str, Any]] = field(default_factory=list)
    photos: list[dict[str, Any]] = field(default_factory=list)
    wikidata_claims: dict[str, dict[str, Any]] = field(default_factory=dict)


def merge_sources(data: SourceData) -> Merger:
    m = Merger()
    for rec in data.osm:
        m.ingest(rec, OSM_RADIUS_M)
    by_qid = {p["wikidata"]: i for i, p in enumerate(m.places) if p.get("wikidata")}
    for rec in data.wikidata:
        i = by_qid.get(rec["wikidata"])
        if i is not None:
            m.merge_into(i, rec)
        else:
            j, _ = m.ingest(rec, OSM_RADIUS_M)
            by_qid[rec["wikidata"]] = j
    for rec in data.nid:
        if rec.get("lat") is None:
            m.add_new(rec)  # unplaced: removed by cleanup, kept here so the report can count it
        else:
            m.ingest(rec, NID_EXACT_RADIUS_M if rec["pos_quality"] == 4 else NID_STREET_RADIUS_M)
    for rec in data.gis:
        m.ingest(rec, GIS_POINT_RADIUS_M if rec["geom"] == "point" else GIS_AREA_RADIUS_M)
    for rec in data.gis_register_points:
        m.ingest_register_point(rec)
    for rec in data.nid_history:
        m.ingest(rec, HISTORY_RADIUS_M)
    return m


def link_photos(places: list[dict[str, Any]], photos: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Attach each geotagged photo to the nearest named place(s) within a few metres."""
    grid = Grid()
    for i, p in enumerate(places):
        if p.get("lat") is not None:
            grid.add(i, p["lat"], p["lon"])
    by_id: dict[str, dict[str, Any]] = {}
    for ph in photos:
        pid = f"commons:{ph['pageid']}"
        by_id[pid] = {"thumb": ph.get("thumb"), "license": ph.get("license"), "author": ph.get("artist"), "page": ph.get("page")}
        cands = []
        for i in grid.near(ph["lat"], ph["lon"]):
            p = places[i]
            d = meters(ph["lat"], ph["lon"], p["lat"], p["lon"])
            if d <= PHOTO_RADIUS_M:
                sim = name_sim(f"{ph['title']} {ph.get('description', '')}", p.get("name")) if p.get("name") else 0.0
                cands.append((d - 30 * sim, i))
        for _, i in sorted(cands)[:PHOTOS_PER_PLACE_LINKS]:
            places[i].setdefault("media", []).append(pid)
    return by_id


def external_id(region: Region, p: dict[str, Any], taken: set[str]) -> str:
    refs = p.get("refs") or {}
    for key in ("nid", "nid_ph", "wikidata", "osm"):
        if refs.get(key):
            ref = f"{key}:{refs[key]}"
            break
    else:
        gis = refs.get("gis") or []
        if gis:
            ref = f"gis:{gis[0]}"
        else:
            ref = "h:" + hashlib.sha1(f"{p.get('name')}|{p['lat']:.5f}|{p['lon']:.5f}".encode()).hexdigest()[:12]
    ext = f"{region.id}:{ref}"
    n = 2
    while ext in taken:  # two merged places can share a primary ref only through a merge quirk
        ext = f"{region.id}:{ref}#{n}"
        n += 1
    taken.add(ext)
    return ext


def build_documents(region: Region, data: SourceData, embedder: Embedder) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    merger = merge_sources(data)
    media_by_id = link_photos(merger.places, data.photos)
    places, drops = clean(merger.places, region)
    places, joined = merge_near_duplicates(places, region)
    drops["duplicate_display_name"] += joined
    log.info("merged %d records into %d places; cleanup kept %d, dropped %s", sum(map(len, [data.osm, data.wikidata, data.nid])), len(merger.places), len(places), dict(drops))

    explicit = [explicit_scores(p, data.wikidata_claims.get(p.get("wikidata") or "")) for p in places]
    inferred, classifier_report = infer_styles(places, explicit, embedder)

    docs: list[dict[str, Any]] = []
    taken: set[str] = set()
    nameless = 0
    tag_counter: Counter[str] = Counter()
    for p, ex, inf in zip(places, explicit, inferred):
        name = display_name(p, region)
        if not name:
            nameless += 1
            continue
        claims = data.wikidata_claims.get(p.get("wikidata") or "", {})
        sig = significance(p)
        if WD_POMNIK_HISTORII in claims.get("P1435", []):
            sig = min(100, sig + POMNIK_HISTORII_BONUS)
        scores = dict(inf)
        for t, v in ex.items():
            scores[t] = max(scores.get(t, 0), v)
        for t, v in theme_scores(p, scores, sig, region).items():
            scores[t] = max(scores.get(t, 0), v)
        wheelchair = apply_signals(scores, p.get("flags") or {}, claims)
        tags = finalise(scores, p.get("year"))
        tag_counter.update(t["tag"] for t in tags)
        street, number = split_address(p.get("address") or "")
        images = collect_images(p, media_by_id)
        facts = {
            "style": p.get("style"),
            "function": p.get("function"),
            "material": p.get("material"),
            "protection": p.get("protection"),
            "inscription": clip(p.get("inscription") or "", 200),
            "wheelchair": wheelchair,
            "openingHours": (p.get("flags") or {}).get("opening_hours"),
            "kinds": clean_kinds(p)[:3],
        }
        links = {"wikipedia": p.get("wikipedia"), "wikidata": p.get("wikidata"), "website": p.get("website"), "nid": p.get("nid_link")}
        address = {"street": street, "houseNumber": number, "postalCode": "", "city": region.name, "country": region.country, "countryCode": region.country_code}
        if region.admin_area:
            address["region"] = region.admin_area
        docs.append(
            {
                "externalId": external_id(region, p, taken),
                "name": clip(name, 200),
                "latitude": round(p["lat"], 6),
                "longitude": round(p["lon"], 6),
                "description": clip(p.get("extract") or p.get("description") or p.get("inscription") or "", DESCRIPTION_MAX_CHARS) or None,
                "address": address,
                "positionQuality": POSITION_NAMES.get(p.get("pos_quality"), "point"),
                "year": p.get("year") or None,
                "dateText": p.get("date_text") or None,
                "significance": sig,
                "facts": {k: v for k, v in facts.items() if v},
                "links": {k: v for k, v in links.items() if v},
                "sources": p["sources"],
                "mainImageUrl": images[0] if images else None,
                "images": images,
                "tags": tags,
            }
        )
    report = {
        "kept": len(docs),
        "dropped": {**drops, "no_usable_name": nameless},
        "with_style_tag": sum(1 for d in docs if any(GROUP_OF[t["tag"]] == "style" for t in d["tags"])),
        "with_type_tag": sum(1 for d in docs if any(GROUP_OF[t["tag"]] == "type" for t in d["tags"])),
        "with_image": sum(1 for d in docs if d["mainImageUrl"]),
        "tag_counts": dict(tag_counter.most_common()),
        "style_classifier": classifier_report,
    }
    return docs, report
