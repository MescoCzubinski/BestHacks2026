"""Writes place documents into the tables the backend owns (`places`, `place_tags`). Never runs DDL.

All statements are parameterised and idempotent: places upsert on `external_id`, tags are replaced per place.
"""

import json
import logging
import re
from collections.abc import Iterable, Sequence
from typing import Any

import psycopg
from psycopg import sql

log = logging.getLogger("db")

CHUNK = 500
_REGION_ID = re.compile(r"[a-z0-9_-]{1,32}")

UPSERT_PLACE = sql.SQL(
    """
    INSERT INTO places (external_id, name, latitude, longitude, description, address, position_quality, year, date_text,
                        significance, facts, links, sources, main_image_url, images)
    VALUES (%(externalId)s, %(name)s, %(latitude)s, %(longitude)s, %(description)s, %(address)s, %(positionQuality)s, %(year)s,
            %(dateText)s, %(significance)s, %(facts)s, %(links)s, %(sources)s, %(mainImageUrl)s, %(images)s)
    ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        description = EXCLUDED.description, address = EXCLUDED.address, position_quality = EXCLUDED.position_quality,
        year = EXCLUDED.year, date_text = EXCLUDED.date_text, significance = EXCLUDED.significance,
        facts = EXCLUDED.facts, links = EXCLUDED.links, sources = EXCLUDED.sources,
        main_image_url = EXCLUDED.main_image_url, images = EXCLUDED.images, updated_at = now()
    """
)
DELETE_TAGS = "DELETE FROM place_tags WHERE place_id IN (SELECT id FROM places WHERE external_id = ANY(%s))"
INSERT_TAG = (
    "INSERT INTO place_tags (place_id, tag, percent) "
    "SELECT id, %s::style_tag, %s FROM places WHERE external_id = %s"
)
MIN_KEEP_RATIO = 0.5  # a run that yields less than this share of the existing places is treated as a partial failure
COUNT = "SELECT count(*) FROM places WHERE external_id LIKE %s"
PRUNE = "DELETE FROM places WHERE external_id LIKE %s AND NOT (external_id = ANY(%s))"


def _params(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        **doc,
        "address": json.dumps(doc["address"], ensure_ascii=False),
        "facts": json.dumps(doc["facts"], ensure_ascii=False),
        "links": json.dumps(doc["links"], ensure_ascii=False),
    }


def _chunks(items: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def save_places(conn: psycopg.Connection, region_id: str, docs: list[dict[str, Any]]) -> dict[str, int]:
    """Upsert every document, replace its tags, and remove this region's places that are no longer produced."""
    if not _REGION_ID.fullmatch(region_id):
        raise ValueError("invalid region id")
    ids = [d["externalId"] for d in docs]
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(COUNT, (f"{region_id}:%",))
        existing = cur.fetchone()[0]  # type: ignore[index]  # counted before this run writes anything
        for chunk in _chunks(docs, CHUNK):
            cur.executemany(UPSERT_PLACE, [_params(d) for d in chunk])
            cur.execute(DELETE_TAGS, ([d["externalId"] for d in chunk],))
            cur.executemany(INSERT_TAG, [(t["tag"], t["percent"], d["externalId"]) for d in chunk for t in d["tags"]])
        removed = 0
        if existing and len(ids) < existing * MIN_KEEP_RATIO:
            log.warning("only %d of %d existing places produced; skipping prune (likely a partial source failure)", len(ids), existing)
        else:
            cur.execute(PRUNE, (f"{region_id}:%", ids))
            removed = cur.rowcount
    log.info("saved %d places, removed %d stale", len(docs), removed)
    return {"saved": len(docs), "removed": removed}
