import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { CandidateQuery, PlaceCandidate } from "../place-candidate";
import type { PlaceFacts, PositionQuality } from "../place-facts";
import { Place } from "../place.entity";
import type { StyleTag } from "../../common/types/style-tag";

type CandidateRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  main_image_url: string | null;
  significance: number;
  position_quality: PositionQuality;
  year: number | null;
  facts: PlaceFacts;
  tags: Partial<Record<StyleTag, number>>;
};

@Injectable()
export class PlaceQueryService {
  constructor(
    @InjectRepository(Place) private readonly places: Repository<Place>,
  ) {}

  async findCandidates(q: CandidateQuery): Promise<PlaceCandidate[]> {
    const rows: CandidateRow[] = await this.places.query(
      `SELECT p.id, p.name, p.latitude, p.longitude, p.description, p.main_image_url, p.significance,
              p.position_quality, p.year, p.facts,
              COALESCE(jsonb_object_agg(t.tag, t.percent) FILTER (WHERE t.tag IS NOT NULL), '{}'::jsonb) AS tags
         FROM places p
         LEFT JOIN place_tags t ON t.place_id = p.id
        WHERE p.latitude BETWEEN $1 AND $2
          AND p.longitude BETWEEN $3 AND $4
          AND EXISTS (SELECT 1 FROM place_tags m
                       WHERE m.place_id = p.id AND m.tag = ANY($5::style_tag[]) AND m.percent >= $6)
        GROUP BY p.id
        ORDER BY p.significance DESC
        LIMIT $7`,
      [q.south, q.north, q.west, q.east, q.tags, q.minPercent, q.limit],
    );
    return rows.map(toCandidate);
  }

  async searchByName(text: string, limit: number): Promise<PlaceCandidate[]> {
    const escaped = text.replace(/[\\%_]/g, (c) => `\\${c}`);
    const rows: CandidateRow[] = await this.places.query(
      `SELECT p.id, p.name, p.latitude, p.longitude, p.description, p.main_image_url, p.significance,
              p.position_quality, p.year, p.facts,
              COALESCE(jsonb_object_agg(t.tag, t.percent) FILTER (WHERE t.tag IS NOT NULL), '{}'::jsonb) AS tags
         FROM places p
         LEFT JOIN place_tags t ON t.place_id = p.id
        WHERE p.name ILIKE $1
        GROUP BY p.id
        ORDER BY (p.name ILIKE $2) DESC, p.significance DESC, p.name
        LIMIT $3`,
      [`%${escaped}%`, `${escaped}%`, limit],
    );
    return rows.map(toCandidate);
  }
}

function toCandidate(r: CandidateRow): PlaceCandidate {
  return {
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    description: r.description,
    mainImageUrl: r.main_image_url,
    significance: r.significance,
    positionQuality: r.position_quality,
    year: r.year,
    facts: r.facts,
    tags: r.tags,
  };
}
