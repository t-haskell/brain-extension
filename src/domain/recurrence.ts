import type { Task } from "./types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getNextRecurrenceDate(rule: string, baseDate: Date): Date | null {
  const normalized = rule.trim().toLowerCase();
  const intervalMatch = normalized.match(/interval=(\d+)/);
  const interval = intervalMatch ? Number(intervalMatch[1]) : 1;

  if (normalized === "daily" || normalized.includes("freq=daily")) {
    return addDays(baseDate, interval);
  }

  if (normalized === "weekly" || normalized.includes("freq=weekly")) {
    return addWeeks(baseDate, interval);
  }

  if (normalized === "monthly" || normalized.includes("freq=monthly")) {
    return addMonths(baseDate, interval);
  }

  if (normalized === "yearly" || normalized.includes("freq=yearly")) {
    return addYears(baseDate, interval);
  }

  return null;
}

export function completeTaskWithRecurrence(task: Task, now = new Date()): Task[] {
  const completed: Task = {
    ...task,
    status: "done",
    focus: false,
    updatedAt: now,
    completedAt: now
  };

  if (!task.recurrenceRule) {
    return [completed];
  }

  const recurrenceBase = task.dueAt ?? task.deferUntil ?? task.reviewAt ?? now;
  const nextDate = getNextRecurrenceDate(task.recurrenceRule, recurrenceBase);

  if (!nextDate) {
    return [completed];
  }

  const next: Task = {
    ...task,
    id: createId(),
    status: task.dueAt ? "scheduled" : "next",
    dueAt: task.dueAt ? nextDate : null,
    deferUntil: task.deferUntil ? nextDate : null,
    reviewAt: task.reviewAt ? nextDate : null,
    focus: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  return [completed, next];
}
