import type { Area, AreaId, BrainSnapshot, Energy, ProjectStatus, TaskKind, TaskStatus } from "./types";

const AREA_IDS = new Set<AreaId>(["work", "personal"]);
const AREA_NAMES = new Set<Area["name"]>(["Work", "Personal"]);
const PROJECT_STATUSES = new Set<ProjectStatus>(["active", "on_hold", "done", "canceled"]);
const TASK_STATUSES = new Set<TaskStatus>(["inbox", "next", "active", "waiting", "scheduled", "incubator", "done", "canceled"]);
const TASK_KINDS = new Set<TaskKind>(["task", "reminder", "reference"]);
const ENERGIES = new Set<Energy>(["low", "medium", "high"]);

interface ExportEnvelope {
  app: "local-first-command";
  version: 1;
  exportedAt: string;
  data: BrainSnapshot;
}

function reviveDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value in import.");
    }
    return date;
  }

  throw new Error("Invalid date value in import.");
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
}

function requireEnum<T extends string>(value: unknown, allowed: Set<T>, message: string): T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(message);
  }

  return value as T;
}

export function exportBrainToJson(snapshot: BrainSnapshot): string {
  const envelope: ExportEnvelope = {
    app: "local-first-command",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: snapshot
  };

  return JSON.stringify(envelope, null, 2);
}

export function importBrainFromJson(json: string): BrainSnapshot {
  const parsed = JSON.parse(json) as ExportEnvelope | BrainSnapshot;
  const data = "data" in parsed ? parsed.data : parsed;

  if (!Array.isArray(data.areas) || !Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
    throw new Error("Import must contain areas, projects, and tasks arrays.");
  }

  return {
    areas: data.areas.map((area) => ({
      ...area,
      id: requireEnum(area.id, AREA_IDS, "Invalid area id in import."),
      name: requireEnum(area.name, AREA_NAMES, "Invalid area name in import."),
      archived: Boolean(area.archived)
    })),
    projects: data.projects.map((project) => ({
      ...project,
      id: requireString(project.id, "Invalid project id in import."),
      areaId: requireEnum(project.areaId, AREA_IDS, "Invalid project area in import."),
      title: requireString(project.title, "Invalid project title in import."),
      outcome: typeof project.outcome === "string" ? project.outcome : "",
      status: requireEnum(project.status, PROJECT_STATUSES, "Invalid project status in import."),
      reviewAt: reviveDate(project.reviewAt),
      createdAt: reviveDate(project.createdAt) ?? new Date(),
      updatedAt: reviveDate(project.updatedAt) ?? new Date(),
      completedAt: reviveDate(project.completedAt)
    })),
    tasks: data.tasks.map((task) => ({
      ...task,
      id: requireString(task.id, "Invalid task id in import."),
      areaId: requireEnum(task.areaId, AREA_IDS, "Invalid task area in import."),
      projectId: task.projectId === null || typeof task.projectId === "string" ? task.projectId : null,
      title: requireString(task.title, "Invalid task title in import."),
      notes: typeof task.notes === "string" ? task.notes : "",
      status: requireEnum(task.status, TASK_STATUSES, "Invalid task status in import."),
      kind: requireEnum(task.kind, TASK_KINDS, "Invalid task kind in import."),
      dueAt: reviveDate(task.dueAt),
      deferUntil: reviveDate(task.deferUntil),
      reviewAt: reviveDate(task.reviewAt),
      recurrenceRule: task.recurrenceRule === null || typeof task.recurrenceRule === "string" ? task.recurrenceRule : null,
      focus: Boolean(task.focus),
      energy: task.energy === null ? null : requireEnum(task.energy, ENERGIES, "Invalid task energy in import."),
      estimateMinutes: typeof task.estimateMinutes === "number" ? task.estimateMinutes : null,
      waitingOn: task.waitingOn === null || typeof task.waitingOn === "string" ? task.waitingOn : null,
      triggerCue: task.triggerCue === null || typeof task.triggerCue === "string" ? task.triggerCue : null,
      triggerAction: task.triggerAction === null || typeof task.triggerAction === "string" ? task.triggerAction : null,
      source: task.source === null || typeof task.source === "string" ? task.source : null,
      createdAt: reviveDate(task.createdAt) ?? new Date(),
      updatedAt: reviveDate(task.updatedAt) ?? new Date(),
      completedAt: reviveDate(task.completedAt)
    }))
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function exportTasksAndProjectsToCsv(snapshot: BrainSnapshot): string {
  const rows = [["type", "id", "area", "status", "title", "projectId", "dueAt", "reviewAt"]];

  for (const project of snapshot.projects) {
    rows.push([
      "project",
      project.id,
      project.areaId,
      project.status,
      project.title,
      "",
      "",
      project.reviewAt?.toISOString() ?? ""
    ]);
  }

  for (const task of snapshot.tasks) {
    rows.push([
      "task",
      task.id,
      task.areaId,
      task.status,
      task.title,
      task.projectId ?? "",
      task.dueAt?.toISOString() ?? "",
      task.reviewAt?.toISOString() ?? ""
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
