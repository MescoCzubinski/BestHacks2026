import pytest

from app.config import REGION, load_settings


def test_region_box_is_valid_and_contains_the_city_centre():
    assert -90 <= REGION.south < REGION.north <= 90
    assert -180 <= REGION.west < REGION.east <= 180
    assert REGION.contains(51.11, 17.0326)
    assert not REGION.contains(52.23, 21.01)


def test_region_id_is_safe_for_sql_like_patterns_and_paths():
    assert all(c.isalnum() or c in "_-" for c in REGION.id)


def test_settings_use_the_built_in_region_and_need_the_database():
    s = load_settings({"DB_URL": "postgresql://x"})
    assert s.region is REGION
    assert "osm" in s.sources
    assert s.backend_url == "http://backend:8000"
    with pytest.raises(KeyError):
        load_settings({})


def test_optional_variables_override_the_defaults():
    s = load_settings(
        {
            "DB_URL": "postgresql://x",
            "SOURCES": "osm, wroclaw_gis,",
            "BACKEND_URL": "http://localhost:8000/",
            "RUN_ONCE": "1",
            "INTERVAL_SECONDS": "60",
            "EXPORT_SEED_PATH": "/cache/places.seed.json",
        }
    )
    assert s.sources == ("osm", "wroclaw_gis")
    assert s.backend_url == "http://localhost:8000"
    assert s.run_once is True
    assert s.interval_s == 60
    assert str(s.export_path) == "/cache/places.seed.json"


def test_defaults_do_not_run_once_or_export():
    s = load_settings({"DB_URL": "postgresql://x"})
    assert s.run_once is False
    assert s.export_path is None
    assert s.interval_s == 7 * 24 * 3600
