import type { Project, Task, TaskDraft } from "./types";
import { PERSONAL_AREA_ID } from "./types";

const ACTIVE_LIMIT = 3;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTask(draft: TaskDraft, now = new Date()): Task {
  return {
    id: createId("task"),
    areaId: draft.areaId ?? PERSONAL_AREA_ID,
    projectId: draft.projectId ?? null,
    title: draft.title,
    notes: draft.notes ?? "",
    status: draft.status ?? "inbox",
    kind: draft.kind ?? "task",
    dueAt: draft.dueAt ?? null,
    deferUntil: draft.deferUntil ?? null,
    reviewAt: draft.reviewAt ?? null,
    recurrenceRule: draft.recurrenceRule ?? null,
    focus: draft.focus ?? false,
    energy: draft.energy ?? null,
    estimateMinutes: draft.estimateMinutes ?? null,
    waitingOn: draft.waitingOn ?? null,
    triggerCue: draft.triggerCue ?? null,
    triggerAction: draft.triggerAction ?? null,
    source: draft.source ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
}

export function isOpenTask(task: Task): boolean {
  return task.status !== "done" && task.status !== "canceled";
}

export function getProjectHealth(project: Project, tasks: Task[]) {
  const hasOpenNextAction = tasks.some(
    (task) =>
      task.projectId === project.id &&
      task.kind === "task" &&
      isOpenTask(task) &&
      (task.status === "next" || task.status === "active")
  );

  return {
    needsNextAction: project.status === "active" && !hasOpenNextAction
  };
}

export function getWipState(tasks: Task[], limit = ACTIVE_LIMIT) {
  const activeTasks = tasks.filter((task) => task.status === "active" && isOpenTask(task));
  const focusTask = activeTasks.find((task) => task.focus) ?? null;

  return {
    activeCount: activeTasks.length,
    limit,
    isOverLimit: activeTasks.length > limit,
    focusTask
  };
}

export function setSingleFocus(tasks: Task[], taskId: string, now = new Date()): Task[] {
  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task.focus ? { ...task, focus: false, updatedAt: now } : task;
    }

    return {
      ...task,
      status: "active",
      focus: true,
      updatedAt: now,
      completedAt: null
    };
  });
}

export function getRuleWarnings(task: Task): string[] {
  const warnings: string[] = [];

  if (task.status === "waiting" && !task.dueAt && !task.reviewAt) {
    warnings.push("Waiting items need a follow-up date or review date.");
  }

  if (task.status === "scheduled" && !task.dueAt) {
    warnings.push("Scheduled items need a due date.");
  }

  if (task.status === "incubator" && !task.reviewAt) {
    warnings.push("Incubator items need a review date.");
  }

  if (task.focus && task.status !== "active") {
    warnings.push("Only active tasks can be focus items.");
  }

  return warnings;
}
