import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { In, IsNull, Not, Repository } from "typeorm";
import { City } from "../../../city/entities/city.entity";
import { CITY_SEEDS } from "./city.seed";
import type { Address } from "../../../places/address";
import type {
  PlaceFacts,
  PlaceLinks,
  PositionQuality,
} from "../../../places/place-facts";
import { PlaceTag } from "../../../places/place-tag.entity";
import { Place } from "../../../places/place.entity";
import { STYLE_TAGS, type StyleTag } from "../../../places/style-tag";

type SeedPlace = {
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  address: Address;
  positionQuality: PositionQuality;
  year: number | null;
  dateText: string | null;
  significance: number;
  facts: PlaceFacts;
  links: PlaceLinks;
  sources: string[];
  mainImageUrl: string | null;
  images: string[];
  tags: { tag: StyleTag; percent: number }[];
};

const SEED_FILE = resolve(process.cwd(), "src/common/db/seed/places.seed.json");
const KNOWN_TAGS = new Set<string>(STYLE_TAGS);
const CHUNK_SIZE = 500;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(City) private readonly cities: Repository<City>,
    @InjectRepository(Place) private readonly places: Repository<Place>,
    @InjectRepository(PlaceTag) private readonly tags: Repository<PlaceTag>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.cities.upsert(CITY_SEEDS, ["name"]);
    this.log.log(`seeded ${CITY_SEEDS.length} cities`);
    if (process.env.NODE_ENV === "production") return;
    if (!existsSync(SEED_FILE)) {
      this.log.warn(`no seed file at ${SEED_FILE}, skipping`);
      return;
    }
    const rows = JSON.parse(readFileSync(SEED_FILE, "utf-8")) as SeedPlace[];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      await this.upsertChunk(rows.slice(i, i + CHUNK_SIZE));
    }
    const regions = new Set(rows.map((r) => r.externalId.split(":")[0]));
    const stale = await this.places.find({
      select: { id: true, externalId: true },
      where: { externalId: Not(IsNull()) },
    });
    const current = new Set(rows.map((r) => r.externalId));
    const staleIds = stale
      .filter(
        (p) =>
          regions.has(p.externalId!.split(":")[0]!) &&
          !current.has(p.externalId!),
      )
      .map((p) => p.id);
    for (let i = 0; i < staleIds.length; i += CHUNK_SIZE) {
      await this.places.delete({ id: In(staleIds.slice(i, i + CHUNK_SIZE)) });
    }
    this.log.log(
      `seeded ${rows.length} places, removed ${staleIds.length} no longer in the seed`,
    );
  }

  private async upsertChunk(chunk: SeedPlace[]): Promise<void> {
    await this.places.upsert(
      chunk.map(({ tags: _tags, ...place }) => place),
      { conflictPaths: ["externalId"], skipUpdateIfNoValuesChanged: true },
    );
    const idByExternal = new Map(
      (
        await this.places.find({
          select: { id: true, externalId: true },
          where: { externalId: In(chunk.map((p) => p.externalId)) },
        })
      ).map((p) => [p.externalId, p.id]),
    );
    const ids = [...idByExternal.values()];
    await this.tags.delete({ placeId: In(ids) });
    const tagRows = chunk.flatMap((p) =>
      p.tags
        .filter((t) => KNOWN_TAGS.has(t.tag))
        .map((t) => ({
          placeId: idByExternal.get(p.externalId)!,
          tag: t.tag,
          percent: t.percent,
        })),
    );
    for (let i = 0; i < tagRows.length; i += CHUNK_SIZE * 4) {
      await this.tags.insert(tagRows.slice(i, i + CHUNK_SIZE * 4));
    }
  }
}
