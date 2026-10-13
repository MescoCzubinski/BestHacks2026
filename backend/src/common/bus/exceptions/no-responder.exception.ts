import { DomainException } from "../../errors/domain.exception";

export class NoResponderException extends DomainException {
  constructor(request: string) {
    super("unavailable", `Nothing can answer ${request} right now`);
  }
}
