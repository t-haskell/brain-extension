import { addDays, addMonths } from "date-fns";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { importBrainFromJson, exportBrainToJson, exportTasksAndProjectsToCsv } from "../domain/export";
import { completeTaskWithRecurrence } from "../domain/recurrence";
import { createTask, setSingleFocus } from "../domain/rules";
import type { AreaId, BrainSnapshot, Project, ProjectDraft, Task, TaskDraft } from "../domain/types";
import { parseQuickCapture } from "../domain/capture";
import {
  ensureSeeded,
  loadSnapshot,
  putProject,
  putProjectWithTasks,
  putTask,
  putTasks,
  replaceSnapshot,
  resetDemoData
} from "../persistence/db";

interface BrainContextValue {
  snapshot: BrainSnapshot;
  isLoaded: boolean;
  selectedTask: Task | null;
  selectTask(id: string | null): void;
  captureQuickCapture(input: string): Promise<Task | null>;
  addTask(draft: TaskDraft): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  bulkUpdateTasks(ids: string[], patch: Partial<Task>): Promise<void>;
  completeTask(id: string): Promise<void>;
  setFocusTask(id: string): Promise<void>;
  createProject(draft: ProjectDraft, nextActionTitle?: string): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<void>;
  createProjectFromTask(taskId: string): Promise<void>;
  exportJson(): string;
  exportCsv(): string;
  importJson(json: string): Promise<void>;
  resetDemo(): Promise<void>;
}

const emptySnapshot: BrainSnapshot = {
  areas: [],
  projects: [],
  tasks: []
};

const BrainContext = createContext<BrainContextValue | null>(null);

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTaskUpdate(task: Task, patch: Partial<Task>, now: Date): Task {
  const updated: Task = {
    ...task,
    ...patch,
    updatedAt: now
  };

  if (updated.status !== "active") {
    updated.focus = false;
  }

  if (patch.status === "waiting" && !updated.reviewAt && !updated.dueAt) {
    updated.reviewAt = addDays(now, 3);
  }

  if (patch.status === "incubator" && !updated.reviewAt) {
    updated.reviewAt = addMonths(now, 1);
    updated.kind = updated.kind === "task" ? "reference" : updated.kind;
  }

  if (patch.status === "scheduled" && !updated.dueAt) {
    updated.dueAt = addDays(now, 1);
  }

  if (patch.status === "done" || patch.status === "canceled") {
    updated.completedAt = now;
    updated.focus = false;
  }

  if (patch.status && patch.status !== "done" && patch.status !== "canceled") {
    updated.completedAt = null;
  }

  return updated;
}

function normalizeProjectUpdate(project: Project, patch: Partial<Project>, now: Date): Project {
  const updated: Project = {
    ...project,
    ...patch,
    updatedAt: now
  };

  if (patch.status === "done" || patch.status === "canceled") {
    updated.completedAt = now;
  }

  if (patch.status === "active" || patch.status === "on_hold") {
    updated.completedAt = null;
  }

  return updated;
}

function createProjectRecord(draft: ProjectDraft, now: Date): Project {
  return {
    id: createId("project"),
    areaId: draft.areaId,
    title: draft.title,
    outcome: draft.outcome,
    status: "active",
    reviewAt: draft.reviewAt ?? addDays(now, 7),
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
}

export function BrainProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<BrainSnapshot>(emptySnapshot);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);

  const publishSnapshot = useCallback((next: BrainSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const replaceAll = useCallback(async (next: BrainSnapshot) => {
    publishSnapshot(next);
    await replaceSnapshot(next);
  }, [publishSnapshot]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      await ensureSeeded();
      const loaded = await loadSnapshot();
      if (!isMounted) {
        return;
      }
      snapshotRef.current = loaded;
      setSnapshot(loaded);
      setIsLoaded(true);
    }

    load().catch((error) => {
      console.error("Failed to load local data", error);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const addTask = useCallback(
    async (draft: TaskDraft) => {
      const now = new Date();
      const created = createTask(draft, now);
      const task =
        created.status === "incubator" && !created.reviewAt
          ? normalizeTaskUpdate(created, { status: "incubator" }, now)
          : created;
      const next = { ...snapshotRef.current, tasks: [...snapshotRef.current.tasks, task] };
      publishSnapshot(next);
      await putTask(task);
      return task;
    },
    [publishSnapshot]
  );

  const captureQuickCapture = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      return addTask(parseQuickCapture(trimmed, new Date()));
    },
    [addTask]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const now = new Date();
      const current = snapshotRef.current;
      let tasks = current.tasks.map((task) => (task.id === id ? normalizeTaskUpdate(task, patch, now) : task));

      if (patch.focus) {
        tasks = setSingleFocus(tasks, id, now);
      }

      const changedTasks = tasks.filter((task, index) => task !== current.tasks[index]);
      publishSnapshot({ ...current, tasks });
      await putTasks(changedTasks);
    },
    [publishSnapshot]
  );

  const bulkUpdateTasks = useCallback(
    async (ids: string[], patch: Partial<Task>) => {
      const idSet = new Set(ids);
      const now = new Date();
      const current = snapshotRef.current;
      const tasks = current.tasks.map((task) => (idSet.has(task.id) ? normalizeTaskUpdate(task, patch, now) : task));
      const changedTasks = tasks.filter((task, index) => task !== current.tasks[index]);
      publishSnapshot({ ...current, tasks });
      await putTasks(changedTasks);
    },
    [publishSnapshot]
  );

  const completeTask = useCallback(
    async (id: string) => {
      const now = new Date();
      const existing = snapshotRef.current.tasks.find((task) => task.id === id);
      if (!existing) {
        return;
      }
      const replacements = completeTaskWithRecurrence(existing, now);
      const current = snapshotRef.current;
      const tasks = current.tasks.flatMap((task) => (task.id === id ? replacements : [task]));
      publishSnapshot({ ...current, tasks });
      await putTasks(replacements);
    },
    [publishSnapshot]
  );

  const setFocusTask = useCallback(
    async (id: string) => {
      const current = snapshotRef.current;
      const tasks = setSingleFocus(current.tasks, id, new Date());
      const changedTasks = tasks.filter((task, index) => task !== current.tasks[index]);
      publishSnapshot({ ...current, tasks });
      await putTasks(changedTasks);
    },
    [publishSnapshot]
  );

  const createProject = useCallback(
    async (draft: ProjectDraft, nextActionTitle?: string) => {
      const now = new Date();
      const project = createProjectRecord(draft, now);
      const current = snapshotRef.current;
      const createdTasks: Task[] = [];
      const tasks = [...current.tasks];

      if (nextActionTitle?.trim()) {
        const task = createTask(
          {
            title: nextActionTitle.trim(),
            areaId: draft.areaId,
            projectId: project.id,
            status: "next"
          },
          now
        );
        createdTasks.push(task);
        tasks.push(task);
      }

      publishSnapshot({ ...current, projects: [...current.projects, project], tasks });
      await putProjectWithTasks(project, createdTasks);
      return project;
    },
    [publishSnapshot]
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<Project>) => {
      const now = new Date();
      const current = snapshotRef.current;
      let changedProject: Project | null = null;
      const projects = current.projects.map((project) => {
        if (project.id !== id) {
          return project;
        }

        changedProject = normalizeProjectUpdate(project, patch, now);
        return changedProject;
      });

      if (!changedProject) {
        return;
      }

      publishSnapshot({ ...current, projects });
      await putProject(changedProject);
    },
    [publishSnapshot]
  );

  const createProjectFromTask = useCallback(
    async (taskId: string) => {
      const current = snapshotRef.current;
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      const now = new Date();
      const project = createProjectRecord({
        areaId: task.areaId,
        title: task.title,
        outcome: task.notes || `Decide and define the outcome for ${task.title}.`
      }, now);
      const updatedTask = normalizeTaskUpdate(task, {
        projectId: project.id,
        status: "next",
        kind: "task",
        reviewAt: null
      }, now);
      const tasks = current.tasks.map((item) => (item.id === taskId ? updatedTask : item));

      publishSnapshot({ ...current, projects: [...current.projects, project], tasks });
      await putProjectWithTasks(project, [updatedTask]);
    },
    [publishSnapshot]
  );

  const importJson = useCallback(
    async (json: string) => {
      const imported = importBrainFromJson(json);
      await replaceAll(imported);
      setSelectedTaskId(null);
    },
    [replaceAll]
  );

  const resetDemo = useCallback(async () => {
    const next = await resetDemoData();
    snapshotRef.current = next;
    setSnapshot(next);
    setSelectedTaskId(null);
  }, []);

  const selectedTask = useMemo(
    () => snapshot.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, snapshot.tasks]
  );

  const value = useMemo<BrainContextValue>(
    () => ({
      snapshot,
      isLoaded,
      selectedTask,
      selectTask: setSelectedTaskId,
      captureQuickCapture,
      addTask,
      updateTask,
      bulkUpdateTasks,
      completeTask,
      setFocusTask,
      createProject,
      updateProject,
      createProjectFromTask,
      exportJson: () => exportBrainToJson(snapshotRef.current),
      exportCsv: () => exportTasksAndProjectsToCsv(snapshotRef.current),
      importJson,
      resetDemo
    }),
    [
      addTask,
      bulkUpdateTasks,
      captureQuickCapture,
      completeTask,
      createProject,
      createProjectFromTask,
      importJson,
      isLoaded,
      resetDemo,
      selectedTask,
      setFocusTask,
      snapshot,
      updateProject,
      updateTask
    ]
  );

  return <BrainContext.Provider value={value}>{children}</BrainContext.Provider>;
}

export function useBrain(): BrainContextValue {
  const context = useContext(BrainContext);
  if (!context) {
    throw new Error("useBrain must be used inside BrainProvider.");
  }
  return context;
}
