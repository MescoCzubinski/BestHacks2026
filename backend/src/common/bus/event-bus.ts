import { Injectable } from "@nestjs/common";
import type { Events, Requests } from "./contracts";
import { TypedBus } from "./typed-bus";

@Injectable()
export class EventBus extends TypedBus<Events, Requests> {}
