export type RequestContract = { payload: unknown; reply: unknown };

export type Requests = Record<never, RequestContract>;

export type Events = Record<never, unknown>;
