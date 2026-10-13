import type { ArgumentsHost } from "@nestjs/common";
import { DomainExceptionFilter } from "./domain-exception.filter";
import { DomainException, NotFoundDomainException } from "./domain.exception";

describe("DomainExceptionFilter", () => {
  it("maps a not-found domain error to a 404 body", () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new DomainExceptionFilter().catch(
      new NotFoundDomainException("Place", "p1"),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      error: "not_found",
      message: "Place p1 not found",
    });
  });

  it("maps an upstream failure to a 502 body", () => {
    class UpstreamDown extends DomainException {
      constructor() {
        super("unavailable", "geocoder down");
      }
    }
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new DomainExceptionFilter().catch(new UpstreamDown(), host);

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      statusCode: 502,
      error: "unavailable",
      message: "geocoder down",
    });
  });
});
