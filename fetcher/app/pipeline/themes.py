"""Coarse theme of a record, used for merge decisions and a few tag rules. Rules are keyword based."""

import re

from .text import norm

THEMES = {
    "fortifications": "Fortifications, bunkers & forts",
    "public_art": "Public art, murals & sculpture",
    "ruins": "Ruins",
    "memorials": "Memorials, tombs & wayside shrines",
    "cemeteries": "Cemeteries & former cemeteries",
    "towers": "Towers & viewpoints",
    "hardware": "Locomotives, tanks & aircraft",
    "dwarfs": "Dwarfs (krasnale)",
    "nature": "Nature monuments, parks & green spaces",
    "archaeology": "Archaeological sites & hillforts",
    "sacred": "Churches, synagogues & chapels",
    "industrial": "Industrial & railway heritage",
    "architecture": "Architecture & historic buildings",
    "culture": "Museums, galleries & culture",
    "other": "Other places",
}

RULES = [
    ("dwarfs", r"\bdwarf\b|krasnal"),
    ("fortifications", r"schron|bunkier|bunker|\bfort\b|forty|bastion|basteja|twierdz|fortyfik|mur\w* obronn|mury obronne|fosa miejska|\bbrama\b|ravelin|koszary"),
    ("cemeteries", r"cmentarz|cemetery|grobowiec|nekropol|kwatera"),
    ("sacred", r"koscio|kaplica|synagog|cerkiew|klasztor|parafi|sanktuarium|archikatedr|konkatedr|katedra sw|church|chapel|wyznan|bazylika|zbor"),
    ("ruins", r"ruin|ruiny|gruzy|fundament"),
    ("archaeology", r"archeolog|grodzisko|stanowisko|archaeological"),
    ("hardware", r"lokomotyw|locomotive|parow[oó]z|samolot|aircraft|czolg|tank|armata|cannon|wagon"),
    ("towers", r"wie[zż]a|\btower\b|water_tower|wiez|obelisk|widokow|viewpoint|punkt widokowy"),
    ("public_art", r"mural|graffiti|sculpture|rzezb|statue|statua|instalacj|installation|relief|mosaic|mozaik|artwork|fontann|fountain"),
    ("memorials", r"pomnik|memorial|tablica|upamietn|krzyz|wayside|kapliczk|nagrobek|\btomb\b|mauzoleum|epitafium|boundary_stone|slup graniczny|monument"),
    ("nature", r"przyrod|\bdab\b|\bbuk\b|lipa|platan|glaz|park\b|zieleni|ogrod|garden|skwer|zieleniec|nature|\btree\b|aleja|bulwar"),
    ("industrial", r"przemysl|fabryk|kolej|dworzec|zaklad|elektrown|gazown|wodoci|stacja|browar|magazyn|zajezdnia|industrial|railway|zesp[oó]l fabryczny"),
    ("culture", r"muze|museum|galer|gallery|teatr|biblioteka|opera|filharmon|centrum kultury|aula|kino"),
    ("architecture", r"kamienic|willa|pa[lł]ac|dw[oó]r|dom\b|budynek|ratusz|szkola|uniwersytet|hala|zamek|castle|villa|manor|apartment|kamienica|osiedle|zesp[oó]l|urzad|bank|hotel|szpital"),
]
_COMPILED = [(th, re.compile(p)) for th, p in RULES]


def theme_of(*texts: str | None, hint: str | None = None) -> str:
    if hint:
        return hint
    blob = norm(" ".join(t for t in texts if t))
    for th, rx in _COMPILED:
        if rx.search(blob):
            return th
    return "other"


def osm_theme(tags: dict[str, str]) -> str:
    """Theme from structured OSM tags; falls back to keyword rules on name and kind."""
    at, hist, name = tags.get("artwork_type"), tags.get("historic"), (tags.get("name") or "").lower()
    if at == "dwarf":
        return "dwarfs"
    if at in ("mural", "graffiti"):
        return "public_art"
    if (
        tags.get("military") == "bunker"
        or hist in ("bunker", "fort")
        or tags.get("building") == "bunker"
        or tags.get("man_made") == "bunker"
        or re.search(r"schron|bunkier|\bfort\b|bastion|basteja", name)
    ):
        return "fortifications"
    if hist in ("ruins", "archaeological_site") or tags.get("building") == "ruins":
        return "ruins"
    if hist in ("locomotive", "aircraft", "tank", "cannon", "vehicle", "wagon"):
        return "hardware"
    if hist == "tomb" and re.search(r"cmentarz", name):
        return "cemeteries"
    if hist in ("memorial", "tomb", "wayside_cross", "wayside_shrine", "monument", "stone", "boundary_stone") or tags.get("building") == "chapel":
        return "memorials"
    if tags.get("man_made") in ("tower", "water_tower", "obelisk") or tags.get("tourism") == "viewpoint" or tags.get("building") == "water_tower":
        return "towers"
    return theme_of(name, tags.get("historic"), tags.get("tourism"), tags.get("building"))
