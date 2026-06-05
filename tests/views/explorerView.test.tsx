import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ExplorerView } from "../../src/views/ExplorerView";
import { DEFAULT_APP_SETTINGS } from "../../src/domain/settings";
import { createTask } from "../../src/domain/rules";
import type { BrainSnapshot, Project } from "../../src/domain/types";
import { useBrain } from "../../src/store/BrainStore";
import { useSettings } from "../../src/store/SettingsStore";

vi.mock("../../src/store/BrainStore", () => ({
  useBrain: vi.fn()
}));

vi.mock("../../src/store/SettingsStore", () => ({
  useSettings: vi.fn()
}));

const now = new Date("2026-04-29T12:00:00Z");

const project: Project = {
  id: "project-1",
  areaId: "work",
  title: "Architecture memo",
  outcome: "Memo is ready",
  status: "active",
  reviewAt: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null
};

const taskOne = {
  ...createTask({ title: "Draft outline", status: "next", areaId: "work" }, now),
  id: "task-1"
};

const taskTwo = {
  ...createTask({ title: "Buy filters", status: "inbox", areaId: "personal" }, now),
  id: "task-2"
};

const taskThree = {
  ...createTask({ title: "Review lease", status: "waiting", areaId: "personal" }, now),
  id: "task-3"
};

const snapshot: BrainSnapshot = {
  areas: [],
  projects: [project],
  tasks: [taskOne, taskTwo, taskThree]
};

describe("ExplorerView bulk editing", () => {
  const bulkUpdateTasks = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    bulkUpdateTasks.mockResolvedValue(undefined);
    vi.mocked(useBrain).mockReturnValue({
      snapshot,
      selectedTask: null,
      selectTask: vi.fn(),
      completeTask: vi.fn(),
      setFocusTask: vi.fn(),
      updateTask: vi.fn(),
      bulkUpdateTasks
    } as unknown as ReturnType<typeof useBrain>);
    vi.mocked(useSettings).mockReturnValue({
      settings: DEFAULT_APP_SETTINGS,
      isLoaded: true,
      updateSettings: vi.fn()
    });
  });

  test("applies selected common fields to checked tasks", async () => {
    const user = userEvent.setup();

    render(<ExplorerView />);

    await user.click(screen.getByLabelText("Select Draft outline"));
    await user.click(screen.getByLabelText("Select Buy filters"));
    await user.selectOptions(screen.getByTestId("bulk-edit-area"), "personal");
    await user.selectOptions(screen.getByTestId("bulk-edit-status"), "waiting");
    await user.selectOptions(screen.getByTestId("bulk-edit-kind"), "reference");
    await user.selectOptions(screen.getByTestId("bulk-edit-project"), "project-1");
    await user.click(screen.getByTestId("apply-bulk-edit"));

    await waitFor(() =>
      expect(bulkUpdateTasks).toHaveBeenCalledWith(["task-1", "task-2"], {
        areaId: "personal",
        status: "waiting",
        kind: "reference",
        projectId: "project-1"
      })
    );
  });

  test("selects only currently filtered tasks and leaves unchanged fields out of the patch", async () => {
    const user = userEvent.setup();

    render(<ExplorerView />);

    await user.type(screen.getByLabelText("Search text"), "draft");
    await user.click(screen.getByRole("button", { name: "Select all shown" }));
    await user.selectOptions(screen.getByTestId("bulk-edit-status"), "active");
    await user.click(screen.getByTestId("apply-bulk-edit"));

    await waitFor(() => expect(bulkUpdateTasks).toHaveBeenCalledWith(["task-1"], { status: "active" }));
  });
});
