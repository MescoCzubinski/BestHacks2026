import { DomainException } from "../../common/errors/domain.exception";

export class NoMatchingPlacesException extends DomainException {
  constructor() {
    super("not_found", "No places match these interests within the available time and area");
  }
}
