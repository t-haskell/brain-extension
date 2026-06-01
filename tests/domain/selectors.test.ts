import { describe, expect, test } from "vitest";
import { addDays, subDays } from "date-fns";
import { createTask } from "../../src/domain/rules";
import { getCommandSections, getMonthlyIncubatorReview, getWeeklyReview } from "../../src/domain/selectors";
import type { BrainSnapshot, Project } from "../../src/domain/types";

const now = new Date("2026-04-29T12:00:00");

function snapshot(tasks = [] as ReturnType<typeof createTask>[], projects: Project[] = []): BrainSnapshot {
  return {
    areas: [
      { id: "work", name: "Work", archived: false },
      { id: "personal", name: "Personal", archived: false }
    ],
    projects,
    tasks
  };
}

describe("selectors", () => {
  test("command view is curated into focused actionable sections instead of showing every item", () => {
    const tasks = [
      createTask({ title: "Focus me", status: "active", focus: true, areaId: "work" }, now),
      createTask({ title: "Overdue bill", status: "scheduled", dueAt: subDays(now, 1), areaId: "personal" }, now),
      createTask({ title: "Next work", status: "next", areaId: "work" }, now),
      createTask({ title: "Next personal", status: "next", areaId: "personal" }, now),
      createTask({ title: "Waiting due", status: "waiting", reviewAt: now, areaId: "work" }, now),
      createTask({ title: "Ready idea", status: "incubator", reviewAt: now, areaId: "personal" }, now),
      createTask({ title: "Hidden later idea", status: "incubator", reviewAt: addDays(now, 30), areaId: "personal" }, now)
    ];

    const sections = getCommandSections(snapshot(tasks), now);
    const sectionTitles = sections.map((section) => section.title);
    const surfacedTitles = sections.flatMap((section) => section.items.map((item) => item.title));

    expect(sectionTitles).toEqual([
      "Focus",
      "Due Today / Overdue",
      "Work Next",
      "Personal Next",
      "Waiting Follow-ups Due",
      "Incubator Items Ready for Review"
    ]);
    expect(surfacedTitles).toContain("Ready idea");
    expect(surfacedTitles).not.toContain("Hidden later idea");
  });

  test("weekly review surfaces inbox, project health, waiting, two-week schedule, and stale tasks", () => {
    const project: Project = {
      id: "project-1",
      areaId: "work",
      title: "Prepare retail architecture memo",
      outcome: "Memo reviewed",
      status: "active",
      reviewAt: now,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    const tasks = [
      createTask({ title: "Inbox item", status: "inbox" }, now),
      createTask({ title: "Waiting", status: "waiting", reviewAt: now }, now),
      createTask({ title: "Soon", status: "scheduled", dueAt: addDays(now, 5) }, now),
      { ...createTask({ title: "Stale", status: "next" }, now), updatedAt: subDays(now, 45) }
    ];

    const review = getWeeklyReview(snapshot(tasks, [project]), now);

    expect(review.inbox.map((task) => task.title)).toEqual(["Inbox item"]);
    expect(review.activeProjects[0]).toMatchObject({ needsNextAction: true });
    expect(review.waiting).toHaveLength(1);
    expect(review.scheduledNextTwoWeeks).toHaveLength(1);
    expect(review.staleTasks.map((task) => task.title)).toEqual(["Stale"]);
  });

  test("monthly incubator review separates ready items from future ideas", () => {
    const ready = createTask({ title: "Ready", status: "incubator", reviewAt: now }, now);
    const later = createTask({ title: "Later", status: "incubator", reviewAt: addDays(now, 10) }, now);

    expect(getMonthlyIncubatorReview(snapshot([ready, later]), now)).toMatchObject({
      ready: [ready],
      later: [later]
    });
  });
});
