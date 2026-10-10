import { DomainException } from "../../common/errors/domain.exception";

export class EmbeddingUnavailableException extends DomainException {
  constructor() {
    super("upstream", "Tag matching is temporarily unavailable");
  }
}
