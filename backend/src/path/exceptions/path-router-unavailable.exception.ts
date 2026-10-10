import { DomainException } from "../../common/errors/domain.exception";

export class PathRouterUnavailableException extends DomainException {
  constructor() {
    super("upstream", "Path finding is temporarily unavailable");
  }
}
