import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CloudAccountChip } from "../../src/components/CloudAccountChip";
import { loginToCloud, logoutFromCloud, syncCloudNow, useCloudAccount } from "../../src/persistence/sync";

vi.mock("../../src/persistence/sync", () => ({
  useCloudAccount: vi.fn(),
  loginToCloud: vi.fn(),
  logoutFromCloud: vi.fn(),
  syncCloudNow: vi.fn()
}));

describe("CloudAccountChip", () => {
  beforeEach(() => {
    vi.mocked(loginToCloud).mockResolvedValue(undefined);
    vi.mocked(logoutFromCloud).mockResolvedValue(undefined);
    vi.mocked(syncCloudNow).mockResolvedValue(undefined);
  });

  test("shows local-only status when Dexie Cloud is not configured", () => {
    vi.mocked(useCloudAccount).mockReturnValue({
      enabled: false,
      isLoggedIn: false,
      email: null,
      userId: null,
      phase: "local-only",
      lastSyncAt: null,
      errorMessage: null
    });

    render(<CloudAccountChip />);

    expect(screen.getByTestId("cloud-account-chip")).toHaveTextContent("Local only");
  });

  test("starts email sign-in from the signed-out state", async () => {
    const user = userEvent.setup();
    vi.mocked(useCloudAccount).mockReturnValue({
      enabled: true,
      isLoggedIn: false,
      email: null,
      userId: null,
      phase: "signed-out",
      lastSyncAt: null,
      errorMessage: null
    });

    render(<CloudAccountChip />);

    await user.click(screen.getByRole("button", { name: "Sign in to sync" }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in code" }));

    expect(loginToCloud).toHaveBeenCalledWith("me@example.com");
  });

  test("closes the account panel with Escape and returns focus to the chip", async () => {
    const user = userEvent.setup();
    vi.mocked(useCloudAccount).mockReturnValue({
      enabled: true,
      isLoggedIn: false,
      email: null,
      userId: null,
      phase: "signed-out",
      lastSyncAt: null,
      errorMessage: null
    });

    render(<CloudAccountChip />);

    const chip = screen.getByRole("button", { name: "Sign in to sync" });
    await user.click(chip);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Sync account" })).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  test("exposes manual sync and sign out when signed in", async () => {
    const user = userEvent.setup();
    vi.mocked(useCloudAccount).mockReturnValue({
      enabled: true,
      isLoggedIn: true,
      email: "me@example.com",
      userId: "user-1",
      phase: "in-sync",
      lastSyncAt: new Date("2026-04-30T12:00:00Z"),
      errorMessage: null
    });

    render(<CloudAccountChip />);

    await user.click(screen.getByRole("button", { name: /me@example.com/ }));
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(syncCloudNow).toHaveBeenCalled();
    expect(logoutFromCloud).toHaveBeenCalled();
  });
});
