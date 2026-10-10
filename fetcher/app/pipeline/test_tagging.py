from app.config import Region
from app.pipeline.tagging import apply_signals, explicit_scores, finalise, theme_scores

REGION = Region(id="x", name="X", south=0, west=0, north=1, east=1, german_until=1945)


def place(**kw):
    return {"name": "", "theme": "architecture", "kinds": [], "sources": [], **kw}


def tags(result):
    return {t["tag"]: t["percent"] for t in result}


def test_neogothic_label_spills_onto_gothic_but_stays_lower():
    scores = explicit_scores(place(name="Kościół św. Jana", style="neogotycki", function="kościół"))
    t = tags(finalise(scores, 1890))
    assert t["neogothic"] == 90
    assert 0 < t["gothic"] < t["neogothic"]
    assert t["church"] >= 80


def test_secession_and_art_nouveau_are_near_synonyms():
    t = tags(finalise(explicit_scores(place(style="secesyjny", function="kamienica")), 1905))
    assert abs(t["secession"] - t["art_nouveau"]) <= 5


def test_era_prior_is_weak_and_only_used_without_a_style():
    assert tags(finalise({}, 1700))["baroque"] <= 35
    with_style = tags(finalise({"modernism": 90}, 1700))
    assert "baroque" not in with_style


def test_osm_fee_and_wheelchair_override_guesses():
    scores = {"free_entry": 80, "park": 85}
    wc = apply_signals(scores, {"fee": "yes", "wheelchair": "limited"}, {})
    assert wc == "limited"
    assert "free_entry" not in scores
    assert scores["accessible"] == 50


def test_wikidata_claims_set_unesco_and_jewish_heritage():
    scores: dict[str, float] = {}
    apply_signals(scores, {}, {"P1435": ["Q9259"], "P140": ["Q9268"]})
    assert scores["unesco"] == 100 and scores["jewish_heritage"] == 100


def test_german_heritage_follows_region_cutoff():
    s = theme_scores(place(year=1900), {}, 10, REGION)
    assert s["german_heritage"] == 55
    assert "german_heritage" not in theme_scores(place(year=1960), {}, 10, REGION)


def test_wikidata_architectural_style_labels_a_place_without_nid():
    scores = explicit_scores(place(name="Kościół"), {"P149": ["Q186363"]})
    assert scores["neogothic"] == 90 and scores["gothic"] == 45
