import { Injectable } from "@nestjs/common";

export type PlaceView = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  visitMinutes: number;
  enterable: boolean;
};

export const DEFAULT_PLACE_LIMIT = 8;

@Injectable()
export class PlaceSearchService {
  /** Stub: the places table is still incomplete, so the endpoint accepts the query but returns nothing yet. */
  async search(
    _query: string,
    _limit: number = DEFAULT_PLACE_LIMIT,
  ): Promise<PlaceView[]> {
    return [];
  }
}
