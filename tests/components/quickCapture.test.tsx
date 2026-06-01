import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { QuickCapture } from "../../src/components/QuickCapture";
import { createTask } from "../../src/domain/rules";
import { useBrain } from "../../src/store/BrainStore";

vi.mock("../../src/store/BrainStore", () => ({
  useBrain: vi.fn()
}));

describe("QuickCapture", () => {
  const captureQuickCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBrain).mockReturnValue({
      captureQuickCapture
    } as unknown as ReturnType<typeof useBrain>);
  });

  test("announces capture success without depending on a visual-only toast", async () => {
    const user = userEvent.setup();
    captureQuickCapture.mockResolvedValue(
      createTask({ title: "A very long captured item that should wrap inside the toast" }, new Date("2026-04-29T12:00:00Z"))
    );

    render(<QuickCapture />);

    await user.type(screen.getByLabelText("Quick capture"), "follow up on the long item");
    await user.click(screen.getByRole("button", { name: "Capture" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Captured: A very long captured item");
  });
});
