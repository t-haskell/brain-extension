import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BrainProvider, useBrain } from "../../src/store/BrainStore";
import type { BrainSnapshot } from "../../src/domain/types";
import {
  ensureSeeded,
  loadSnapshot,
  putProject,
  putProjectWithTasks,
  putTask,
  replaceSnapshot,
  resetDemoData
} from "../../src/persistence/db";

vi.mock("../../src/persistence/db", () => ({
  ensureSeeded: vi.fn(),
  loadSnapshot: vi.fn(),
  replaceSnapshot: vi.fn(),
  resetDemoData: vi.fn(),
  putTask: vi.fn(),
  putTasks: vi.fn(),
  putProject: vi.fn(),
  putProjectWithTasks: vi.fn(),
  putProjects: vi.fn()
}));

const emptySnapshot: BrainSnapshot = {
  areas: [
    { id: "work", name: "Work", archived: false },
    { id: "personal", name: "Personal", archived: false }
  ],
  projects: [],
  tasks: []
};

const projectSnapshot: BrainSnapshot = {
  ...emptySnapshot,
  projects: [
    {
      id: "project-1",
      areaId: "work",
      title: "Memo",
      outcome: "Ready",
      status: "active",
      reviewAt: new Date("2026-04-30T12:00:00Z"),
      createdAt: new Date("2026-04-29T12:00:00Z"),
      updatedAt: new Date("2026-04-29T12:00:00Z"),
      completedAt: null
    }
  ]
};

const taskSnapshot: BrainSnapshot = {
  ...emptySnapshot,
  tasks: [
    {
      id: "task-1",
      areaId: "work",
      projectId: null,
      title: "Launch plan",
      notes: "Outcome from notes",
      status: "inbox",
      kind: "reference",
      dueAt: null,
      deferUntil: null,
      reviewAt: null,
      recurrenceRule: null,
      focus: false,
      energy: null,
      estimateMinutes: null,
      waitingOn: null,
      triggerCue: null,
      triggerAction: null,
      source: null,
      createdAt: new Date("2026-04-29T12:00:00Z"),
      updatedAt: new Date("2026-04-29T12:00:00Z"),
      completedAt: null
    }
  ]
};

function StoreHarness() {
  const brain = useBrain();

  if (!brain.isLoaded) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <button type="button" onClick={() => brain.addTask({ title: "Draft outline", areaId: "work", status: "next" })}>
        Add task
      </button>
      <button type="button" onClick={() => brain.createProject({ title: "Memo", outcome: "Ready", areaId: "work" }, "Draft outline")}>
        Add project
      </button>
      <button type="button" onClick={() => brain.updateProject("project-1", { status: "on_hold", title: "Memo v2" })}>
        Update project
      </button>
      <button type="button" onClick={() => brain.createProjectFromTask("task-1")}>
        Convert task
      </button>
      <span data-testid="task-count">{brain.snapshot.tasks.length}</span>
    </div>
  );
}

describe("BrainStore persistence", () => {
  beforeEach(() => {
    vi.mocked(ensureSeeded).mockResolvedValue(undefined);
    vi.mocked(loadSnapshot).mockResolvedValue(emptySnapshot);
    vi.mocked(replaceSnapshot).mockResolvedValue(undefined);
    vi.mocked(resetDemoData).mockResolvedValue(emptySnapshot);
    vi.mocked(putTask).mockResolvedValue(undefined);
    vi.mocked(putProject).mockResolvedValue(undefined);
    vi.mocked(putProjectWithTasks).mockResolvedValue(undefined);
  });

  test("persists a new task with row-level writes instead of replacing the snapshot", async () => {
    const user = userEvent.setup();

    render(
      <BrainProvider>
        <StoreHarness />
      </BrainProvider>
    );

    await screen.findByRole("button", { name: "Add task" });
    await user.click(screen.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(screen.getByTestId("task-count")).toHaveTextContent("1"));
    expect(putTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft outline", status: "next" }));
    expect(replaceSnapshot).not.toHaveBeenCalled();
  });

  test("persists project creation with row-level project and task writes", async () => {
    const user = userEvent.setup();

    render(
      <BrainProvider>
        <StoreHarness />
      </BrainProvider>
    );

    await screen.findByRole("button", { name: "Add project" });
    await user.click(screen.getByRole("button", { name: "Add project" }));

    await waitFor(() =>
      expect(putProjectWithTasks).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Memo" }),
        [expect.objectContaining({ title: "Draft outline", status: "next" })]
      )
    );
    expect(replaceSnapshot).not.toHaveBeenCalled();
  });

  test("persists project updates with a row-level project write", async () => {
    const user = userEvent.setup();
    vi.mocked(loadSnapshot).mockResolvedValue(projectSnapshot);

    render(
      <BrainProvider>
        <StoreHarness />
      </BrainProvider>
    );

    await screen.findByRole("button", { name: "Update project" });
    await user.click(screen.getByRole("button", { name: "Update project" }));

    await waitFor(() =>
      expect(putProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "project-1",
          title: "Memo v2",
          status: "on_hold",
          completedAt: null
        })
      )
    );
    expect(replaceSnapshot).not.toHaveBeenCalled();
  });

  test("persists project conversion and the promoted task in one transaction", async () => {
    const user = userEvent.setup();
    vi.mocked(loadSnapshot).mockResolvedValue(taskSnapshot);

    render(
      <BrainProvider>
        <StoreHarness />
      </BrainProvider>
    );

    await screen.findByRole("button", { name: "Convert task" });
    await user.click(screen.getByRole("button", { name: "Convert task" }));

    await waitFor(() =>
      expect(putProjectWithTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Launch plan",
          outcome: "Outcome from notes"
        }),
        [
          expect.objectContaining({
            id: "task-1",
            projectId: expect.any(String),
            status: "next",
            kind: "task",
            reviewAt: null
          })
        ]
      )
    );
    expect(replaceSnapshot).not.toHaveBeenCalled();
  });
});
