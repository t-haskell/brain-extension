import { describe, expect, test } from "vitest";
import { createTask } from "../../src/domain/rules";
import { exportBrainToJson, exportTasksAndProjectsToCsv, importBrainFromJson } from "../../src/domain/export";
import type { BrainSnapshot, Project } from "../../src/domain/types";

const now = new Date("2026-04-29T12:00:00");

describe("import and export", () => {
  test("round-trips the complete local data model through JSON with dates preserved", () => {
    const project: Project = {
      id: "project-1",
      areaId: "work",
      title: "Prepare retail architecture memo",
      outcome: "Memo ready",
      status: "active",
      reviewAt: now,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    const snapshot: BrainSnapshot = {
      areas: [
        { id: "work", name: "Work", archived: false },
        { id: "personal", name: "Personal", archived: false }
      ],
      projects: [project],
      tasks: [createTask({ title: "Draft outline", status: "next", projectId: project.id, areaId: "work" }, now)]
    };

    const imported = importBrainFromJson(exportBrainToJson(snapshot));

    expect(imported).toMatchObject({
      areas: snapshot.areas,
      projects: [{ id: "project-1", title: "Prepare retail architecture memo" }],
      tasks: [{ title: "Draft outline", status: "next" }]
    });
    expect(imported.projects[0].createdAt).toBeInstanceOf(Date);
    expect(imported.tasks[0].createdAt.toISOString()).toBe(now.toISOString());
  });

  test("exports tasks and projects to a simple audit-friendly CSV", () => {
    const snapshot: BrainSnapshot = {
      areas: [{ id: "work", name: "Work", archived: false }],
      projects: [],
      tasks: [createTask({ title: "Draft outline", status: "next", areaId: "work" }, now)]
    };

    expect(exportTasksAndProjectsToCsv(snapshot)).toContain("type,id,area,status,title");
    expect(exportTasksAndProjectsToCsv(snapshot)).toContain("task,");
    expect(exportTasksAndProjectsToCsv(snapshot)).toContain("Draft outline");
  });

  test("rejects imports with invalid task workflow values", () => {
    const json = JSON.stringify({
      areas: [{ id: "work", name: "Work", archived: false }],
      projects: [],
      tasks: [
        {
          ...createTask({ title: "Draft outline", status: "next", areaId: "work" }, now),
          status: "almost_done"
        }
      ]
    });

    expect(() => importBrainFromJson(json)).toThrow("Invalid task status in import.");
  });

  test("rejects imports with invalid date values", () => {
    const json = JSON.stringify({
      areas: [{ id: "work", name: "Work", archived: false }],
      projects: [],
      tasks: [
        {
          ...createTask({ title: "Draft outline", status: "next", areaId: "work" }, now),
          createdAt: "not-a-date"
        }
      ]
    });

    expect(() => importBrainFromJson(json)).toThrow("Invalid date value in import.");
  });
});
