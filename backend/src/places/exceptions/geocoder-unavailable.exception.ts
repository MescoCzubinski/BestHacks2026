import { DomainException } from "../../common/errors/domain.exception";

export class GeocoderUnavailableException extends DomainException {
  constructor() {
    super("upstream", "Address search is temporarily unavailable");
  }
}
