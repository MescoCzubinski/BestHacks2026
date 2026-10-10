"""Merging of records from different sources into one list of places.

A new record is matched against existing places within a radius by name similarity (or by being
equally nameless and very close, with the same theme). Matched records fill gaps and union their
provenance; the register's name and the best position win.
"""

from typing import Any

from .geo import Grid, meters
from .text import GENERIC, name_sim, toks

FILL_FIELDS = [
    "name", "description", "inscription", "year", "date_text", "image", "wikipedia", "wikidata", "website", "extract",
    "address", "style", "material", "function", "protection", "inscribed_date", "area_m2", "nid_link",
]  # fmt: skip
STRICT_UNNAMED_M = 12.0
MIN_NAME_SIM = 0.5


def _empty(v: Any) -> bool:
    return v in (None, "", [], {})


class Merger:
    def __init__(self) -> None:
        self.places: list[dict[str, Any]] = []
        self._grid = Grid()

    def add_new(self, rec: dict[str, Any]) -> int:
        rec.setdefault("refs", {})
        rec.setdefault("sources", [])
        rec.setdefault("kinds", [])
        self.places.append(rec)
        if rec.get("lat") is not None:
            self._grid.add(len(self.places) - 1, rec["lat"], rec["lon"])
        return len(self.places) - 1

    def find(self, rec: dict[str, Any], radius_m: float) -> int | None:
        if rec.get("lat") is None:
            return None
        best, best_score = None, 0.0
        for i in self._grid.near(rec["lat"], rec["lon"]):
            p = self.places[i]
            d = meters(rec["lat"], rec["lon"], p["lat"], p["lon"])
            if d > radius_m:
                continue
            s = name_sim(rec.get("name"), p.get("name"))
            generic_both = all(set(toks(x)) <= GENERIC or not toks(x) for x in (rec.get("name"), p.get("name")))
            if s >= MIN_NAME_SIM and not (generic_both and d > 25):
                score = s + (1 - d / radius_m) * 0.2
            elif (not rec.get("name") or not p.get("name") or generic_both) and d <= STRICT_UNNAMED_M and rec["theme"] == p["theme"]:
                score = 0.45 - d / 1000
            else:
                continue
            if score > best_score:
                best, best_score = i, score
        return best

    def merge_into(self, i: int, rec: dict[str, Any]) -> None:
        p = self.places[i]
        for k in FILL_FIELDS:
            if not _empty(rec.get(k)) and _empty(p.get(k)):
                p[k] = rec[k]
        for s in rec.get("sources", []):
            if s not in p["sources"]:
                p["sources"].append(s)
        for k, v in rec.get("refs", {}).items():
            if k == "gis":
                p["refs"]["gis"] = sorted(set(p["refs"].get("gis", [])) | set(v))
            else:
                p["refs"].setdefault(k, v)
        for k, v in (rec.get("flags") or {}).items():
            p.setdefault("flags", {}).setdefault(k, v)
        if "nid" in rec.get("sources", []) and rec.get("name") and (not p.get("name") or set(toks(p["name"])) <= GENERIC):
            p["name"] = rec["name"]
        if rec.get("pos_quality", 0) > p.get("pos_quality", 0) and rec.get("lat") is not None:
            p["lat"], p["lon"], p["pos_quality"] = rec["lat"], rec["lon"], rec["pos_quality"]
        if p["theme"] == "other" and rec["theme"] != "other":
            p["theme"] = rec["theme"]
        for kd in rec.get("kinds", []):
            if kd and kd not in p["kinds"]:
                p["kinds"].append(kd)

    def ingest(self, rec: dict[str, Any], radius_m: float) -> tuple[int, bool]:
        j = self.find(rec, radius_m)
        if j is None:
            return self.add_new(rec), False
        self.merge_into(j, rec)
        return j, True

    def ingest_register_point(self, rec: dict[str, Any], radius_m: float = 30.0) -> bool:
        """Unnamed registered-monument points: attach to a protected place nearby, else keep as new."""
        for i in self._grid.near(rec["lat"], rec["lon"]):
            p = self.places[i]
            if (p.get("protection") or "nid" in p["sources"]) and meters(rec["lat"], rec["lon"], p["lat"], p["lon"]) <= radius_m:
                self.merge_into(i, rec)
                return True
        self.add_new(rec)
        return False

