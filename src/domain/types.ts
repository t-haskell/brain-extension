export const WORK_AREA_ID = "work";
export const PERSONAL_AREA_ID = "personal";

export type AreaId = typeof WORK_AREA_ID | typeof PERSONAL_AREA_ID;

export interface Area {
  id: AreaId;
  name: "Work" | "Personal";
  archived: boolean;
}

export type ProjectStatus = "active" | "on_hold" | "done" | "canceled";

export interface Project {
  id: string;
  areaId: AreaId;
  title: string;
  outcome: string;
  status: ProjectStatus;
  reviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export type TaskStatus =
  | "inbox"
  | "next"
  | "active"
  | "waiting"
  | "scheduled"
  | "incubator"
  | "done"
  | "canceled";

export type TaskKind = "task" | "reminder" | "reference";
export type Energy = "low" | "medium" | "high";

export interface Task {
  id: string;
  areaId: AreaId;
  projectId: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  kind: TaskKind;
  dueAt: Date | null;
  deferUntil: Date | null;
  reviewAt: Date | null;
  recurrenceRule: string | null;
  focus: boolean;
  energy: Energy | null;
  estimateMinutes: number | null;
  waitingOn: string | null;
  triggerCue: string | null;
  triggerAction: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface BrainSnapshot {
  areas: Area[];
  projects: Project[];
  tasks: Task[];
}

export interface TaskDraft {
  areaId?: AreaId;
  projectId?: string | null;
  title: string;
  notes?: string;
  status?: TaskStatus;
  kind?: TaskKind;
  dueAt?: Date | null;
  deferUntil?: Date | null;
  reviewAt?: Date | null;
  recurrenceRule?: string | null;
  focus?: boolean;
  energy?: Energy | null;
  estimateMinutes?: number | null;
  waitingOn?: string | null;
  triggerCue?: string | null;
  triggerAction?: string | null;
  source?: string | null;
}

export interface ProjectDraft {
  areaId: AreaId;
  title: string;
  outcome: string;
  reviewAt?: Date | null;
}
