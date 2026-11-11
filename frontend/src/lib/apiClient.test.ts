import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearApiCache, directApiFetch } from "./apiClient";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("API GET cache invalidation", () => {
  beforeEach(() => {
    clearApiCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearApiCache();
  });

  it("does not reuse a pending pre-mutation GET after a successful mutation", async () => {
    const firstGet = deferred<Response>();
    const refreshedGet = deferred<Response>();
    let getCount = 0;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_input, init) => {
        if (init?.method === "POST") {
          return Promise.resolve(new Response('{"saved":true}'));
        }
        getCount += 1;
        return getCount === 1 ? firstGet.promise : refreshedGet.promise;
      });

    const oldRequest = directApiFetch<{ activities: number[] }>(
      "/plans/plan-1",
    );
    await Promise.resolve();
    await directApiFetch("/activities", { method: "POST", body: "{}" });

    const refreshedRequest = directApiFetch<{ activities: number[] }>(
      "/plans/plan-1",
    );
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    firstGet.resolve(
      new Response(JSON.stringify({ activities: [1] }), { status: 200 }),
    );
    await oldRequest;

    const duplicateRefreshedRequest = directApiFetch<{
      activities: number[];
    }>("/plans/plan-1");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    refreshedGet.resolve(
      new Response(JSON.stringify({ activities: [1, 2] }), { status: 200 }),
    );

    await expect(refreshedRequest).resolves.toEqual({ activities: [1, 2] });
    await expect(duplicateRefreshedRequest).resolves.toEqual({
      activities: [1, 2],
    });
  });
});
