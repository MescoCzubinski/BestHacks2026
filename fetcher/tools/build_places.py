"""Offline build: merged Wrocław dataset -> backend seed (places + graded tags).

Run on a dev machine (needs sentence-transformers, scikit-learn, numpy; not part of the fetcher image):

    python -I fetcher/tools/build_places.py --data <dataset dir> --out backend/src/common/db/seed/places.seed.json

Steps: clean -> normalise (names, address, images) -> tag. Tags are graded 0-100:
  * explicit labels from the sources (NID style, function, OSM/Wikidata kinds) score 80-100,
  * a multilingual-e5 embedding + logistic regression trained on those labels fills in the
    unlabelled buildings (scores capped at 70 so inferred tags never outrank explicit ones),
  * tags near each other (neogothic -> gothic, secession <-> art_nouveau) spill part of their score.
"""

import argparse
import json
import logging
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np

from taxonomy import ALL_TAGS, GROUP_OF, GROUPS

log = logging.getLogger("build_places")

# ---------------------------------------------------------------- cleaning

GENERIC_KINDS = {"yes", "building", "house", "architecture", "heritage", "historic", "ruins?"}
# Unnamed objects survive only when the kind is something a visitor can actually look at.
VISITABLE_KINDS = re.compile(
    r"mural|graffiti|sculpture|statue|memorial|monument|wayside|shrine|viewpoint|tower|bunker|ruin|dwarf|tomb|"
    r"installation|artwork|fountain|bridge|synagog|church|chapel|castle|palace|villa",
    re.I,
)
KIND_PL = {
    "mural": "Mural",
    "graffiti": "Graffiti",
    "sculpture": "Rzeźba",
    "statue": "Pomnik",
    "memorial": "Pomnik",
    "monument": "Pomnik",
    "wayside_cross": "Krzyż przydrożny",
    "wayside_shrine": "Kapliczka przydrożna",
    "viewpoint": "Punkt widokowy",
    "tower": "Wieża",
    "bunker": "Bunkier",
    "ruins": "Ruiny",
    "dwarf": "Krasnal",
    "tomb": "Grobowiec",
    "installation": "Instalacja artystyczna",
    "artwork": "Dzieło sztuki",
    "fountain": "Fontanna",
    "bridge": "Most",
}
DEDUPE_RADIUS_M = 35.0
ZOO_CENTRE = {"lat": 51.1043, "lon": 17.0746}  # Wrocław Zoo; its animals are OSM tourism=attraction nodes
ZOO_RADIUS_M = 600.0


def meters(a: dict, b: dict) -> float:
    dy = (a["lat"] - b["lat"]) * 111_200
    dx = (a["lon"] - b["lon"]) * 111_200 * math.cos(math.radians(a["lat"]))
    return math.hypot(dx, dy)


def norm_name(s: str) -> str:
    return re.sub(r"[^\w]+", " ", (s or "").lower()).strip()


def is_unnamed_junk(p: dict) -> bool:
    if (p.get("name") or "").strip():
        return False
    rich = p.get("description") or p.get("extract") or p.get("wikipedia") or p.get("media")
    if rich:
        return False
    kinds = [k for k in (p.get("kinds") or []) if k and k not in GENERIC_KINDS]
    return not any(VISITABLE_KINDS.search(k) for k in kinds)


NOT_PLACES = re.compile(r"^(ulica|droga|trasa|część miasta|część miejscowości|przystanek|przystań|przystanek osobowy|osiedle \(jednostka\))", re.I)


def is_not_a_place(p: dict) -> bool:
    """Streets, districts and bus/rail stops from Wikidata; animal enclosures inside the zoo (OSM tourism=attraction)."""
    kinds = [k.lower() for k in p.get("kinds") or []]
    if kinds and any(NOT_PLACES.match(k) or k.startswith("droga") for k in kinds[:2]):
        return True
    in_zoo = p.get("lat") is not None and meters(p, ZOO_CENTRE) < ZOO_RADIUS_M
    return kinds == ["attraction"] and in_zoo and p["sources"] == ["osm"] and not (p.get("wikipedia") or p.get("wikidata"))


def clean(places: list[dict]) -> tuple[list[dict], Counter]:
    drops: Counter = Counter()
    kept = []
    for p in places:
        if p.get("position_quality") == "none" or p.get("lat") is None:
            drops["no_position"] += 1
        elif p["theme"] == "archaeology" and not (p.get("name") or "").strip():
            drops["unnamed_archaeological_site"] += 1
        elif is_not_a_place(p):
            drops["street_district_stop_or_zoo_animal"] += 1
        elif is_unnamed_junk(p):
            drops["unnamed_not_visitable"] += 1
        else:
            kept.append(p)

    # near-duplicates the first merge missed: same normalised name within a few metres
    def richness(p: dict) -> int:
        return len(p.get("media") or []) * 2 + len(p["sources"]) * 3 + (5 if p.get("extract") else 0)

    cell: dict[tuple[int, int], list[dict]] = {}
    out = []
    for p in sorted(kept, key=richness, reverse=True):
        n = norm_name(p.get("name"))
        key = (int(p["lat"] * 2000), int(p["lon"] * 1400))
        dup = False
        if n:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for q in cell.get((key[0] + dx, key[1] + dy), []):
                        if norm_name(q.get("name")) == n and meters(p, q) < DEDUPE_RADIUS_M:
                            dup = True
        if dup:
            drops["duplicate_name_nearby"] += 1
            continue
        cell.setdefault(key, []).append(p)
        out.append(p)
    return out, drops


# ---------------------------------------------------------------- normalising

CITY = {"city": "Wrocław", "region": "dolnośląskie", "country": "Polska", "countryCode": "PL"}


def split_address(raw: str) -> tuple[str, str]:
    m = re.match(r"^(?P<street>.*?)[\s,]+(?P<no>\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)?)\s*$", (raw or "").strip())
    if m:
        return m.group("street").strip(" ,"), m.group("no")
    return (raw or "").strip(), ""


def display_name(p: dict) -> str:
    name = re.sub(r"\s+we Wrocławiu$", "", (p.get("name") or "").strip())
    if name:
        return name
    for k in p.get("kinds") or []:
        if k in KIND_PL:
            street = split_address(p.get("address") or "")[0]
            return f"{KIND_PL[k]}, {street}" if street else KIND_PL[k]
    fn = (p.get("function") or "").strip()
    if fn:
        street = split_address(p.get("address") or "")[0]
        return f"{fn[:1].upper()}{fn[1:]}, {street}" if street else fn[:1].upper() + fn[1:]
    return "Obiekt bez nazwy"


def clip(s: str, n: int) -> str:
    s = re.sub(r"\s+", " ", (s or "")).strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def significance(p: dict) -> int:
    s = 5 if (p.get("name") or "").strip() else 0
    s += 25 if p.get("wikipedia") else 0
    s += 10 if p.get("wikidata") else 0
    n_media = len(p.get("media") or [])
    s += (15 if n_media else 0) + (5 if n_media >= 3 else 0)
    s += 15 if p.get("extract") else 5 if p.get("description") else 0
    s += 20 if "rejestr" in (p.get("protection") or "") else 0
    s += min(10, 5 * (len(p["sources"]) - 1))
    s += 3 if p.get("year") else 0
    return min(100, s)


def collect_images(p: dict, media: dict[str, dict]) -> list[str]:
    urls = [media[m]["thumb"] for m in p.get("media") or [] if m in media and media[m].get("thumb")]
    img = p.get("image") or ""
    if re.search(r"\.(jpe?g|png|webp)", img, re.I) and "/wiki/File:" not in img:
        urls.insert(0, img)
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out[:6]


# ---------------------------------------------------------------- explicit tag rules


def R(pattern: str) -> re.Pattern:
    return re.compile(pattern, re.I)


TYPE_RULES: list[tuple[str, re.Pattern, int]] = [
    ("cathedral", R(r"katedr|bazylik|cathedral"), 90),
    ("church", R(r"kości[oó]ł|cerkiew|kaplic|parafi|church|chapel|plebani|klasztor|kanoni"), 85),
    ("synagogue", R(r"synagog|bóżnic"), 95),
    ("castle", R(r"zamek|castle"), 90),
    ("palace", R(r"pałac|palace|dwór|rezydencj"), 85),
    ("tenement", R(r"kamienic|tenement|budynek mieszkaln|dom czynszow"), 85),
    ("townhouse", R(r"kamienic|dom mieszczańsk|townhouse"), 55),
    ("villa", R(r"willa|villa"), 90),
    ("town_hall", R(r"ratusz|town hall"), 95),
    ("market_square", R(r"^rynek\b|marketplace|plac targow"), 80),
    ("museum", R(r"muzeum|museum|panorama|galeri"), 85),
    ("theatre", R(r"teatr|theatre"), 90),
    ("opera", R(r"\boper[aey]\b|filharmoni"), 90),
    ("library", R(r"bibliotek|library"), 90),
    ("university", R(r"uniwersytet|politechnik|akademi|kolegium|university|dydaktyczn"), 80),
    ("school", R(r"szkoł|gimnazjum|liceum|school"), 80),
    ("hospital", R(r"szpital|klinik|sanatori|hospital"), 85),
    ("train_station", R(r"dworzec|stacja kolej|train station|railway station|lokomotywowni"), 90),
    ("bridge", R(r"\bmost\b|\bmosty\b|kładk|wiadukt|bridge"), 90),
    ("tower", R(r"wież|baszt|\btower\b"), 85),
    ("fortification", R(r"fortyfik|mur obronn|bastion|\bfort\b|twierdz|fortress|szaniec|reduta|bastei|schron"), 85),
    ("monument", R(r"pomnik|monument|memorial|obelisk|tablica pami|\btomb\b"), 85),
    ("fountain", R(r"fontann|fountain|studni"), 90),
    ("cemetery", R(r"cmentarz|cemetery|grobow|nagrob|mauzole"), 90),
    ("factory", R(r"fabryk|zakład|elektrown|gazowni|wodoci|przemysł|factory|oczyszczalni|kotłowni|pompown"), 80),
    ("warehouse", R(r"magazyn|spichlerz|warehouse"), 85),
    ("brewery", R(r"browar|słodown|brewery"), 90),
    ("market_hall", R(r"hala targow|market hall|hala stulecia"), 75),
    ("stadium", R(r"stadion|stadium|hala sportow"), 90),
    ("hotel", R(r"\bhotel\b|zajazd|pensjonat"), 85),
    ("residential_estate", R(r"osiedle|kolonia|estate"), 80),
    ("sculpture", R(r"rzeźb|sculpture|\bstatu|figur|installation|artwork"), 80),
    ("shrine", R(r"kapliczk|krzyż|shrine|wayside"), 90),
    ("bunker", R(r"bunkier|bunker|schron"), 90),
    ("ruins", R(r"ruin"), 85),
]
NATURE_RULES: list[tuple[str, re.Pattern, int]] = [
    ("botanical_garden", R(r"botaniczn"), 95),
    ("zoo", R(r"\bzoo\b|zoolog"), 95),
    ("park", R(r"\bpark\b|zieleń|zieleni|planty|historic green"), 85),
    ("garden", R(r"ogród|ogrod|garden"), 75),
    ("island", R(r"\bwysp|ostrów|ostrow|island"), 85),
    ("riverside", R(r"bulwar|nabrzeż|\bodr[aąy]\b|fosa|kanał|river"), 70),
    ("square", R(r"\bplac\b|skwer|rondo|square"), 70),
    ("viewpoint", R(r"widokow|viewpoint|taras"), 90),
]

STYLE_MAP: dict[str, dict[str, int]] = {
    "romański": {"romanesque": 90, "medieval": 70},
    "gotycki": {"gothic": 90, "medieval": 75},
    "renesansowy": {"renaissance": 90},
    "manierystyczny": {"mannerism": 90, "renaissance": 40},
    "barokowy": {"baroque": 90},
    "rokokowy": {"rococo": 90, "baroque": 40},
    "klasycystyczny": {"neoclassicism": 90},
    "neoklasycystyczny": {"neoclassicism": 80, "historicism": 40},
    "neogotycki": {"neogothic": 90, "gothic": 45, "historicism": 60},
    "neorenesansowy": {"neorenaissance": 90, "renaissance": 40, "historicism": 60},
    "neobarokowy": {"neobaroque": 90, "baroque": 40, "historicism": 60},
    "neoromański": {"historicism": 75, "romanesque": 45},
    "eklektyczny": {"eclecticism": 90, "historicism": 50},
    "historyzm": {"historicism": 90},
    "secesyjny": {"art_nouveau": 85, "secession": 85},
    "ekspresjonistyczny": {"expressionism": 90, "modernism": 40},
    "art deco": {"art_deco": 90},
    "modernistyczny": {"modernism": 90},
    "funkcjonalistyczny": {"modernism": 85, "bauhaus": 40},
    "brutalistyczny": {"brutalism": 90},
    "socrealistyczny": {"communist_era": 90},
    "alpejski": {"vernacular": 60},
    "szachulcowy": {"vernacular": 80},
}
# style words found in free text (name / Wikipedia extract): weaker than the NID field
STYLE_TEXT = [
    (r"neogotyck|neogotyk", {"neogothic": 75, "gothic": 40, "historicism": 50}),
    (r"neorenesans", {"neorenaissance": 75, "renaissance": 35, "historicism": 50}),
    (r"neobarok", {"neobaroque": 75, "baroque": 35, "historicism": 50}),
    (r"\bgotyck|gotyk", {"gothic": 75}),
    (r"romańsk", {"romanesque": 75}),
    (r"renesans", {"renaissance": 70}),
    (r"\bbarok", {"baroque": 70}),
    (r"rokok", {"rococo": 70}),
    (r"klasycyst|klasycyzm", {"neoclassicism": 70}),
    (r"secesj|jugendstil|art nouveau", {"art_nouveau": 70, "secession": 70}),
    (r"eklektyz|eklektyczn", {"eclecticism": 70, "historicism": 40}),
    (r"ekspresjon", {"expressionism": 70}),
    (r"art deco", {"art_deco": 70}),
    (r"modernist|funkcjonalizm", {"modernism": 70}),
    (r"brutalizm|brutalist", {"brutalism": 70}),
    (r"bauhaus", {"bauhaus": 70, "modernism": 40}),
    (r"postmodern", {"postmodernism": 70}),
    (r"historyzm|historyczn", {"historicism": 55}),
]
STYLE_WORDS = re.compile(
    r"(neo)?(gotyck|gotyk|romańsk|renesans|barok|rokok|klasycyst|secesj|eklekty|modernist|ekspresjon|art deco|funkcjonal|brutal|bauhaus)\w*",
    re.I,
)
# year -> soft prior, used only when nothing explicit exists (cap 35)
ERA_PRIORS = [
    (0, 1500, {"gothic": 30, "romanesque": 15}),
    (1500, 1600, {"renaissance": 30}),
    (1600, 1770, {"baroque": 35}),
    (1770, 1840, {"neoclassicism": 30}),
    (1840, 1895, {"historicism": 30, "eclecticism": 20, "neogothic": 15}),
    (1895, 1914, {"art_nouveau": 25, "secession": 25, "eclecticism": 15}),
    (1914, 1939, {"modernism": 30, "expressionism": 15, "art_deco": 15}),
    (1950, 1990, {"brutalism": 15, "modernism": 20}),
    (1990, 2100, {"contemporary": 35}),
]
# near neighbours: part of a score spills over (tag -> {neighbour: factor})
CLOSE = {
    "neogothic": {"gothic": 0.5, "historicism": 0.6},
    "neorenaissance": {"renaissance": 0.45, "historicism": 0.6},
    "neobaroque": {"baroque": 0.45, "historicism": 0.6},
    "art_nouveau": {"secession": 0.9},
    "secession": {"art_nouveau": 0.9},
    "eclecticism": {"historicism": 0.5},
    "bauhaus": {"modernism": 0.6},
    "rococo": {"baroque": 0.4},
    "mannerism": {"renaissance": 0.4, "baroque": 0.25},
    "expressionism": {"modernism": 0.4},
}


def era_bucket(year: int | None) -> int:
    if not year:
        return 0
    for i, (lo, hi, _) in enumerate(ERA_PRIORS, start=1):
        if lo <= year < hi:
            return i
    return 0


def text_blob(p: dict) -> str:
    kinds = [k for k in (p.get("kinds") or []) if k and k not in GENERIC_KINDS]
    return " | ".join(
        x for x in [p.get("name") or "", p.get("function") or "", " ".join(kinds), p.get("extract") or "", p.get("description") or ""] if x
    ).lower()


def explicit_scores(p: dict) -> dict[str, float]:
    s: dict[str, float] = {}

    def bump(tag: str, v: float) -> None:
        s[tag] = max(s.get(tag, 0), v)

    structured = " | ".join(
        [p.get("function") or "", p.get("name") or "", " ".join(k for k in (p.get("kinds") or []) if k not in GENERIC_KINDS)]
    ).lower()
    for tag, rx, v in TYPE_RULES + NATURE_RULES:
        if rx.search(structured):
            bump(tag, v)
    style_label = (p.get("style") or "").lower().strip()
    for key, tags in STYLE_MAP.items():
        if key == style_label:
            for t, v in tags.items():
                bump(t, v)
    if not any(GROUP_OF.get(t) == "style" for t in s):
        text = text_blob(p)
        for pat, tags in STYLE_TEXT:
            if re.search(pat, text):
                for t, v in tags.items():
                    bump(t, v)
    return s


# ---------------------------------------------------------------- theme tags


def theme_scores(p: dict, tags: dict[str, float], sig: int) -> dict[str, float]:
    s: dict[str, float] = {}
    text = text_blob(p)
    year = p.get("year") or 0
    th = p["theme"]
    kinds = " ".join(p.get("kinds") or []).lower()

    def bump(tag: str, v: float) -> None:
        s[tag] = max(s.get(tag, 0), v)

    if re.search(r"hala stulecia|jahrhunderthalle|centennial hall", text):
        bump("unesco", 100)
    if re.search(r"1939|194[0-5]\b|wojn|festung|powstani|obóz|oblężeni", text) or "bunker" in kinds:
        bump("wwii", 70)
    if 1945 <= year < 1990 or re.search(r"\bprl\b|socrealiz|komunist", text):
        bump("communist_era", 70)
    if re.search(r"żydow|synagog|jewish|kirkut", text):
        bump("jewish_heritage", 85)
    if re.search(r"breslau|niemieck|prusk|hohenzoll", text):
        bump("german_heritage", 75)
    elif 0 < year < 1945:
        bump("german_heritage", 55)  # Wrocław was German Breslau until 1945
    if re.search(r"habsbur|austriac", text):
        bump("habsburg", 60)
    if (0 < year < 1500) or "medieval" in text or re.search(r"średniowiecz", text):
        bump("medieval", 75)
    if th == "public_art" and re.search(r"mural|graffiti|street", kinds + text):
        bump("street_art", 90)
    elif re.search(r"\bmural|graffiti|street art", text):
        bump("street_art", 85)
    if th == "dwarfs":
        bump("dwarfs", 100)
        bump("family_friendly", 80)
        bump("street_art", 40)
        bump("free_entry", 95)
    if th == "archaeology":
        bump("archaeology", 90)
    if tags.get("zoo") or tags.get("park"):
        bump("family_friendly", 60)
    if tags.get("fountain"):
        bump("family_friendly", 45)
    outdoor = ("monument", "sculpture", "fountain", "shrine", "park", "square", "bridge", "island", "riverside", "bunker", "viewpoint", "garden")
    if any(tags.get(t) for t in outdoor):
        bump("free_entry", 80)
    # "hidden gem" = interesting but not famous: has something to say, but no encyclopedia article
    has_story = len(p.get("extract") or p.get("description") or "") >= 60
    if not p.get("wikipedia") and has_story and p.get("media") and sig < 45:
        bump("hidden_gem", 60)
    return s


# ---------------------------------------------------------------- embeddings


def embed_all(texts: list[str], prefix: str, model_name: str) -> np.ndarray:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name, device="cuda" if _cuda() else "cpu")
    return model.encode([prefix + t for t in texts], batch_size=64, normalize_embeddings=True, show_progress_bar=False)


def _cuda() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except ImportError:
        return False


def classifier_blob(p: dict) -> str:
    """Text the classifier sees: no explicit style words, so it learns from everything else."""
    raw = " . ".join(
        x
        for x in [
            p.get("name") or "",
            p.get("function") or "",
            ", ".join(k for k in (p.get("kinds") or []) if k and k not in GENERIC_KINDS),
            p.get("material") or "",
            (p.get("extract") or p.get("description") or "")[:350],
        ]
        if x
    )
    return STYLE_WORDS.sub("", raw)


def features(emb: np.ndarray, places: list[dict], tag_hits: list[dict[str, float]]) -> np.ndarray:
    era = np.zeros((len(places), len(ERA_PRIORS) + 1), dtype=np.float32)
    for i, p in enumerate(places):
        era[i, era_bucket(p.get("year"))] = 1.0
    types = np.zeros((len(places), len(GROUPS["type"])), dtype=np.float32)
    names = list(GROUPS["type"])
    for i, hits in enumerate(tag_hits):
        for j, t in enumerate(names):
            if hits.get(t):
                types[i, j] = 1.0
    return np.hstack([emb, era * 2.0, types])


def infer_styles(places: list[dict], explicit: list[dict[str, float]], emb: np.ndarray) -> tuple[list[dict[str, float]], dict]:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_predict, StratifiedKFold

    styles = list(GROUPS["style"])
    X = features(emb, places, explicit)
    y_idx, y = [], []
    for i, hits in enumerate(explicit):
        st = {t: v for t, v in hits.items() if t in GROUPS["style"]}
        if st and max(st.values()) >= 80:  # NID-grade label only; text-keyword hits stay out of training
            y_idx.append(i)
            y.append(max(st, key=st.get))
    counts = Counter(y)
    keep = {c for c, n in counts.items() if n >= 8}
    sel = [(i, c) for i, c in zip(y_idx, y) if c in keep]
    idx = [i for i, _ in sel]
    labels = np.array([c for _, c in sel])
    clf = LogisticRegression(C=2.0, max_iter=2000, class_weight="balanced")
    report: dict = {"train_n": len(idx), "classes": dict(Counter(labels.tolist()))}
    if len(idx) >= 60 and len(set(labels)) >= 2:
        n_splits = max(2, min(5, min(Counter(labels.tolist()).values())))
        pred = cross_val_predict(clf, X[idx], labels, cv=StratifiedKFold(n_splits, shuffle=True, random_state=7))
        report["cv_accuracy"] = round(float((pred == labels).mean()), 3)
        # "near miss": predicted a close neighbour (neogothic vs gothic) rather than a wrong family
        near = sum(1 for a, b in zip(pred, labels) if a == b or CLOSE.get(a, {}).get(b) or CLOSE.get(b, {}).get(a))
        report["cv_accuracy_incl_close_neighbours"] = round(near / len(labels), 3)
    clf.fit(X[idx], labels)
    proba = clf.predict_proba(X)
    out: list[dict[str, float]] = []
    for i, p in enumerate(places):
        row: dict[str, float] = {}
        if not any(t in GROUPS["style"] for t in explicit[i]):
            building_like = any(explicit[i].get(t) for t in GROUPS["type"]) or p["theme"] in ("architecture", "sacred", "industrial", "culture")
            if building_like and p["theme"] not in ("dwarfs", "memorials"):
                for c, pr in zip(clf.classes_, proba[i]):
                    if pr >= 0.12:
                        row[c] = min(70.0, round(100 * float(pr)))
        out.append(row)
    report["styles"] = styles
    return out, report


# ---------------------------------------------------------------- assembly


def finalise(scores: dict[str, float], year: int | None) -> list[dict]:
    final = dict(scores)
    for tag, v in scores.items():
        for nb, f in CLOSE.get(tag, {}).items():
            final[nb] = max(final.get(nb, 0), round(v * f))
    if year and not any(GROUP_OF.get(t) == "style" and v >= 40 for t, v in final.items()):
        for lo, hi, prior in ERA_PRIORS:
            if lo <= year < hi:
                for t, v in prior.items():
                    final[t] = max(final.get(t, 0), v)
    out = [{"tag": t, "percent": int(round(min(100, v)))} for t, v in final.items() if t in ALL_TAGS and v >= 15]
    return sorted(out, key=lambda x: -x["percent"])


def load_osm_flags(osm_raw: Path | None) -> dict[str, dict[str, str]]:
    """Access/fee/religion tags from raw OSM, keyed like the dataset's refs.osm ("n123", "w456")."""
    if not osm_raw:
        return {}
    raw = json.loads(osm_raw.read_text(encoding="utf-8"))
    elements = raw["elements"] if isinstance(raw, dict) else raw
    keep = ("wheelchair", "fee", "religion")
    out = {}
    for e in elements:
        tags = e.get("tags") or {}
        flags = {k: tags[k] for k in keep if k in tags}
        if flags:
            out[e["type"][0] + str(e["id"])] = flags
    return out


# Wikidata item ids used below (P1435 heritage designation, P140 religion)
WD_WORLD_HERITAGE = "Q9259"
WD_POMNIK_HISTORII = "Q15981101"
WD_JUDAISM = "Q9268"


def load_wikidata_claims(path: Path | None) -> dict[str, dict]:
    return json.loads(path.read_text(encoding="utf-8")) if path else {}


ACCESSIBLE_PERCENT = {"yes": 100, "limited": 50}  # "no" is kept in facts; absence of a tag means unknown


def build(data: Path, out: Path, model_name: str, osm_raw: Path | None = None, wd_claims: Path | None = None) -> None:
    osm_flags = load_osm_flags(osm_raw)
    claims = load_wikidata_claims(wd_claims)
    places = json.loads((data / "places.json").read_text(encoding="utf-8"))
    media = {m["id"]: m for m in json.loads((data / "media.json").read_text(encoding="utf-8"))}
    log.info("loaded %d places", len(places))

    places, drops = clean(places)
    log.info("kept %d, dropped %s", len(places), dict(drops))

    explicit = [explicit_scores(p) for p in places]
    emb = embed_all([classifier_blob(p) or p.get("name") or "" for p in places], "passage: ", model_name)
    inferred, report = infer_styles(places, explicit, emb)

    seed = []
    tag_counter: Counter = Counter()
    for p, ex, inf in zip(places, explicit, inferred):
        sig = significance(p)
        if WD_POMNIK_HISTORII in claims.get(p.get("wikidata") or "", {}).get("P1435", []):
            sig = min(100, sig + 25)  # Pomnik Historii: the top Polish heritage designation
        scores = dict(inf)
        for t, v in ex.items():
            scores[t] = max(scores.get(t, 0), v)
        for t, v in theme_scores(p, scores, sig).items():
            scores[t] = max(scores.get(t, 0), v)
        flags = osm_flags.get((p.get("refs") or {}).get("osm", ""), {})
        wd = claims.get(p.get("wikidata") or "", {})
        wc = flags.get("wheelchair")
        if wc in ACCESSIBLE_PERCENT:
            scores["accessible"] = ACCESSIBLE_PERCENT[wc]
        if flags.get("fee") == "no":
            scores["free_entry"] = 100
        elif flags.get("fee") == "yes":
            scores.pop("free_entry", None)  # the outdoor-object guess must not override a posted fee
        if WD_WORLD_HERITAGE in wd.get("P1435", []) or wd.get("P757"):
            scores["unesco"] = 100
        if WD_JUDAISM in wd.get("P140", []) or flags.get("religion") == "jewish":
            scores["jewish_heritage"] = 100
        tags = finalise(scores, p.get("year"))
        tag_counter.update(t["tag"] for t in tags)
        street, number = split_address(p.get("address") or "")
        images = collect_images(p, media)
        seed.append(
            {
                "externalId": p["id"],
                "name": clip(display_name(p), 200),
                "latitude": round(p["lat"], 6),
                "longitude": round(p["lon"], 6),
                "description": clip(p.get("extract") or p.get("description") or p.get("inscription") or "", 700) or None,
                "address": {"street": street, "houseNumber": number, "postalCode": "", **CITY},
                "positionQuality": p["position_quality"],
                "year": p.get("year") or None,
                "dateText": p.get("date_text") or None,
                "significance": sig,
                "facts": {
                    k: v
                    for k, v in {
                        "style": p.get("style"),
                        "function": p.get("function"),
                        "material": p.get("material"),
                        "protection": p.get("protection"),
                        "inscription": clip(p.get("inscription") or "", 200),
                        "wheelchair": wc,
                        "kinds": [k for k in (p.get("kinds") or []) if k and k not in GENERIC_KINDS][:3],
                    }.items()
                    if v
                },
                "links": {
                    k: v
                    for k, v in {
                        "wikipedia": p.get("wikipedia"),
                        "wikidata": p.get("wikidata"),
                        "website": p.get("website"),
                        "nid": p.get("nid_link"),
                    }.items()
                    if v
                },
                "sources": p["sources"],
                "mainImageUrl": images[0] if images else None,
                "images": images,
                "tags": tags,
            }
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(seed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    summary = {
        "input": len(places) + sum(drops.values()),
        "kept": len(seed),
        "dropped": dict(drops),
        "with_style_tag": sum(1 for s in seed if any(GROUP_OF[t["tag"]] == "style" for t in s["tags"])),
        "with_type_tag": sum(1 for s in seed if any(GROUP_OF[t["tag"]] == "type" for t in s["tags"])),
        "with_any_tag": sum(1 for s in seed if s["tags"]),
        "with_image": sum(1 for s in seed if s["mainImageUrl"]),
        "tag_counts": dict(tag_counter.most_common()),
        "style_classifier": report,
        "seed_mb": round(out.stat().st_size / 1e6, 2),
    }
    out.with_suffix(".report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    log.info("wrote %s (%.1f MB)", out, summary["seed_mb"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--osm", type=Path, help="raw OSM Overpass JSON, for wheelchair access")
    ap.add_argument("--wd-claims", type=Path, help="wbgetentities claims (P1435, P140, P757) per QID")
    ap.add_argument("--model", default="intfloat/multilingual-e5-base")
    a = ap.parse_args()
    build(a.data, a.out, a.model, a.osm, a.wd_claims)
