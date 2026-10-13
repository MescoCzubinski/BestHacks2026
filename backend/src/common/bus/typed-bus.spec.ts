import { NotFoundDomainException } from "../errors/domain.exception";
import { NoResponderException } from "./exceptions/no-responder.exception";
import { RequestFailedException } from "./exceptions/request-failed.exception";
import { TypedBus } from "./typed-bus";

type TestEvents = { "order.placed": { id: string } };
type TestRequests = {
  "order.total": { payload: { id: string }; reply: number };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

function bus() {
  return new TypedBus<TestEvents, TestRequests>();
}

describe("TypedBus requests", () => {
  it("returns the typed reply of the one responder", async () => {
    const b = bus();
    b.respond("order.total", ({ id }) => (id === "o1" ? 42 : 0));
    const total: number = await b.request("order.total", { id: "o1" });
    expect(total).toBe(42);
  });

  it("awaits an async responder", async () => {
    const b = bus();
    b.respond("order.total", async () => 7);
    await expect(b.request("order.total", { id: "o1" })).resolves.toBe(7);
  });

  it("rejects when nothing responds", async () => {
    await expect(bus().request("order.total", { id: "o1" })).rejects.toThrow(
      NoResponderException,
    );
  });

  it("passes a domain exception from the responder through unchanged", async () => {
    const b = bus();
    const missing = new NotFoundDomainException("Order", "o1");
    b.respond("order.total", () => {
      throw missing;
    });
    await expect(b.request("order.total", { id: "o1" })).rejects.toBe(missing);
  });

  it("wraps any other responder failure in a domain exception", async () => {
    const b = bus();
    b.respond("order.total", async () => {
      throw new Error("db down");
    });
    await expect(b.request("order.total", { id: "o1" })).rejects.toThrow(
      RequestFailedException,
    );
  });

  it("allows only one responder per request", () => {
    const b = bus();
    b.respond("order.total", () => 1);
    expect(() => b.respond("order.total", () => 2)).toThrow(
      "already has a responder",
    );
  });
});

describe("TypedBus events", () => {
  it("delivers the payload to every listener without blocking the emitter", async () => {
    const b = bus();
    const seen: string[] = [];
    b.on("order.placed", ({ id }) => {
      seen.push(`a:${id}`);
    });
    b.on("order.placed", async ({ id }) => {
      seen.push(`b:${id}`);
    });
    b.emit("order.placed", { id: "o1" });
    expect(seen).toEqual([]);
    await flush();
    expect(seen).toEqual(["a:o1", "b:o1"]);
  });

  it("keeps the other listeners running when one fails", async () => {
    const b = bus();
    const seen: string[] = [];
    b.on("order.placed", () => {
      throw new Error("boom");
    });
    b.on("order.placed", ({ id }) => {
      seen.push(id);
    });
    b.emit("order.placed", { id: "o1" });
    await flush();
    expect(seen).toEqual(["o1"]);
  });

  it("does nothing when an event has no listeners", () => {
    expect(() => bus().emit("order.placed", { id: "o1" })).not.toThrow();
  });
});
