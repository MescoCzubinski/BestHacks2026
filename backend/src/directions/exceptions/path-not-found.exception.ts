import { DomainException } from "../../common/errors/domain.exception";

export class PathNotFoundException extends DomainException {
  constructor() {
    super("not_found", "No walking path between the given points");
  }
}
