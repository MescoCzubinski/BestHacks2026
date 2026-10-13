import { DomainException } from "../../common/errors/domain.exception";

export class EmbeddingUnavailableException extends DomainException {
  constructor() {
    super("unavailable", "Tag matching is temporarily unavailable");
  }
}
