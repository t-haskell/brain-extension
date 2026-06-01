import { addDays, endOfDay, isAfter, isBefore, isEqual, startOfDay, subDays } from "date-fns";
import { getProjectHealth, isOpenTask } from "./rules";
import type { AreaId, BrainSnapshot, Project, Task } from "./types";
import { PERSONAL_AREA_ID, WORK_AREA_ID } from "./types";

export interface CommandSection {
  id: string;
  title: string;
  description?: string;
  items: Task[];
}

function isOnOrBefore(value: Date | null, boundary: Date): boolean {
  return Boolean(value && (isBefore(value, boundary) || isEqual(value, boundary)));
}

function byDueOrCreated(a: Task, b: Task): number {
  const aTime = (a.dueAt ?? a.reviewAt ?? a.createdAt).getTime();
  const bTime = (b.dueAt ?? b.reviewAt ?? b.createdAt).getTime();
  return aTime - bTime;
}

function openTasks(snapshot: BrainSnapshot): Task[] {
  return snapshot.tasks.filter(isOpenTask);
}

export function getAreaLabel(areaId: AreaId): "Work" | "Personal" {
  return areaId === WORK_AREA_ID ? "Work" : "Personal";
}

export function getCommandSections(snapshot: BrainSnapshot, now = new Date()): CommandSection[] {
  const todayEnd = endOfDay(now);
  const soonEnd = endOfDay(addDays(now, 7));
  const tasks = openTasks(snapshot);

  const sections: CommandSection[] = [
    {
      id: "focus",
      title: "Focus",
      items: tasks.filter((task) => task.focus).sort(byDueOrCreated)
    },
    {
      id: "active-work",
      title: "Active Work",
      description: "The only work currently allowed to occupy execution bandwidth.",
      items: tasks.filter((task) => task.status === "active" && !task.focus).sort(byDueOrCreated)
    },
    {
      id: "due",
      title: "Due Today / Overdue",
      items: tasks
        .filter((task) => task.status !== "incubator" && task.dueAt && isOnOrBefore(task.dueAt, todayEnd))
        .sort(byDueOrCreated)
    },
    {
      id: "scheduled-soon",
      title: "Scheduled Soon",
      items: tasks
        .filter(
          (task) =>
            task.status === "scheduled" &&
            task.dueAt &&
            isAfter(task.dueAt, todayEnd) &&
            isOnOrBefore(task.dueAt, soonEnd)
        )
        .sort(byDueOrCreated)
    },
    {
      id: "work-next",
      title: "Work Next",
      items: tasks.filter((task) => task.areaId === WORK_AREA_ID && task.status === "next").sort(byDueOrCreated)
    },
    {
      id: "personal-next",
      title: "Personal Next",
      items: tasks.filter((task) => task.areaId === PERSONAL_AREA_ID && task.status === "next").sort(byDueOrCreated)
    },
    {
      id: "waiting-due",
      title: "Waiting Follow-ups Due",
      description: "Visible because the follow-up date has arrived or passed.",
      items: tasks
        .filter(
          (task) =>
            task.status === "waiting" &&
            (isOnOrBefore(task.reviewAt, todayEnd) || isOnOrBefore(task.dueAt, todayEnd))
        )
        .sort(byDueOrCreated)
    },
    {
      id: "incubator-ready",
      title: "Incubator Items Ready for Review",
      description: "Visible because the review date has arrived; future ideas stay out of active work.",
      items: tasks
        .filter((task) => task.status === "incubator" && isOnOrBefore(task.reviewAt, todayEnd))
        .sort(byDueOrCreated)
    }
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function getWeeklyReview(snapshot: BrainSnapshot, now = new Date()) {
  const twoWeeksEnd = endOfDay(addDays(now, 14));
  const staleBefore = subDays(startOfDay(now), 30);
  const tasks = openTasks(snapshot);

  return {
    inbox: tasks.filter((task) => task.status === "inbox").sort(byDueOrCreated),
    activeProjects: snapshot.projects
      .filter((project) => project.status === "active")
      .map((project) => ({ project, ...getProjectHealth(project, snapshot.tasks) })),
    waiting: tasks.filter((task) => task.status === "waiting").sort(byDueOrCreated),
    scheduledNextTwoWeeks: tasks
      .filter((task) => task.status === "scheduled" && task.dueAt && isOnOrBefore(task.dueAt, twoWeeksEnd))
      .sort(byDueOrCreated),
    staleTasks: tasks
      .filter((task) => task.status !== "incubator" && task.updatedAt < staleBefore)
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
  };
}

export function getMonthlyIncubatorReview(snapshot: BrainSnapshot, now = new Date()) {
  const todayEnd = endOfDay(now);
  const incubator = openTasks(snapshot).filter((task) => task.status === "incubator").sort(byDueOrCreated);

  return {
    ready: incubator.filter((task) => isOnOrBefore(task.reviewAt, todayEnd)),
    later: incubator.filter((task) => !isOnOrBefore(task.reviewAt, todayEnd))
  };
}
