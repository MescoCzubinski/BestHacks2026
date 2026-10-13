import json
import logging
from typing import Any

import psycopg

from .cache import Cache
from .config import Settings
from .db import ensure_schema, save_city, save_places
from .http import Http
from .pipeline.build import SourceData, build_documents
from .pipeline.tagging import Embedder
from .sources import commons, nid, osm, wikidata, wroclaw_gis

log = logging.getLogger("job")


def gather(settings: Settings, http: Http, cache: Cache) -> SourceData:
    region, wanted = settings.region, set(settings.sources)
    data = SourceData()
    if "osm" in wanted:
        data.osm = osm.to_records(osm.fetch_elements(http, cache, region))
    if "wikidata" in wanted:
        items = wikidata.fetch_items(http, cache, region)
        wikidata.fill_extracts(http, cache, region, items)
        data.wikidata = wikidata.to_records(items)
        data.wikidata_claims = wikidata.fetch_claims(http, cache, [i["qid"] for i in items])
    if "nid" in wanted and region.municipality:
        rows = nid.fetch_rows(http, cache, region)
        data.nid = nid.to_records(rows, nid.geocode_rows(http, cache, region, rows))
        data.nid_history = nid.fetch_history_monuments(http, cache, region)
    if "wroclaw_gis" in wanted:
        data.gis = wroclaw_gis.fetch(http, cache, region)
        data.gis_register_points = wroclaw_gis.fetch_register_points(http, cache, region)
    if "commons" in wanted:
        data.photos = commons.fetch_files(http, cache, region)
    return data


def run(settings: Settings, http: Http, embedder: Embedder) -> dict[str, Any]:
    embedder.wait_until_ready()
    cache = Cache(settings.cache_dir, settings.region.id)
    data = gather(settings, http, cache)
    docs, report = build_documents(settings.region, data, embedder)
    if not docs:
        raise RuntimeError("pipeline produced no places; refusing to overwrite the database")
    if settings.export_path:
        settings.export_path.parent.mkdir(parents=True, exist_ok=True)
        settings.export_path.write_text(json.dumps(docs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        settings.export_path.with_suffix(".report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
        log.info("exported %d places to %s", len(docs), settings.export_path)
    with psycopg.connect(settings.db_url, autocommit=False) as conn:
        ensure_schema(conn)
        save_city(conn, settings.region)
        report["db"] = save_places(conn, settings.region.id, docs)
    return report
