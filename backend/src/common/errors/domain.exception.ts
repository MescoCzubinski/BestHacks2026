export type DomainErrorKind =
  | "invalid"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "upstream";

export abstract class DomainException extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundDomainException extends DomainException {
  constructor(entity: string, id: string) {
    super("not_found", `${entity} ${id} not found`);
  }
}
