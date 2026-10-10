import pytest

from app.config import REGION, load_settings


def test_region_box_is_valid_and_contains_the_city_centre():
    assert -90 <= REGION.south < REGION.north <= 90
    assert -180 <= REGION.west < REGION.east <= 180
    assert REGION.contains(51.11, 17.0326)  # Rynek
    assert not REGION.contains(52.23, 21.01)  # Warsaw


def test_region_id_is_safe_for_sql_like_patterns_and_paths():
    assert all(c.isalnum() or c in "_-" for c in REGION.id)


def test_settings_use_the_built_in_region_and_need_the_database_and_embedding_token():
    s = load_settings({"DB_URL": "postgresql://x", "EMBEDDING_API_TOKEN": "t"})
    assert s.region is REGION
    assert "osm" in s.sources
    assert s.backend_url == "http://backend:8000"
    with pytest.raises(KeyError):
        load_settings({})
