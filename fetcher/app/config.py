"""Configuration, read once from environment variables (fails at boot when required ones are missing)."""

import os
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Region:
    """The area the pipeline covers. The bounding box drives every source; the municipality is only
    used to filter the national monument register (NID), which is published for the whole country."""

    id: str
    name: str
    south: float
    west: float
    north: float
    east: float
    lang: str = "pl"
    municipality: str = ""
    admin_area: str = ""  # voivodeship / state, only used for the address
    country: str = "Polska"
    country_code: str = "PL"
    german_until: int | None = None  # year before which buildings count as German heritage (Wrocław: 1945)

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return self.south, self.west, self.north, self.east

    def contains(self, lat: float, lon: float) -> bool:
        return self.south <= lat <= self.north and self.west <= lon <= self.east

    @property
    def centre(self) -> tuple[float, float]:
        return (self.south + self.north) / 2, (self.west + self.east) / 2


@dataclass(frozen=True)
class Settings:
    db_url: str
    region: Region
    sources: tuple[str, ...]
    cache_dir: Path
    model_name: str
    interval_s: int
    run_once: bool
    export_path: Path | None
    health_port: int = 8000


DEFAULT_SOURCES = ("osm", "wikidata", "nid", "commons")


def parse_region(env: dict[str, str]) -> Region:
    rid = env["REGION_ID"]
    if not re.fullmatch(r"[a-z0-9_-]{1,32}", rid):
        raise ValueError("REGION_ID must be 1-32 chars of [a-z0-9_-]")
    try:
        south, west, north, east = (float(x) for x in env["REGION_BBOX"].split(","))
    except ValueError as exc:
        raise ValueError("REGION_BBOX must be 'south,west,north,east' in decimal degrees") from exc
    if not (-90 <= south < north <= 90 and -180 <= west < east <= 180):
        raise ValueError("REGION_BBOX is not a valid box (south<north, west<east)")
    return Region(
        id=rid,
        name=env.get("REGION_NAME", rid),
        south=south,
        west=west,
        north=north,
        east=east,
        lang=env.get("REGION_LANG", "pl"),
        municipality=env.get("REGION_MUNICIPALITY", ""),
        admin_area=env.get("REGION_ADMIN_AREA", ""),
        country=env.get("REGION_COUNTRY", "Polska"),
        country_code=env.get("REGION_COUNTRY_CODE", "PL"),
        german_until=int(env["REGION_GERMAN_UNTIL"]) if env.get("REGION_GERMAN_UNTIL") else None,
    )


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    export = env.get("EXPORT_SEED_PATH")
    return Settings(
        db_url=env["DB_URL"],
        region=parse_region(env),
        sources=tuple(s.strip() for s in env.get("SOURCES", ",".join(DEFAULT_SOURCES)).split(",") if s.strip()),
        cache_dir=Path(env.get("CACHE_DIR", "/cache")),
        model_name=env.get("EMBEDDING_MODEL", "intfloat/multilingual-e5-base"),
        interval_s=int(env.get("INTERVAL_SECONDS", str(7 * 24 * 3600))),
        run_once=env.get("RUN_ONCE", "") in ("1", "true", "yes"),
        export_path=Path(export) if export else None,
    )
