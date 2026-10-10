import { Injectable } from "@nestjs/common";
import { PlaceQueryService } from "../../places/services/place-query.service";
import { TAG_GROUPS } from "../../places/style-tag";

export type Interest = { tag: string; group: string; places: number };

const MIN_PERCENT = 50; // same threshold the route planner uses to call a place a match
const MIN_PLACES = 3; // an interest with fewer places cannot make a route

@Injectable()
export class InterestCatalogService {
  constructor(private readonly places: PlaceQueryService) {}

  /** Every tag that has enough places, grouped; new data means new interests without code changes. */
  async list(): Promise<Interest[]> {
    const counts = new Map(
      (await this.places.tagCounts(MIN_PERCENT)).map((c) => [
        c.tag as string,
        c.count,
      ]),
    );
    const out: Interest[] = [];
    for (const [group, tags] of Object.entries(TAG_GROUPS)) {
      for (const tag of tags as readonly string[]) {
        const places = counts.get(tag) ?? 0;
        if (places >= MIN_PLACES) out.push({ tag, group, places });
      }
    }
    return out.sort((a, b) => b.places - a.places);
  }
}
