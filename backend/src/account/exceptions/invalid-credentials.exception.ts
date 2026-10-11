import { DomainException } from "../../common/errors/domain.exception";

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super("unauthorized", "Invalid e-mail or password");
  }
}
