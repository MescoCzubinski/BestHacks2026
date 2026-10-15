import json

from app.config import REGION
from app.db import city_params


def test_city_row_uses_the_region_box_in_backend_bbox_order():
    row = city_params(REGION)
    assert row["name"] == "Wrocław"
    assert row["region"] == "dolnośląskie"
    assert json.loads(row["bbox"]) == [REGION.west, REGION.south, REGION.east, REGION.north]
    assert REGION.contains(row["latitude"], row["longitude"])
