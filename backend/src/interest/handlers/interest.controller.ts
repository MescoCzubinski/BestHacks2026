import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { InterestCatalogService } from "../services/interest-catalog.service";

@Controller("interests")
export class InterestController {
  constructor(private readonly catalog: InterestCatalogService) {}

  @Public()
  @Get()
  list() {
    return this.catalog.list();
  }
}
