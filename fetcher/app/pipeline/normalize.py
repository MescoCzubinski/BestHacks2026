import re
from typing import Any

from ..config import Region
from .clean import GENERIC_KINDS
from .text import strip_city

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
MAX_IMAGES = 6
DESCRIPTION_MAX_CHARS = 700
_ADDRESS_RE = re.compile(r"^(?P<street>.*?)[\s,]+(?P<no>\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)?)\s*$")


def split_address(raw: str) -> tuple[str, str]:
    m = _ADDRESS_RE.match((raw or "").strip())
    if m:
        return m.group("street").strip(" ,"), m.group("no")
    return (raw or "").strip(), ""


def display_name(p: dict[str, Any], region: Region) -> str:
    name = strip_city(p.get("name") or "", region.municipality or region.name)
    street = (p.get("address") or "").strip()
    if name:
        if street and name == name.lower() and len(name.split()) <= 2:
            return f"{name[:1].upper()}{name[1:]}, {street}"
        return name
    for k in p.get("kinds") or []:
        if k in KIND_PL:
            s = split_address(street)[0]
            return f"{KIND_PL[k]}, {s}" if s else KIND_PL[k]
    fn = (p.get("function") or "").strip()
    if fn:
        s = split_address(street)[0]
        return f"{fn[:1].upper()}{fn[1:]}, {s}" if s else fn[:1].upper() + fn[1:]
    return ""


def clip(s: str, n: int) -> str:
    s = re.sub(r"\s+", " ", (s or "")).strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def significance(p: dict[str, Any]) -> int:
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


def collect_images(p: dict[str, Any], media_by_id: dict[str, dict[str, Any]]) -> list[str]:
    urls = [media_by_id[m]["thumb"] for m in p.get("media") or [] if m in media_by_id and media_by_id[m].get("thumb")]
    img = p.get("image") or ""
    if re.search(r"\.(jpe?g|png|webp)", img, re.I) and "/wiki/File:" not in img:
        urls.insert(0, img)
    return list(dict.fromkeys(urls))[:MAX_IMAGES]


def clean_kinds(p: dict[str, Any]) -> list[str]:
    return [k for k in p.get("kinds") or [] if k and k not in GENERIC_KINDS]
