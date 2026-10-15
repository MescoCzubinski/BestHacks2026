import { DomainException } from "../../errors/domain.exception";

export class RequestFailedException extends DomainException {
  constructor(request: string) {
    super("unavailable", `${request} failed`);
  }
}
