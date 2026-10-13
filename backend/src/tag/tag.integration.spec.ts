import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../common/testing/test-app";
import { EmbeddingModelLoader } from "./services/embedding-model";
import { TagModule } from "./tag.module";

const GOTHIC = [1, 0, 0];

describe("tag slice", () => {
  let app: INestApplication;
  const embed = jest.fn(async (texts: string[]) =>
    texts.map((t) =>
      t === "Gotyk" || t.startsWith("gotyc") ? GOTHIC : [0, 0, 1],
    ),
  );

  const load = jest.fn(async () => ({
    embed,
    dispose: async () => undefined,
  }));

  beforeAll(async () => {
    app = await createTestApp({
      imports: [TagModule],
      env: { EMBEDDING_MODEL: "test-model" },
      override: (b) =>
        b.overrideProvider(EmbeddingModelLoader).useValue({ load }),
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it("warms the model up on request without waiting for it", async () => {
    expect(load).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post("/api/embeddings/warmup")
      .expect(202);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lists the tags with groups and Polish labels", async () => {
    const res = await request(app.getHttpServer()).get("/api/tags").expect(200);
    expect(res.body).toContainEqual({
      id: "gothic",
      group: "style",
      label: "Gotyk",
    });
  });

  it("matches free text onto tags", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/tags/match")
      .query({ text: "gotyckie kościoły" })
      .expect(200);
    expect(res.body[0]).toMatchObject({ id: "gothic", score: 1 });
  });

  it("rejects text that is too short", async () => {
    await request(app.getHttpServer())
      .get("/api/tags/match")
      .query({ text: "g" })
      .expect(400);
  });

  it("embeds texts in bulk for the fetcher", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/embeddings")
      .send({ texts: [" gotyckie mury "] })
      .expect(200);
    expect(res.body).toEqual({ dimensions: 3, vectors: [GOTHIC] });
  });

  it("rejects unknown fields in the bulk request", async () => {
    await request(app.getHttpServer())
      .post("/api/embeddings")
      .send({ texts: ["a"], extra: true })
      .expect(400);
  });

  it("maps a model failure to 502", async () => {
    embed.mockRejectedValueOnce(new Error("onnx crashed"));
    await request(app.getHttpServer())
      .post("/api/embeddings")
      .send({ texts: ["a"] })
      .expect(502);
  });
});
