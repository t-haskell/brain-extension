import { describe, expect, test } from "vitest";
import { mapCloudAccountState } from "../../src/persistence/sync";

describe("cloud sync account state", () => {
  test("reports local-only when no Dexie Cloud URL is configured", () => {
    expect(
      mapCloudAccountState({
        enabled: false,
        user: undefined,
        syncState: undefined,
        lastSyncAt: null
      })
    ).toEqual({
      enabled: false,
      isLoggedIn: false,
      email: null,
      userId: null,
      phase: "local-only",
      lastSyncAt: null,
      errorMessage: null
    });
  });

  test("maps signed-in cloud sync status into the account chip model", () => {
    expect(
      mapCloudAccountState({
        enabled: true,
        user: {
          isLoggedIn: true,
          email: "me@example.com",
          userId: "user-1"
        },
        syncState: {
          phase: "in-sync",
          status: "connected"
        },
        lastSyncAt: new Date("2026-04-30T12:00:00Z")
      })
    ).toEqual({
      enabled: true,
      isLoggedIn: true,
      email: "me@example.com",
      userId: "user-1",
      phase: "in-sync",
      lastSyncAt: new Date("2026-04-30T12:00:00Z"),
      errorMessage: null
    });
  });

  test("keeps sync errors visible without losing signed-in identity", () => {
    expect(
      mapCloudAccountState({
        enabled: true,
        user: {
          isLoggedIn: true,
          email: "me@example.com",
          userId: "user-1"
        },
        syncState: {
          phase: "error",
          status: "error",
          error: new Error("Network failed")
        },
        lastSyncAt: null
      })
    ).toMatchObject({
      enabled: true,
      isLoggedIn: true,
      phase: "error",
      errorMessage: "Network failed"
    });
  });
});
