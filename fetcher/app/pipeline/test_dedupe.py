from app.config import Region
from app.pipeline.dedupe import merge_near_duplicates

REGION = Region(id="wroclaw", name="Wrocław", south=50.99, west=16.78, north=51.22, east=17.18, municipality="Wrocław")


def place(name, lat=51.1, lon=17.0, sources=("osm",), **kw):
    return {"name": name, "lat": lat, "lon": lon, "theme": "architecture", "sources": list(sources), "kinds": [], "refs": {}, **kw}


def names(places):
    return sorted(p["name"] for p in places)


def test_joins_bare_register_name_with_the_address_form_from_another_source():
    a = place("czesalnia", sources=("nid",), address="Stabłowicka 118a", media=["commons:1"])
    b = place("czesalnia, Stabłowicka 118a", lat=51.10015, sources=("wikidata",))
    kept, merged = merge_near_duplicates([a, b], REGION)
    assert merged == 1 and len(kept) == 1
    assert set(kept[0]["sources"]) == {"nid", "wikidata"}
    assert kept[0]["media"] == ["commons:1"]


def test_keeps_generic_names_apart():
    kept, merged = merge_near_duplicates([place("Pomnik"), place("Pomnik", lat=51.1001, sources=("wikidata",))], REGION)
    assert merged == 0 and len(kept) == 2
    kept, merged = merge_near_duplicates([place("Pomnik"), place("Pomnik papieża Jana Pawła II", lat=51.1001, sources=("wikidata",))], REGION)
    assert merged == 0


def test_does_not_join_a_square_with_the_house_number_building_on_it():
    sq = place("Plac Teatralny", sources=("wikidata",))
    house = place("Kamienica, Plac Teatralny 2", lat=51.10015, sources=("nid",))
    kept, merged = merge_near_duplicates([sq, house], REGION)
    assert merged == 0


def test_roman_numerals_keep_distinct_buildings_apart():
    a = place("Wiata peronowa I na peronie 1", sources=("nid",))
    b = place("Wiata peronowa III", lat=51.10015, sources=("wikidata",))
    kept, merged = merge_near_duplicates([a, b], REGION)
    assert merged == 0


def test_far_apart_same_name_is_not_joined():
    a = place("Kościół św. Mikołaja", sources=("nid",))
    b = place("Kościół św. Mikołaja", lat=51.105, sources=("wikidata",))
    assert merge_near_duplicates([a, b], REGION)[1] == 0


def test_register_entry_placed_on_its_street_joins_the_building_it_names():
    registered = place("dom towarowy Feniks", lat=51.1100, lon=17.0318, sources=("nid",), pos_quality=2)
    mapped = place("Feniks", lat=51.1094, lon=17.0336, sources=("osm", "wikidata"), pos_quality=3)
    kept, merged = merge_near_duplicates([registered, mapped], REGION)
    assert merged == 1


def test_street_level_position_does_not_join_different_names():
    a = place("Kościół św. Jana", lat=51.1100, lon=17.0318, sources=("nid",), pos_quality=2)
    b = place("Kościół św. Piotra", lat=51.1101, lon=17.0319, sources=("wikidata",), pos_quality=3)
    assert merge_near_duplicates([a, b], REGION)[1] == 0


def test_address_added_on_one_side_still_joins_when_the_name_is_not_a_place():
    a = place("budynek szpitalny I", sources=("nid",))
    b = place("budynek szpitalny I, gen. Romualda Traugutta 116", lat=51.10015, sources=("wikidata",))
    assert merge_near_duplicates([a, b], REGION)[1] == 1
