import math
from collections import defaultdict
from collections.abc import Iterator


def meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dy = (lat2 - lat1) * 111_200
    dx = (lon2 - lon1) * 111_200 * math.cos(math.radians(lat1))
    return math.hypot(dx, dy)


def polygon_centroid(ring: list[tuple[float, float]]) -> tuple[float, float]:
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(a) < 1e-14:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    return cx / (3 * a), cy / (3 * a)


def geometry_point(geom: dict) -> tuple[float, float, str] | None:
    t, c = geom.get("type"), geom.get("coordinates")
    if not c:
        return None
    if t == "Point":
        return c[1], c[0], "point"
    if t == "LineString":
        m = c[len(c) // 2]
        return m[1], m[0], "line"
    if t == "MultiLineString":
        line = max(c, key=len)
        m = line[len(line) // 2]
        return m[1], m[0], "line"
    if t == "Polygon":
        x, y = polygon_centroid([tuple(p[:2]) for p in c[0]])
        return y, x, "area"
    if t == "MultiPolygon":
        big = max(c, key=lambda poly: len(poly[0]))
        x, y = polygon_centroid([tuple(p[:2]) for p in big[0]])
        return y, x, "area"
    return None


class Grid:
    def __init__(self, cell_deg: float = 0.0006) -> None:
        self._cell = cell_deg
        self._g: dict[tuple[int, int], list[int]] = defaultdict(list)

    def _key(self, lat: float, lon: float) -> tuple[int, int]:
        return int(lat / self._cell), int(lon / self._cell)

    def add(self, idx: int, lat: float, lon: float) -> None:
        self._g[self._key(lat, lon)].append(idx)

    def near(self, lat: float, lon: float, rings: int = 1) -> Iterator[int]:
        kx, ky = self._key(lat, lon)
        for dx in range(-rings, rings + 1):
            for dy in range(-rings, rings + 1):
                yield from self._g.get((kx + dx, ky + dy), [])
