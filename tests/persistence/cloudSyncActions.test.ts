import { beforeEach, describe, expect, test, vi } from "vitest";

const cloudMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  sync: vi.fn()
}));

vi.mock("../../src/persistence/db", () => ({
  db: {
    cloud: cloudMocks
  },
  isDexieCloudConfigured: () => true
}));

describe("cloud sync actions", () => {
  beforeEach(() => {
    cloudMocks.login.mockResolvedValue(undefined);
    cloudMocks.logout.mockResolvedValue(undefined);
    cloudMocks.sync.mockResolvedValue(undefined);
    cloudMocks.login.mockClear();
    cloudMocks.logout.mockClear();
    cloudMocks.sync.mockClear();
  });

  test("pulls remote data after login so a newly signed-in device catches up", async () => {
    const { loginToCloud } = await import("../../src/persistence/sync");

    await loginToCloud("me@example.com");

    expect(cloudMocks.login).toHaveBeenCalledWith({ email: "me@example.com" });
    expect(cloudMocks.sync).toHaveBeenCalledWith({ wait: true, purpose: "pull" });
  });

  test("manual sync pushes local edits and pulls remote edits", async () => {
    const { syncCloudNow } = await import("../../src/persistence/sync");

    await syncCloudNow();

    expect(cloudMocks.sync).toHaveBeenNthCalledWith(1, { wait: true, purpose: "push" });
    expect(cloudMocks.sync).toHaveBeenNthCalledWith(2, { wait: true, purpose: "pull" });
  });
});
