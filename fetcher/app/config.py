import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Region:
    id: str
    name: str
    south: float
    west: float
    north: float
    east: float
    lang: str = "pl"
    municipality: str = ""
    admin_area: str = ""
    country: str = "Polska"
    country_code: str = "PL"
    german_until: int | None = None

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
    interval_s: int
    run_once: bool
    export_path: Path | None
    backend_url: str
    health_port: int = 8000


DEFAULT_SOURCES = ("osm", "wikidata", "nid", "commons")


REGION = Region(
    id="wroclaw",
    name="Wrocław",
    south=50.99,
    west=16.78,
    north=51.22,
    east=17.18,
    lang="pl",
    municipality="Wrocław",
    admin_area="dolnośląskie",
    german_until=1945,
)


def load_settings(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    export = env.get("EXPORT_SEED_PATH")
    return Settings(
        db_url=env["DB_URL"],
        region=REGION,
        sources=tuple(s.strip() for s in env.get("SOURCES", ",".join(DEFAULT_SOURCES)).split(",") if s.strip()),
        cache_dir=Path(env.get("CACHE_DIR", "/cache")),
        interval_s=int(env.get("INTERVAL_SECONDS", str(7 * 24 * 3600))),
        run_once=env.get("RUN_ONCE", "") in ("1", "true", "yes"),
        export_path=Path(export) if export else None,
        backend_url=env.get("BACKEND_URL", "http://backend:8000").rstrip("/"),
    )
