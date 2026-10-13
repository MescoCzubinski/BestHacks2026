import { Injectable } from "@nestjs/common";
import type { CandidateQuery, PlaceCandidate } from "./place-candidate";
import { PlaceRepository } from "../repositories/place.repository";
import { VisitDurationService } from "./visit-duration.service";

@Injectable()
export class PlaceCandidateService {
  constructor(
    private readonly places: PlaceRepository,
    private readonly visits: VisitDurationService,
  ) {}

  async find(query: CandidateQuery): Promise<PlaceCandidate[]> {
    const rows = await this.places.findInBoxWithTags(query);
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      description: p.description,
      mainImageUrl: p.mainImageUrl,
      significance: p.significance,
      tags: p.tags,
      wheelchair: p.facts.wheelchair ?? null,
      openingHours: p.facts.openingHours ?? null,
      visitMinutes: this.visits.visitMinutes(p.tags, p.significance),
      enterable: this.visits.isEnterable(p.tags),
    }));
  }
}
