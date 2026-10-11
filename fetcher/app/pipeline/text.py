import re
import unicodedata

STOP = set("pw sw ul pl al im i w z na nr od do dla oraz the of a an de".split())
GENERIC = set("kamienica dom budynek willa kosciol kaplica pomnik cmentarz park mur ogrodzenie schron fort most stacja plac ulica mieszkalny".split())


def norm(s: str | None) -> str:
    s = (s or "").lower().replace("ł", "l")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", s)


def toks(s: str | None) -> list[str]:
    return [t for t in norm(s).split() if t and t not in STOP]


def name_sim(a: str | None, b: str | None) -> float:
    ta, tb = set(toks(a)), set(toks(b))
    if not ta or not tb:
        return 0.0
    if norm(a).strip() == norm(b).strip():
        return 1.0
    inter = len(ta & tb)
    return inter / len(ta | tb) if inter else 0.0


def year_of(s: str | None) -> int | None:
    m = re.search(r"(1[0-9]{3}|20[0-2][0-9])", s or "")
    return int(m.group(1)) if m else None


def strip_city(name: str, city: str) -> str:
    n = (name or "").strip()
    if not city:
        return n
    prefix = re.compile(rf"^{re.escape(city)}\s*[-–—:]\s*", re.I)
    stem = re.escape(city[: max(3, len(city) - 1)])
    suffix = re.compile(rf"\s+(?:we|in|w)\s+{stem}\w*$", re.I)
    return suffix.sub("", prefix.sub("", n)).strip()
