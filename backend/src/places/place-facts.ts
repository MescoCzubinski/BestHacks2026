export type PositionQuality = "address" | "point" | "street" | "centroid";

export type PlaceFacts = {
  /** Style label as published by the source (NID), before tagging. */
  style?: string;
  function?: string;
  material?: string;
  protection?: string;
  inscription?: string;
  /** Source type labels (OSM/Wikidata/GIS), most specific first. */
  kinds?: string[];
  /** OSM wheelchair=yes|limited|no. Absent means unknown, not inaccessible. */
  wheelchair?: "yes" | "limited" | "no";
  /** Raw OSM opening_hours value ("Mo-Fr 09:00-17:00; Sa 10:00-14:00"); absent means unknown. */
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
