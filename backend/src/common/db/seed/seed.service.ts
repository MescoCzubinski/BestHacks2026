import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { City } from "../../../city/entities/city.entity";
import { CITY_SEEDS } from "./city.seed";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(City) private readonly cities: Repository<City>,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get("NODE_ENV") === "production") return;
    await this.cities.upsert(CITY_SEEDS, ["name"]);
    this.logger.log(`Seeded ${CITY_SEEDS.length} cities`);
  }
}
