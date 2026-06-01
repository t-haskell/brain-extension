import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ImportExportPanel } from "../../src/components/ImportExportPanel";
import { useBrain } from "../../src/store/BrainStore";

vi.mock("../../src/store/BrainStore", () => ({
  useBrain: vi.fn()
}));

const brain = {
  exportJson: vi.fn(() => "{}"),
  exportCsv: vi.fn(() => "type,id"),
  importJson: vi.fn(),
  resetDemo: vi.fn()
};

describe("ImportExportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brain.importJson.mockResolvedValue(undefined);
    brain.resetDemo.mockResolvedValue(undefined);
    vi.mocked(useBrain).mockReturnValue(brain as unknown as ReturnType<typeof useBrain>);
  });

  test("requires confirmation before importing JSON over local data", async () => {
    const user = userEvent.setup();

    render(<ImportExportPanel />);

    fireEvent.change(screen.getByLabelText("Import JSON"), {
      target: { value: "{\"areas\":[],\"projects\":[],\"tasks\":[]}" }
    });
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(brain.importJson).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm import" }));

    expect(brain.importJson).toHaveBeenCalledWith("{\"areas\":[],\"projects\":[],\"tasks\":[]}");
  });

  test("requires confirmation before resetting demo data", async () => {
    const user = userEvent.setup();

    render(<ImportExportPanel />);

    await user.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(brain.resetDemo).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm reset" }));

    expect(brain.resetDemo).toHaveBeenCalled();
  });

  test("disables JSON import when the input is empty", () => {
    render(<ImportExportPanel />);

    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });
});
