from app.config import Region
from app.pipeline.clean import clean

REGION = Region(id="wroclaw", name="Wrocław", south=50.99, west=16.78, north=51.22, east=17.18, municipality="Wrocław")


def place(name, lat=51.1, lon=17.0, sources=("osm",), **kw):
    return {"name": name, "lat": lat, "lon": lon, "theme": "architecture", "sources": list(sources), "kinds": [], "refs": {}, **kw}


def test_drops_streets_and_unnamed_generic_objects():
    places = [
        place("Ulica Gwarna", kinds=["ulica"]),
        place("", kinds=["building"]),
        place("", kinds=["wayside_cross"]),
        place("Hala Stulecia"),
    ]
    kept, drops = clean(places, REGION)
    assert {p["name"] for p in kept} == {"", "Hala Stulecia"}
    assert drops["street_district_or_stop"] == 1
    assert drops["unnamed_not_visitable"] == 1


def test_merges_same_name_from_different_sources_within_400m_and_fills_gaps():
    a = place("Hala Stulecia", lat=51.1069, lon=17.0773, sources=("osm",), media=["commons:1"])
    b = place("Wrocław - Hala Stulecia", lat=51.1075, lon=17.0738, sources=("nid",), year=1912)
    kept, drops = clean([a, b], REGION)
    assert len(kept) == 1
    assert kept[0]["year"] == 1912
    assert set(kept[0]["sources"]) == {"osm", "nid"}
    assert drops["duplicate_name_nearby"] == 1


def test_short_generic_names_are_not_merged_across_sources():
    a = place("Pomnik", lat=51.1000, lon=17.0000, sources=("osm",))
    b = place("Pomnik", lat=51.1020, lon=17.0000, sources=("wikidata",))
    kept, _ = clean([a, b], REGION)
    assert len(kept) == 2
