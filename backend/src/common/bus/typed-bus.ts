import { Logger } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import type { RequestContract } from "./contracts";
import { NoResponderException } from "./exceptions/no-responder.exception";
import { RequestFailedException } from "./exceptions/request-failed.exception";

type Responder<C extends RequestContract> = (
  payload: C["payload"],
) => C["reply"] | Promise<C["reply"]>;

type Listener<P> = (payload: P) => void | Promise<void>;

type AnyResponder = (payload: unknown) => unknown;
type AnyListener = (payload: unknown) => void | Promise<void>;

export class TypedBus<
  E extends Record<string, unknown>,
  R extends Record<string, RequestContract>,
> {
  private readonly logger = new Logger("EventBus");
  private readonly responders = new Map<keyof R, AnyResponder>();
  private readonly listeners = new Map<keyof E, AnyListener[]>();

  respond<K extends keyof R>(name: K, responder: Responder<R[K]>): void {
    if (this.responders.has(name)) {
      throw new Error(`${String(name)} already has a responder`);
    }
    this.responders.set(name, responder as AnyResponder);
  }

  async request<K extends keyof R>(
    name: K,
    payload: R[K]["payload"],
  ): Promise<R[K]["reply"]> {
    const responder = this.responders.get(name);
    if (!responder) throw new NoResponderException(String(name));
    try {
      return (await responder(payload)) as R[K]["reply"];
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.warn(`${String(name)} failed: ${String(error)}`);
      throw new RequestFailedException(String(name));
    }
  }

  on<K extends keyof E>(name: K, listener: Listener<E[K]>): void {
    const current = this.listeners.get(name) ?? [];
    this.listeners.set(name, [...current, listener as AnyListener]);
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    for (const listener of this.listeners.get(name) ?? []) {
      void Promise.resolve()
        .then(() => listener(payload))
        .catch((error: unknown) =>
          this.logger.warn(`${String(name)} listener failed: ${String(error)}`),
        );
    }
  }
}
