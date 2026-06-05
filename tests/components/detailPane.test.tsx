import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DetailPane } from "../../src/components/DetailPane";
import { DEFAULT_APP_SETTINGS } from "../../src/domain/settings";
import { createTask } from "../../src/domain/rules";
import { useBrain } from "../../src/store/BrainStore";
import { useSettings } from "../../src/store/SettingsStore";

vi.mock("../../src/store/BrainStore", () => ({
  useBrain: vi.fn()
}));

vi.mock("../../src/store/SettingsStore", () => ({
  useSettings: vi.fn()
}));

const taskOne = {
  ...createTask({ title: "Draft outline", status: "next", areaId: "work" }, new Date("2026-04-29T12:00:00Z")),
  id: "task-1"
};
const taskTwo = {
  ...createTask({ title: "Buy filters", status: "next", areaId: "personal" }, new Date("2026-04-29T12:00:00Z")),
  id: "task-2"
};

describe("DetailPane", () => {
  const selectTask = vi.fn();
  const updateTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    updateTask.mockResolvedValue(undefined);
    vi.mocked(useSettings).mockReturnValue({
      settings: DEFAULT_APP_SETTINGS,
      isLoaded: true,
      updateSettings: vi.fn()
    });
  });

  test("keeps dirty edits when the user cancels switching tasks", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(useBrain).mockReturnValue({
      selectedTask: taskOne,
      selectTask,
      updateTask,
      snapshot: { areas: [], projects: [], tasks: [taskOne, taskTwo] }
    } as unknown as ReturnType<typeof useBrain>);

    const { rerender } = render(<DetailPane />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Draft revised outline" } });

    vi.mocked(useBrain).mockReturnValue({
      selectedTask: taskTwo,
      selectTask,
      updateTask,
      snapshot: { areas: [], projects: [], tasks: [taskOne, taskTwo] }
    } as unknown as ReturnType<typeof useBrain>);
    rerender(<DetailPane />);

    expect(window.confirm).toHaveBeenCalledWith("Discard unsaved detail changes?");
    expect(selectTask).toHaveBeenCalledWith("task-1");
    expect(screen.getByLabelText("Title")).toHaveValue("Draft revised outline");
  });
});
