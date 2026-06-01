import { useMemo, useState } from "react";
import type { AreaId, TaskStatus } from "../domain/types";
import { useBrain } from "../store/BrainStore";
import { TaskCard } from "../components/TaskCard";

const statuses: TaskStatus[] = ["next", "active", "waiting", "scheduled", "incubator", "done", "canceled"];

export function InboxView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, bulkUpdateTasks, selectedTask } = useBrain();
  const inboxTasks = useMemo(() => snapshot.tasks.filter((task) => task.status === "inbox"), [snapshot.tasks]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [areaId, setAreaId] = useState<AreaId>("personal");
  const [status, setStatus] = useState<TaskStatus>("next");

  function toggleTask(id: string, checked: boolean) {
    setSelectedIds((ids) => (checked ? [...ids, id] : ids.filter((item) => item !== id)));
  }

  async function applyBulkTriage() {
    await bulkUpdateTasks(selectedIds, { areaId, status });
    setSelectedIds([]);
  }

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Capture drain</p>
          <h2>Inbox</h2>
        </div>
        <p>Make lightweight decisions. Do not solve everything here.</p>
      </header>
      <section className="triage-bar">
        <span>{selectedIds.length} selected</span>
        <label>
          Area
          <select value={areaId} onChange={(event) => setAreaId(event.target.value as AreaId)} data-testid="bulk-area">
            <option value="personal">Personal</option>
            <option value="work">Work</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} data-testid="bulk-status">
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={applyBulkTriage} disabled={selectedIds.length === 0} data-testid="apply-triage">
          Apply triage
        </button>
      </section>
      {inboxTasks.length === 0 ? (
        <div className="empty-state">Inbox is clear.</div>
      ) : (
        <div className="task-list">
          {inboxTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedTask?.id === task.id}
              selectable
              checked={selectedIds.includes(task.id)}
              onCheckedChange={(checked) => toggleTask(task.id, checked)}
              onOpen={() => selectTask(task.id)}
              onComplete={() => completeTask(task.id)}
              onFocus={() => setFocusTask(task.id)}
              onStatus={(_, nextStatus) => updateTask(task.id, { status: nextStatus })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
