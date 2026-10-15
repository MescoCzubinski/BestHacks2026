export type PositionQuality = "address" | "point" | "street" | "centroid";

export type PlaceFacts = {
  style?: string;
  function?: string;
  material?: string;
  protection?: string;
  inscription?: string;
  kinds?: string[];
  openingHours?: string;
  areaM2?: number;
};

export type PlaceLinks = {
  wikipedia?: string;
  wikidata?: string;
  website?: string;
  nid?: string;
  osm?: string;
};
