import { describe, expect, test } from "vitest";
import { addDays } from "date-fns";
import { createTask, getProjectHealth, getRuleWarnings, getWipState, setSingleFocus } from "../../src/domain/rules";
import type { Project } from "../../src/domain/types";

const now = new Date("2026-04-29T12:00:00");

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    areaId: "work",
    title: "Prepare retail architecture memo",
    outcome: "Memo is ready for leadership review",
    status: "active",
    reviewAt: addDays(now, 7),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...overrides
  };
}

describe("domain rules", () => {
  test("flags active projects that do not have an open next action", () => {
    const activeProject = project();
    const tasks = [
      createTask({ title: "Waiting for metrics", status: "waiting", projectId: activeProject.id, areaId: "work" }, now),
      createTask({ title: "Archived action", status: "done", projectId: activeProject.id, areaId: "work" }, now)
    ];

    expect(getProjectHealth(activeProject, tasks).needsNextAction).toBe(true);
  });

  test("does not flag active projects that have next or active action", () => {
    const activeProject = project();
    const tasks = [
      createTask({ title: "Draft outline", status: "next", projectId: activeProject.id, areaId: "work" }, now)
    ];

    expect(getProjectHealth(activeProject, tasks).needsNextAction).toBe(false);
  });

  test("reports hard WIP state and warning when more than three tasks are active", () => {
    const tasks = ["a", "b", "c", "d"].map((title) => createTask({ title, status: "active" }, now));

    expect(getWipState(tasks)).toMatchObject({
      activeCount: 4,
      limit: 3,
      isOverLimit: true
    });
  });

  test("only one focus task can exist at a time", () => {
    const tasks = [
      createTask({ title: "One", status: "active", focus: true }, now),
      createTask({ title: "Two", status: "next" }, now)
    ].map((task, index) => ({ ...task, id: `task-${index + 1}` }));

    const updated = setSingleFocus(tasks, "task-2", now);

    expect(updated.filter((task) => task.focus)).toHaveLength(1);
    expect(updated.find((task) => task.id === "task-2")).toMatchObject({
      focus: true,
      status: "active"
    });
  });

  test("surfaces rule warnings for waiting, scheduled, and incubator items that lack dates", () => {
    expect(getRuleWarnings(createTask({ title: "Waiting", status: "waiting" }, now))).toContain(
      "Waiting items need a follow-up date or review date."
    );
    expect(getRuleWarnings(createTask({ title: "Scheduled", status: "scheduled" }, now))).toContain(
      "Scheduled items need a due date."
    );
    expect(getRuleWarnings(createTask({ title: "Incubator", status: "incubator" }, now))).toContain(
      "Incubator items need a review date."
    );
  });
});
