import type { Embedder } from "./embedder";
import { TagMatcherService } from "./tag-matcher.service";
import { TagQueryService } from "./tag-query.service";

const VECTORS: Record<string, number[]> = {
  Gotyk: [1, 0, 0],
  Park: [0, 1, 0],
  "gotyckie kościoły": [0.99, 0.1, 0],
  "coś zupełnie innego": [0.05, 0.05, 0.05],
};

function setup() {
  const embed = jest.fn(async (texts: string[]) =>
    texts.map((text) => VECTORS[text] ?? [0, 0, 1]),
  );
  const service = new TagMatcherService(new TagQueryService(), {
    embed,
  } as unknown as Embedder);
  return { service, embed };
}

describe("TagMatcherService", () => {
  it("maps free text onto the closest tag", async () => {
    const { service } = setup();
    const [best] = await service.match("gotyckie kościoły");
    expect(best).toMatchObject({
      id: "gothic",
      label: "Gotyk",
      group: "style",
    });
    expect(best?.score).toBeGreaterThan(0.9);
  });

  it("returns nothing when no tag is similar enough", async () => {
    const { service } = setup();
    expect(await service.match("coś zupełnie innego")).toEqual([]);
  });

  it("embeds every tag label and synonym phrase once and reuses them", async () => {
    const { service, embed } = setup();
    await service.match("gotyckie kościoły");
    await service.match("gotyckie kościoły");
    const batches = embed.mock.calls.filter(([texts]) => texts.length > 1);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.[0]).toContain("Secesja");
    expect(batches[0]?.[0]).toContain("secesyjne kamienice");
  });

  it("retries loading the tag vectors after a failure", async () => {
    const embed = jest
      .fn()
      .mockRejectedValueOnce(new Error("model down"))
      .mockImplementation(async (texts: string[]) =>
        texts.map((t) => VECTORS[t] ?? [0, 0, 1]),
      );
    const service = new TagMatcherService(new TagQueryService(), {
      embed,
    } as unknown as Embedder);
    await expect(service.match("gotyckie kościoły")).rejects.toThrow(
      "model down",
    );
    expect((await service.match("gotyckie kościoły"))[0]?.id).toBe("gothic");
  });
});
