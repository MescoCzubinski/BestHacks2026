import { DomainException } from "../../common/errors/domain.exception";

export class OutsideSupportedAreaException extends DomainException {
  constructor() {
    super("invalid", "This location is outside the supported cities");
  }
}
