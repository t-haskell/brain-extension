import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import "dexie-cloud-addon";
import type { Area, AreaId, BrainSnapshot, Project, Task } from "../domain/types";
import { createDemoSnapshot } from "../domain/seed";

interface MetaRow {
  key: string;
  value: string;
}

class CommandDb extends Dexie {
  areas!: Table<Area, AreaId>;
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("local-first-command", { addons: [dexieCloud] });

    this.version(1).stores({
      areas: "id, archived",
      projects: "id, areaId, status, reviewAt",
      tasks: "id, areaId, projectId, status, dueAt, reviewAt, focus, updatedAt",
      meta: "key"
    });
  }
}

export const db = new CommandDb();

export const dexieCloudDatabaseUrl = import.meta.env.VITE_DEXIE_CLOUD_DB_URL?.trim() ?? "";

if (dexieCloudDatabaseUrl) {
  db.cloud.configure({
    databaseUrl: dexieCloudDatabaseUrl,
    requireAuth: false,
    tryUseServiceWorker: false,
    nameSuffix: false,
    unsyncedTables: ["meta"],
    socialAuth: false
  });
}

export function isDexieCloudConfigured(): boolean {
  return Boolean(dexieCloudDatabaseUrl);
}

export async function loadSnapshot(): Promise<BrainSnapshot> {
  const [areas, projects, tasks] = await Promise.all([
    db.areas.toArray(),
    db.projects.toArray(),
    db.tasks.toArray()
  ]);

  return { areas, projects, tasks };
}

export async function replaceSnapshot(snapshot: BrainSnapshot): Promise<void> {
  await db.transaction("rw", db.areas, db.projects, db.tasks, db.meta, async () => {
    await Promise.all([db.areas.clear(), db.projects.clear(), db.tasks.clear()]);
    await Promise.all([db.areas.bulkPut(snapshot.areas), db.projects.bulkPut(snapshot.projects), db.tasks.bulkPut(snapshot.tasks)]);
    await db.meta.put({ key: "seeded", value: "true" });
  });
}

export async function putTask(task: Task): Promise<void> {
  await db.tasks.put(task);
}

export async function putTasks(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) {
    return;
  }

  await db.tasks.bulkPut(tasks);
}

export async function putProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

export async function putProjectWithTasks(project: Project, tasks: Task[]): Promise<void> {
  await db.transaction("rw", db.projects, db.tasks, async () => {
    await db.projects.put(project);

    if (tasks.length > 0) {
      await db.tasks.bulkPut(tasks);
    }
  });
}

export async function putProjects(projects: Project[]): Promise<void> {
  if (projects.length === 0) {
    return;
  }

  await db.projects.bulkPut(projects);
}

export async function ensureSeeded(now = new Date()): Promise<void> {
  const seeded = await db.meta.get("seeded");
  const areaCount = await db.areas.count();

  if (seeded && areaCount > 0) {
    return;
  }

  await replaceSnapshot(createDemoSnapshot(now));
}

export async function resetDemoData(now = new Date()): Promise<BrainSnapshot> {
  const snapshot = createDemoSnapshot(now);
  await replaceSnapshot(snapshot);
  return snapshot;
}
