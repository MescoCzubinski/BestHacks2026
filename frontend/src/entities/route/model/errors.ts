export type RouteErrorKind = "outside" | "unavailable" | "failed";

export class RouteRequestError extends Error {
  constructor(
    readonly kind: RouteErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export function routeErrorFromStatus(status: number): RouteRequestError {
  if (status === 400) {
    return new RouteRequestError(
      "outside",
      "Początek lub koniec trasy jest poza obsługiwanymi miastami.",
    );
  }
  if (status === 404) {
    return new RouteRequestError(
      "failed",
      "Nie znaleźliśmy pieszej trasy między tymi punktami.",
    );
  }
  return new RouteRequestError(
    "unavailable",
    "Nie udało się ułożyć trasy. Spróbuj ponownie za chwilę.",
  );
}
