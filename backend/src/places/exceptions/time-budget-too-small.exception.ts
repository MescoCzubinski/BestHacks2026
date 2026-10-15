import { DomainException } from "../../common/errors/domain.exception";

export class TimeBudgetTooSmallException extends DomainException {
  constructor(neededMinutes: number) {
    super(
      "invalid",
      `Walking from the start to the end alone takes about ${Math.ceil(neededMinutes)} minutes, more than the time available`,
    );
  }
}
