import logging
import re
from collections import Counter
from collections.abc import Sequence
from typing import Any, Protocol

import numpy as np

from ..config import Region
from ..taxonomy import ALL_TAGS, GROUP_OF, GROUPS
from .clean import GENERIC_KINDS

log = logging.getLogger("tagging")

INFER_MIN_PROBA = 0.30
INFER_MAX_PERCENT = 70
MIN_TAG_PERCENT = 15
MIN_CLASS_EXAMPLES = 8
MIN_TRAIN_EXAMPLES = 60
EXPLICIT_TRAIN_MIN = 80
ACCESSIBLE_PERCENT = {"yes": 100, "limited": 50}
WD_WORLD_HERITAGE = "Q9259"
WD_POMNIK_HISTORII = "Q15981101"
WD_JUDAISM = "Q9268"


def _r(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.I)


TYPE_RULES: list[tuple[str, re.Pattern[str], int]] = [
    ("cathedral", _r(r"katedr|bazylik|cathedral"), 90),
    ("church", _r(r"kości[oó]ł|cerkiew|kaplic|parafi|church|chapel|plebani|klasztor|kanoni"), 85),
    ("synagogue", _r(r"synagog|bóżnic"), 95),
    ("castle", _r(r"zamek|castle"), 90),
    ("palace", _r(r"pałac|palace|dwór|rezydencj"), 85),
    ("tenement", _r(r"kamienic|tenement|budynek mieszkaln|dom czynszow"), 85),
    ("villa", _r(r"willa|villa"), 90),
    ("town_hall", _r(r"ratusz|town hall"), 95),
    ("market_square", _r(r"^rynek\b|marketplace|plac targow"), 80),
    ("museum", _r(r"muzeum|museum|panorama|galeri"), 85),
    ("theatre", _r(r"teatr|theatre"), 90),
    ("opera", _r(r"\boper[aey]\b|filharmoni"), 90),
    ("library", _r(r"bibliotek|library"), 90),
    ("university", _r(r"uniwersytet|politechnik|akademi|kolegium|university|dydaktyczn"), 80),
    ("school", _r(r"szkoł|gimnazjum|liceum|school"), 80),
    ("hospital", _r(r"szpital|klinik|sanatori|hospital"), 85),
    ("train_station", _r(r"dworzec|stacja kolej|train station|railway station|lokomotywowni"), 90),
    ("bridge", _r(r"\bmost\b|\bmosty\b|kładk|wiadukt|bridge"), 90),
    ("tower", _r(r"wież|baszt|\btower\b|water_tower"), 85),
    ("fortification", _r(r"fortyfik|mur obronn|bastion|\bfort\b|twierdz|fortress|szaniec|reduta|bastei|schron"), 85),
    ("monument", _r(r"pomnik|monument|memorial|obelisk|tablica pami|\btomb\b"), 85),
    ("fountain", _r(r"fontann|fountain|studni"), 90),
    ("cemetery", _r(r"cmentarz|cemetery|grobow|nagrob|mauzole"), 90),
    ("factory", _r(r"fabryk|zakład|elektrown|gazowni|wodoci|przemysł|factory|oczyszczalni|kotłowni|pompown"), 80),
    ("warehouse", _r(r"magazyn|spichlerz|warehouse"), 85),
    ("brewery", _r(r"browar|słodown|brewery"), 90),
    ("stadium", _r(r"stadion|stadium|hala sportow"), 90),
    ("hotel", _r(r"\bhotel\b|zajazd|pensjonat"), 85),
    ("sculpture", _r(r"rzeźb|sculpture|\bstatu|figur|installation|artwork"), 80),
    ("shrine", _r(r"kapliczk|krzyż|shrine|wayside"), 90),
    ("bunker", _r(r"bunkier|bunker|schron"), 90),
    ("ruins", _r(r"ruin"), 85),
]
NATURE_RULES: list[tuple[str, re.Pattern[str], int]] = [
    ("zoo", _r(r"\bzoo\b|zoolog"), 95),
    ("park", _r(r"\bpark\b|zieleń|zieleni|planty|historic green"), 85),
    ("park", _r(r"\blas\b|leśn|łąk|city green space"), 60),
    ("garden", _r(r"ogród|ogrod|garden"), 75),
    ("garden", _r(r"botaniczn"), 90),
    ("square", _r(r"\bplac\b|skwer|rondo|square"), 70),
    ("viewpoint", _r(r"widokow|viewpoint|taras"), 90),
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
    "socrealistyczny": {"communist": 90},
    "alpejski": {"vernacular": 60},
    "szachulcowy": {"vernacular": 80},
}
STYLE_TEXT: list[tuple[re.Pattern[str], dict[str, int]]] = [
    (_r(p), t)
    for p, t in [
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
]
STYLE_WORDS = _r(
    r"(neo)?(gotyck|gotyk|romańsk|renesans|barok|rokok|klasycyst|secesj|eklekty|modernist|ekspresjon|art deco|funkcjonal|brutal|bauhaus)\w*"
)
ERA_PRIORS: list[tuple[int, int, dict[str, int]]] = [
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
CLOSE: dict[str, dict[str, float]] = {
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
WD_STYLE: dict[str, dict[str, int]] = {
    "Q245188": {"modernism": 85},
    "Q1295040": {"art_nouveau": 85, "secession": 85},
    "Q173782": {"art_deco": 90},
    "Q186363": {"neogothic": 90, "gothic": 45, "historicism": 60},
    "Q840829": {"baroque": 90},
    "Q37853": {"baroque": 90},
    "Q911397": {"neobaroque": 90, "baroque": 40, "historicism": 60},
    "Q502163": {"neorenaissance": 90, "renaissance": 40, "historicism": 60},
    "Q176483": {"gothic": 90, "medieval": 75},
    "Q46825": {"gothic": 90, "medieval": 75},
    "Q695863": {"gothic": 90, "medieval": 75},
    "Q54111": {"neoclassicism": 90},
    "Q14378": {"neoclassicism": 90},
    "Q170292": {"neoclassicism": 90},
    "Q2479493": {"eclecticism": 90, "historicism": 50},
    "Q744373": {"historicism": 75, "romanesque": 45},
    "Q595448": {"postmodernism": 90},
    "Q1148060": {"expressionism": 90, "modernism": 40},
    "Q236122": {"renaissance": 90},
    "Q4692": {"renaissance": 90},
    "Q46261": {"romanesque": 90, "medieval": 70},
    "Q51879601": {"historicism": 90},
    "Q180902": {"communist": 90},
    "Q11686646": {"communist": 90},
    "Q131808": {"mannerism": 90, "renaissance": 40},
    "Q1755128": {"historicism": 70},
}
OUTDOOR_TAGS = ("monument", "sculpture", "fountain", "shrine", "park", "square", "bridge", "bunker", "viewpoint", "garden", "street_art", "mural")


class Embedder(Protocol):
    def wait_until_ready(self) -> None: ...

    def embed(self, texts: Sequence[str]) -> np.ndarray: ...


def era_bucket(year: int | None) -> int:
    if not year:
        return 0
    for i, (lo, hi, _) in enumerate(ERA_PRIORS, start=1):
        if lo <= year < hi:
            return i
    return 0


def _kinds(p: dict[str, Any]) -> list[str]:
    return [k for k in p.get("kinds") or [] if k and k not in GENERIC_KINDS]


def text_blob(p: dict[str, Any]) -> str:
    parts = [p.get("name") or "", p.get("function") or "", " ".join(_kinds(p)), p.get("extract") or "", p.get("description") or ""]
    return " | ".join(x for x in parts if x).lower()


def explicit_scores(p: dict[str, Any], claims: dict[str, Any] | None = None) -> dict[str, float]:
    s: dict[str, float] = {}

    def bump(tag: str, v: float) -> None:
        s[tag] = max(s.get(tag, 0), v)

    structured = " | ".join([p.get("function") or "", p.get("name") or "", " ".join(_kinds(p))]).lower()
    for tag, rx, v in TYPE_RULES + NATURE_RULES:
        if rx.search(structured):
            bump(tag, v)
    for t, v in STYLE_MAP.get((p.get("style") or "").lower().strip(), {}).items():
        bump(t, v)
    for qid in (claims or {}).get("P149", []):
        for t, v in WD_STYLE.get(qid, {}).items():
            bump(t, v)
    if not any(GROUP_OF.get(t) == "style" for t in s):
        text = text_blob(p)
        for rx, tags in STYLE_TEXT:
            if rx.search(text):
                for t, v in tags.items():
                    bump(t, v)
    return s


def theme_scores(p: dict[str, Any], tags: dict[str, float], sig: int, region: Region) -> dict[str, float]:
    s: dict[str, float] = {}
    text = text_blob(p)
    year = p.get("year") or 0
    theme = p["theme"]
    kinds = " ".join(p.get("kinds") or []).lower()

    def bump(tag: str, v: float) -> None:
        s[tag] = max(s.get(tag, 0), v)

    if "unesco" in kinds:
        bump("unesco", 100)
    if 1945 <= year < 1990 or re.search(r"prl|socrealiz|komunist", text):
        bump("communist", 70)
    if re.search(r"żydow|synagog|jewish|kirkut", text):
        bump("jewish_heritage", 85)
    if re.search(r"niemieck|prusk|hohenzoll|breslau", text):
        bump("german_heritage", 75)
    elif region.german_until and 0 < year < region.german_until:
        bump("german_heritage", 55)
    if re.search(r"habsbur|austriac", text):
        bump("habsburg", 60)
    if (0 < year < 1500) or "medieval" in text or re.search(r"średniowiecz", text):
        bump("medieval", 75)
    if theme == "public_art" and re.search(r"mural|graffiti", kinds + text):
        bump("mural", 90)
        bump("street_art", 75)
    elif re.search(r"mural|graffiti|street art", text):
        bump("street_art", 85)
    if theme == "dwarfs":
        bump("sculpture", 80)
        bump("street_art", 80)
        bump("free_entry", 95)
    if any(tags.get(t) for t in OUTDOOR_TAGS):
        bump("free_entry", 80)
    return s


def apply_signals(scores: dict[str, float], flags: dict[str, str], claims: dict[str, Any]) -> str | None:
    wheelchair = flags.get("wheelchair")
    if wheelchair in ACCESSIBLE_PERCENT:
        scores["accessible"] = ACCESSIBLE_PERCENT[wheelchair]
    if flags.get("fee") == "no":
        scores["free_entry"] = 100
    elif flags.get("fee") == "yes":
        scores.pop("free_entry", None)
    if WD_WORLD_HERITAGE in claims.get("P1435", []) or claims.get("P757"):
        scores["unesco"] = 100
    if WD_JUDAISM in claims.get("P140", []) or flags.get("religion") == "jewish":
        scores["jewish_heritage"] = 100
    return wheelchair


def classifier_text(p: dict[str, Any]) -> str:
    raw = " . ".join(
        x
        for x in [p.get("name") or "", p.get("function") or "", ", ".join(_kinds(p)), p.get("material") or "", (p.get("extract") or p.get("description") or "")[:350]]
        if x
    )
    return STYLE_WORDS.sub("", raw) or (p.get("name") or "")


def _features(emb: np.ndarray, places: list[dict[str, Any]], explicit: list[dict[str, float]]) -> np.ndarray:
    era = np.zeros((len(places), len(ERA_PRIORS) + 1), dtype=np.float32)
    for i, p in enumerate(places):
        era[i, era_bucket(p.get("year"))] = 1.0
    type_tags = list(GROUPS["type"])
    types = np.zeros((len(places), len(type_tags)), dtype=np.float32)
    for i, hits in enumerate(explicit):
        for j, t in enumerate(type_tags):
            if hits.get(t):
                types[i, j] = 1.0
    return np.hstack([emb, era * 2.0, types])


def infer_styles(places: list[dict[str, Any]], explicit: list[dict[str, float]], embedder: Embedder) -> tuple[list[dict[str, float]], dict[str, Any]]:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict

    empty: list[dict[str, float]] = [{} for _ in places]
    X = _features(embedder.embed([classifier_text(p) for p in places]), places, explicit)
    idx, labels = [], []
    for i, hits in enumerate(explicit):
        style = {t: v for t, v in hits.items() if GROUP_OF.get(t) == "style"}
        if style and max(style.values()) >= EXPLICIT_TRAIN_MIN:
            idx.append(i)
            labels.append(max(style, key=lambda t: style[t]))
    counts = Counter(labels)
    keep = [(i, c) for i, c in zip(idx, labels) if counts[c] >= MIN_CLASS_EXAMPLES]
    idx = [i for i, _ in keep]
    y = np.array([c for _, c in keep])
    report: dict[str, Any] = {"train_n": len(idx), "classes": dict(Counter(y.tolist()))}
    if len(idx) < MIN_TRAIN_EXAMPLES or len(set(y.tolist())) < 2:
        log.warning("too few labelled examples (%d) to infer styles; skipping the classifier", len(idx))
        return empty, {**report, "skipped": True}

    clf = LogisticRegression(C=2.0, max_iter=2000, class_weight="balanced")
    folds = max(2, min(5, min(Counter(y.tolist()).values())))
    pred = cross_val_predict(clf, X[idx], y, cv=StratifiedKFold(folds, shuffle=True, random_state=7))
    report["cv_accuracy"] = round(float((pred == y).mean()), 3)
    near = sum(1 for a, b in zip(pred, y) if a == b or CLOSE.get(a, {}).get(b) or CLOSE.get(b, {}).get(a))
    report["cv_accuracy_incl_close_neighbours"] = round(near / len(y), 3)
    clf.fit(X[idx], y)
    proba = clf.predict_proba(X)

    out: list[dict[str, float]] = []
    for i, p in enumerate(places):
        row: dict[str, float] = {}
        if not any(GROUP_OF.get(t) == "style" for t in explicit[i]):
            building_like = any(explicit[i].get(t) for t in GROUPS["type"]) or p["theme"] in ("architecture", "sacred", "industrial", "culture")
            has_text = len(p.get("extract") or p.get("description") or "") >= 40
            if building_like and p["theme"] not in ("dwarfs", "memorials") and (p.get("year") or has_text):
                for c, pr in zip(clf.classes_, proba[i]):
                    if pr >= INFER_MIN_PROBA:
                        row[str(c)] = min(float(INFER_MAX_PERCENT), round(100 * float(pr)))
        out.append(row)
    return out, report


def finalise(scores: dict[str, float], year: int | None) -> list[dict[str, Any]]:
    final = dict(scores)
    for tag, v in scores.items():
        for nb, f in CLOSE.get(tag, {}).items():
            final[nb] = max(final.get(nb, 0), round(v * f))
    if year and not any(GROUP_OF.get(t) == "style" and v >= 40 for t, v in final.items()):
        for lo, hi, prior in ERA_PRIORS:
            if lo <= year < hi:
                for t, v in prior.items():
                    final[t] = max(final.get(t, 0), v)
    out = [{"tag": t, "percent": int(round(min(100, v)))} for t, v in final.items() if t in ALL_TAGS and v >= MIN_TAG_PERCENT]
    return sorted(out, key=lambda x: -x["percent"])
