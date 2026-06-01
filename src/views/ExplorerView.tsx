import { useMemo, useState } from "react";
import { isAfter, isBefore, addDays, endOfDay } from "date-fns";
import type { AreaId, TaskStatus } from "../domain/types";
import { ImportExportPanel } from "../components/ImportExportPanel";
import { TaskCard } from "../components/TaskCard";
import { useBrain } from "../store/BrainStore";

const allStatuses: Array<TaskStatus | "all"> = ["all", "inbox", "next", "active", "waiting", "scheduled", "incubator", "done", "canceled"];
const dueFilters = ["all", "overdue", "next14", "no-date"] as const;

export function ExplorerView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const [text, setText] = useState("");
  const [area, setArea] = useState<AreaId | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [dueFilter, setDueFilter] = useState<(typeof dueFilters)[number]>("all");
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));

  const filtered = useMemo(() => {
    const query = text.trim().toLowerCase();
    const today = endOfDay(new Date());
    const next14 = endOfDay(addDays(new Date(), 14));

    return snapshot.tasks.filter((task) => {
      const matchesText =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.notes.toLowerCase().includes(query) ||
        task.waitingOn?.toLowerCase().includes(query);
      const matchesArea = area === "all" || task.areaId === area;
      const matchesStatus = status === "all" || task.status === status;
      const matchesProject = projectId === "all" || task.projectId === projectId;
      const relevantDate = task.dueAt ?? task.reviewAt;
      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "overdue" && relevantDate && isBefore(relevantDate, today)) ||
        (dueFilter === "next14" && relevantDate && isAfter(relevantDate, new Date()) && isBefore(relevantDate, next14)) ||
        (dueFilter === "no-date" && !relevantDate);

      return matchesText && matchesArea && matchesStatus && matchesProject && matchesDue;
    });
  }, [area, dueFilter, projectId, snapshot.tasks, status, text]);

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Audit and ownership</p>
          <h2>Search / Explorer</h2>
        </div>
        <p>The true all-items view for search, export, and recovery.</p>
      </header>
      <section className="filter-bar">
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Search text" aria-label="Search text" />
        <select value={area} onChange={(event) => setArea(event.target.value as AreaId | "all")} aria-label="Filter by area">
          <option value="all">All areas</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "all")} aria-label="Filter by status">
          {allStatuses.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All statuses" : item.replace("_", " ")}
            </option>
          ))}
        </select>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter by project">
          <option value="all">All projects</option>
          {snapshot.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value as typeof dueFilter)} aria-label="Filter by date">
          <option value="all">All dates</option>
          <option value="overdue">Overdue/review due</option>
          <option value="next14">Next 14 days</option>
          <option value="no-date">No date</option>
        </select>
      </section>
      <div className="task-list">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            project={task.projectId ? projectById.get(task.projectId) : undefined}
            selected={selectedTask?.id === task.id}
            onOpen={() => selectTask(task.id)}
            onComplete={() => completeTask(task.id)}
            onFocus={() => setFocusTask(task.id)}
            onStatus={(_, nextStatus) => updateTask(task.id, { status: nextStatus })}
          />
        ))}
      </div>
      <ImportExportPanel />
    </div>
  );
}
