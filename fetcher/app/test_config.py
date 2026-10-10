import pytest

from app.config import parse_region


def env(**kw):
    return {"REGION_ID": "wroclaw", "REGION_BBOX": "50.99,16.78,51.22,17.18", **kw}


def test_parses_bbox_and_defaults():
    r = parse_region(env())
    assert r.bbox == (50.99, 16.78, 51.22, 17.18)
    assert r.contains(51.1, 17.0) and not r.contains(52.0, 17.0)


@pytest.mark.parametrize("bbox", ["1,2,3", "51,17,50,18", "a,b,c,d"])
def test_rejects_invalid_bbox(bbox):
    with pytest.raises(ValueError):
        parse_region(env(REGION_BBOX=bbox))


def test_rejects_unsafe_region_id():
    with pytest.raises(ValueError):
        parse_region(env(REGION_ID="x'; drop"))
