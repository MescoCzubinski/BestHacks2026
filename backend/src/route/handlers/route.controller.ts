import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { DEFAULT_WALKING_SPEED_KMH } from "../../path/services/straight-line";
import { RoutePlanService } from "../services/route-plan.service";
import { PlanRouteDto } from "./dto/plan-route.dto";

const DEFAULT_MAX_STOPS = 12;
const DEFAULT_INTEREST_WEIGHT = 1;

@Controller("routes")
export class RouteController {
  constructor(private readonly plans: RoutePlanService) {}

  /** Plans an ordered walk from start to end that fits the time and the chosen interests. */
  @Public()
  @Post("plan")
  @HttpCode(200)
  plan(@Body() dto: PlanRouteDto) {
    return this.plans.plan({
      start: dto.start,
      end: dto.end,
      startAt: new Date(dto.startTime),
      availableMinutes: dto.availableMinutes,
      interests: dto.interests.map((i) => ({
        tag: i.tag,
        weight: i.weight ?? DEFAULT_INTEREST_WEIGHT,
      })),
      preferences: {
        accessible: dto.preferences?.accessible ?? false,
        freeOnly: dto.preferences?.freeOnly ?? false,
        maxStops: dto.preferences?.maxStops ?? DEFAULT_MAX_STOPS,
        walkingSpeedKmh:
          dto.preferences?.walkingSpeedKmh ?? DEFAULT_WALKING_SPEED_KMH,
      },
    });
  }
}
