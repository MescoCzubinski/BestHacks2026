import { DomainException } from "../../common/errors/domain.exception";

export class EmailTakenException extends DomainException {
  constructor() {
    super("conflict", "An account with this e-mail already exists");
  }
}
