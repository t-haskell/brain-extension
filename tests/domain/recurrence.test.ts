import { describe, expect, test } from "vitest";
import { completeTaskWithRecurrence } from "../../src/domain/recurrence";
import { createTask } from "../../src/domain/rules";

describe("recurrence", () => {
  test("completing a recurring task closes the current task and creates the next scheduled occurrence", () => {
    const now = new Date("2026-04-29T09:00:00");
    const task = {
      ...createTask(
        {
          title: "Submit weekly status",
          status: "scheduled",
          areaId: "work",
          dueAt: new Date("2026-04-30T17:00:00Z"),
          recurrenceRule: "weekly"
        },
        now
      ),
      id: "task-1"
    };

    const [completed, next] = completeTaskWithRecurrence(task, now);

    expect(completed).toMatchObject({ id: "task-1", status: "done", focus: false });
    expect(completed.completedAt?.toISOString()).toBe(now.toISOString());
    expect(next).toMatchObject({
      title: "Submit weekly status",
      status: "scheduled",
      recurrenceRule: "weekly",
      completedAt: null
    });
    expect(next.id).not.toBe(task.id);
    expect(next.dueAt?.toISOString()).toBe("2026-05-07T17:00:00.000Z");
  });
});
