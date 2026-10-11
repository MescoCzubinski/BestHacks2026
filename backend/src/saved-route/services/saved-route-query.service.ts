import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { LatLng } from "../../city/bbox";
import { SavedRoute, type SavedStop } from "../entities/saved-route.entity";

export type SavedRouteView = {
  id: string;
  title: string;
  city: string | null;
  date: string;
  tags: string[];
  durationMinutes: number;
  start: LatLng;
  end: LatLng;
  stops: SavedStop[];
};

const HISTORY_LIMIT = 50;

@Injectable()
export class SavedRouteQueryService {
  constructor(
    @InjectRepository(SavedRoute)
    private readonly routes: Repository<SavedRoute>,
  ) {}

  async listForUser(userId: string): Promise<SavedRouteView[]> {
    const rows = await this.routes.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: HISTORY_LIMIT,
    });
    return rows.map((r) => this.view(r));
  }

  view(r: SavedRoute): SavedRouteView {
    return {
      id: r.id,
      title: r.title,
      city: r.city,
      date: r.createdAt.toISOString(),
      tags: r.data.tags,
      durationMinutes: r.durationMinutes,
      start: r.data.start,
      end: r.data.end,
      stops: r.data.stops,
    };
  }
}
