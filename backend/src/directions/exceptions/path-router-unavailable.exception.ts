import { DomainException } from "../../common/errors/domain.exception";

export class PathRouterUnavailableException extends DomainException {
  constructor() {
    super("unavailable", "Path finding is temporarily unavailable");
  }
}
