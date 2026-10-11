import re
from pathlib import Path

import pytest

from app.taxonomy import GROUPS

STYLE_TAG_TS = Path(__file__).resolve().parents[2] / "backend" / "src" / "places" / "style-tag.ts"


def backend_groups() -> dict[str, list[str]]:
    src = STYLE_TAG_TS.read_text(encoding="utf-8")
    body = src[src.index("TAG_GROUPS"): src.index("as const")]
    return {m.group(1): re.findall(r'"([a-z_]+)"', m.group(2)) for m in re.finditer(r"(\w+): \[(.*?)\]", body, re.S)}


@pytest.mark.skipif(not STYLE_TAG_TS.exists(), reason="backend source not available (running inside the image)")
def test_taxonomy_matches_backend_enum():
    backend = backend_groups()
    assert {g: sorted(t) for g, t in backend.items()} == {g: sorted(t) for g, t in GROUPS.items()}
