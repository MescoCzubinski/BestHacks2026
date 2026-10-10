"""Configuration, read once from environment variables (fails at boot when required ones are missing)."""

import os
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


# The area this fetcher covers. One region is built in; the bounding box drives every source query.
REGION = Region(
    id="wroclaw",  # prefix of every external_id, cache folder name and prune scope
    name="Wrocław",
    south=50.99,
    west=16.78,
    north=51.22,
    east=17.18,
    lang="pl",
    municipality="Wrocław",  # locality filter for the national register (NID)
    admin_area="dolnośląskie",
    german_until=1945,  # Wrocław was German Breslau until 1945
)


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    export = env.get("EXPORT_SEED_PATH")
    return Settings(
        db_url=env["DB_URL"],
        region=REGION,
        sources=tuple(s.strip() for s in env.get("SOURCES", ",".join(DEFAULT_SOURCES)).split(",") if s.strip()),
        cache_dir=Path(env.get("CACHE_DIR", "/cache")),
        model_name=env.get("EMBEDDING_MODEL", "intfloat/multilingual-e5-base"),
        interval_s=int(env.get("INTERVAL_SECONDS", str(7 * 24 * 3600))),
        run_once=env.get("RUN_ONCE", "") in ("1", "true", "yes"),
        export_path=Path(export) if export else None,
    )
