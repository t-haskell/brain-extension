import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { TaskCard } from "../../src/components/TaskCard";
import { createTask } from "../../src/domain/rules";

describe("TaskCard", () => {
  test("opens a workflow actions menu from the three-dot button", async () => {
    const user = userEvent.setup();
    const task = {
      ...createTask({ title: "Draft outline for memo", status: "next", areaId: "work" }, new Date("2026-04-29T12:00:00Z")),
      id: "task-1"
    };
    const onStatus = vi.fn();

    render(
      <TaskCard
        task={task}
        onOpen={vi.fn()}
        onComplete={vi.fn()}
        onFocus={vi.fn()}
        onStatus={onStatus}
      />
    );

    await user.click(screen.getByRole("button", { name: "More task actions" }));

    expect(screen.getByRole("menu", { name: "Task actions" })).toBeVisible();

    await user.click(screen.getByRole("menuitem", { name: "Mark waiting" }));

    expect(onStatus).toHaveBeenCalledWith(task, "waiting");
  });

  test("exposes an explicit edit details action", async () => {
    const user = userEvent.setup();
    const task = {
      ...createTask({ title: "Need metrics from finance partner", status: "waiting", areaId: "work" }, new Date("2026-04-29T12:00:00Z")),
      id: "task-2"
    };
    const onOpen = vi.fn();

    render(
      <TaskCard
        task={task}
        onOpen={onOpen}
        onComplete={vi.fn()}
        onFocus={vi.fn()}
        onStatus={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit details" }));

    expect(onOpen).toHaveBeenCalledWith(task);
  });
});
