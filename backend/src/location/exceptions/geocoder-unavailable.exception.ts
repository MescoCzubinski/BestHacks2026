import { DomainException } from "../../common/errors/domain.exception";

export class GeocoderUnavailableException extends DomainException {
  constructor() {
    super("unavailable", "Address search is temporarily unavailable");
  }
}
