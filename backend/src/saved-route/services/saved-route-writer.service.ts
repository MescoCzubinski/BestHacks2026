import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CityQueryService } from "../../city/services/city-query.service";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { TagQueryService } from "../../tag/services/tag-query.service";
import {
  SavedRoute,
  type SavedRouteData,
} from "../entities/saved-route.entity";
import {
  SavedRouteQueryService,
  type SavedRouteView,
} from "./saved-route-query.service";

export type NewSavedRoute = SavedRouteData & { durationMinutes: number };

const MAX_TITLE_LENGTH = 120;
const FALLBACK_TITLE = "Trasa";

@Injectable()
export class SavedRouteWriterService {
  constructor(
    @InjectRepository(SavedRoute)
    private readonly routes: Repository<SavedRoute>,
    private readonly cities: CityQueryService,
    private readonly tags: TagQueryService,
    private readonly query: SavedRouteQueryService,
  ) {}

  async save(userId: string, input: NewSavedRoute): Promise<SavedRouteView> {
    const city = await this.cities.nameAt(input.start.lat, input.start.lng);
    const { durationMinutes, ...data } = input;
    const saved = await this.routes.save(
      this.routes.create({
        userId,
        city,
        durationMinutes,
        title: this.titleFor(city, input.tags),
        data,
      }),
    );
    return this.query.view(saved);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.routes.delete({ id, userId });
    if (!result.affected) throw new NotFoundDomainException("Saved route", id);
  }

  private titleFor(city: string | null, tagIds: string[]): string {
    const labels = this.tags
      .list()
      .filter((t) => tagIds.includes(t.id))
      .map((t) => t.label);
    const topics = labels.join(", ");
    const title = [city, topics].filter(Boolean).join(": ");
    return (title || FALLBACK_TITLE).slice(0, MAX_TITLE_LENGTH);
  }
}
