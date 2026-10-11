import { Injectable } from "@nestjs/common";
import { PlaceQueryService } from "./place-query.service";
import { VisitDurationService } from "./visit-duration.service";

export type PlaceView = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
  enterable: boolean;
  imageUrl: string | null;
};

const DEFAULT_PLACE_LIMIT = 8;

@Injectable()
export class PlaceSearchService {
  constructor(
    private readonly places: PlaceQueryService,
    private readonly visits: VisitDurationService,
  ) {}

  async search(
    query: string,
    limit: number = DEFAULT_PLACE_LIMIT,
  ): Promise<PlaceView[]> {
    const found = await this.places.searchByName(query.trim(), limit);
    return found.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      lat: p.latitude,
      lng: p.longitude,
      visitMinutes: this.visits.visitMinutes(p.tags, p.significance),
      enterable: this.visits.isEnterable(p.tags),
      imageUrl: p.mainImageUrl,
    }));
  }
}
