import { Eraser, ListChecks, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAfter, isBefore, addDays, endOfDay } from "date-fns";
import type { AreaId, Task, TaskKind, TaskStatus } from "../domain/types";
import { ImportExportPanel } from "../components/ImportExportPanel";
import { TaskCard } from "../components/TaskCard";
import { useBrain } from "../store/BrainStore";
import { useSettings } from "../store/SettingsStore";

const unchangedValue = "__unchanged";
const noProjectValue = "__none";
const taskStatuses: TaskStatus[] = ["inbox", "next", "active", "waiting", "scheduled", "incubator", "done", "canceled"];
const taskKinds: TaskKind[] = ["task", "reminder", "reference"];
const allStatuses: Array<TaskStatus | "all"> = ["all", ...taskStatuses];
const dueFilters = ["all", "overdue", "next14", "no-date"] as const;

type BulkAreaValue = AreaId | typeof unchangedValue;
type BulkStatusValue = TaskStatus | typeof unchangedValue;
type BulkKindValue = TaskKind | typeof unchangedValue;
type BulkProjectValue = string | typeof unchangedValue | typeof noProjectValue;

export function ExplorerView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, bulkUpdateTasks, selectedTask } = useBrain();
  const { settings } = useSettings();
  const [text, setText] = useState("");
  const [area, setArea] = useState<AreaId | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [dueFilter, setDueFilter] = useState<(typeof dueFilters)[number]>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAreaId, setBulkAreaId] = useState<BulkAreaValue>(unchangedValue);
  const [bulkStatus, setBulkStatus] = useState<BulkStatusValue>(unchangedValue);
  const [bulkKind, setBulkKind] = useState<BulkKindValue>(unchangedValue);
  const [bulkProjectId, setBulkProjectId] = useState<BulkProjectValue>(unchangedValue);
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const projectOptions = snapshot.projects.filter((project) => project.status === "active" || project.status === "on_hold");

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

  const selectedCount = selectedIds.length;
  const hasBulkPatch =
    bulkAreaId !== unchangedValue ||
    bulkStatus !== unchangedValue ||
    bulkKind !== unchangedValue ||
    bulkProjectId !== unchangedValue;

  useEffect(() => {
    const filteredIds = new Set(filtered.map((task) => task.id));
    setSelectedIds((ids) => ids.filter((id) => filteredIds.has(id)));
  }, [filtered]);

  function toggleTask(id: string, checked: boolean) {
    setSelectedIds((ids) => {
      if (checked) {
        return ids.includes(id) ? ids : [...ids, id];
      }

      return ids.filter((item) => item !== id);
    });
  }

  function selectAllShown() {
    setSelectedIds(filtered.map((task) => task.id));
  }

  function resetBulkFields() {
    setBulkAreaId(unchangedValue);
    setBulkStatus(unchangedValue);
    setBulkKind(unchangedValue);
    setBulkProjectId(unchangedValue);
  }

  async function applyBulkEdit() {
    const patch: Partial<Task> = {};

    if (bulkAreaId !== unchangedValue) {
      patch.areaId = bulkAreaId;
    }

    if (bulkStatus !== unchangedValue) {
      patch.status = bulkStatus;
    }

    if (bulkKind !== unchangedValue) {
      patch.kind = bulkKind;
    }

    if (bulkProjectId === noProjectValue) {
      patch.projectId = null;
    } else if (bulkProjectId !== unchangedValue) {
      patch.projectId = bulkProjectId;
    }

    if (selectedIds.length === 0 || Object.keys(patch).length === 0) {
      return;
    }

    await bulkUpdateTasks(selectedIds, patch);
    setSelectedIds([]);
    resetBulkFields();
  }

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
      <section className="bulk-edit-bar" aria-label="Bulk task edit">
        <div className="bulk-edit-summary">
          <strong>{selectedCount} selected</strong>
          <span>{filtered.length} shown</span>
          <div className="button-row compact">
            <button type="button" onClick={selectAllShown} disabled={filtered.length === 0}>
              <ListChecks size={15} aria-hidden="true" />
              Select all shown
            </button>
            <button type="button" onClick={() => setSelectedIds([])} disabled={selectedCount === 0}>
              <Eraser size={15} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
        <label>
          Area
          <select
            value={bulkAreaId}
            onChange={(event) => setBulkAreaId(event.target.value as BulkAreaValue)}
            data-testid="bulk-edit-area"
          >
            <option value={unchangedValue}>Area unchanged</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as BulkStatusValue)}
            data-testid="bulk-edit-status"
          >
            <option value={unchangedValue}>Status unchanged</option>
            {taskStatuses.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind
          <select
            value={bulkKind}
            onChange={(event) => setBulkKind(event.target.value as BulkKindValue)}
            data-testid="bulk-edit-kind"
          >
            <option value={unchangedValue}>Kind unchanged</option>
            {taskKinds.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Project
          <select
            value={bulkProjectId}
            onChange={(event) => setBulkProjectId(event.target.value as BulkProjectValue)}
            data-testid="bulk-edit-project"
          >
            <option value={unchangedValue}>Project unchanged</option>
            <option value={noProjectValue}>No project</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          onClick={applyBulkEdit}
          disabled={selectedCount === 0 || !hasBulkPatch}
          data-testid="apply-bulk-edit"
        >
          <Save size={16} aria-hidden="true" />
          Apply changes
        </button>
      </section>
      <div className="task-list">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            project={task.projectId ? projectById.get(task.projectId) : undefined}
            selected={selectedTask?.id === task.id}
            selectable
            checked={selectedIds.includes(task.id)}
            timeZone={settings.timeZone}
            onCheckedChange={(checked) => toggleTask(task.id, checked)}
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
