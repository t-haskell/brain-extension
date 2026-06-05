import { Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AreaId, Energy, Task, TaskKind, TaskStatus } from "../domain/types";
import { formatDateTimeInput, parseDateTimeInput } from "../ui/date";
import { useBrain } from "../store/BrainStore";
import { useSettings } from "../store/SettingsStore";
import { AreaBadge, StatusBadge } from "./Badge";
import { DateTimeField } from "./DateTimeField";

const statuses: TaskStatus[] = ["inbox", "next", "active", "waiting", "scheduled", "incubator", "done", "canceled"];
const kinds: TaskKind[] = ["task", "reminder", "reference"];
const energies: Array<Energy | ""> = ["", "low", "medium", "high"];

function formFromTask(task: Task, timeZone: string) {
  return {
    title: task.title,
    notes: task.notes,
    areaId: task.areaId,
    projectId: task.projectId ?? "",
    status: task.status,
    kind: task.kind,
    dueAt: formatDateTimeInput(task.dueAt, timeZone),
    deferUntil: formatDateTimeInput(task.deferUntil, timeZone),
    reviewAt: formatDateTimeInput(task.reviewAt, timeZone),
    recurrenceRule: task.recurrenceRule ?? "",
    focus: task.focus,
    energy: task.energy ?? "",
    estimateMinutes: task.estimateMinutes?.toString() ?? "",
    waitingOn: task.waitingOn ?? "",
    triggerCue: task.triggerCue ?? "",
    triggerAction: task.triggerAction ?? ""
  };
}

function formsEqual(left: ReturnType<typeof formFromTask>, right: ReturnType<typeof formFromTask>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function DetailPane() {
  const { selectedTask, selectTask, updateTask, snapshot } = useBrain();
  const { settings } = useSettings();
  const [form, setForm] = useState(selectedTask ? formFromTask(selectedTask, settings.timeZone) : null);
  const lastTaskRef = useRef<Task | null>(selectedTask);

  useEffect(() => {
    const previousTask = lastTaskRef.current;

    if (previousTask?.id === selectedTask?.id) {
      setForm(selectedTask ? formFromTask(selectedTask, settings.timeZone) : null);
      lastTaskRef.current = selectedTask;
      return;
    }

    if (previousTask && form && !formsEqual(form, formFromTask(previousTask, settings.timeZone))) {
      const discard = window.confirm("Discard unsaved detail changes?");
      if (!discard) {
        selectTask(previousTask.id);
        return;
      }
    }

    setForm(selectedTask ? formFromTask(selectedTask, settings.timeZone) : null);
    lastTaskRef.current = selectedTask;
  }, [selectTask, selectedTask, settings.timeZone]);

  const projectOptions = useMemo(
    () => snapshot.projects.filter((project) => project.status === "active" || project.status === "on_hold"),
    [snapshot.projects]
  );

  if (!selectedTask || !form) {
    return (
      <aside className="detail-pane empty" aria-label="Task details">
        <h2>Details</h2>
        <p>Select an item to edit notes, dates, project, reminders, and workflow state.</p>
      </aside>
    );
  }

  async function save() {
    if (!selectedTask || !form) {
      return;
    }

    await updateTask(selectedTask.id, {
      title: form.title.trim() || selectedTask.title,
      notes: form.notes,
      areaId: form.areaId as AreaId,
      projectId: form.projectId || null,
      status: form.status as TaskStatus,
      kind: form.kind as TaskKind,
      dueAt: parseDateTimeInput(form.dueAt, settings.timeZone),
      deferUntil: parseDateTimeInput(form.deferUntil, settings.timeZone),
      reviewAt: parseDateTimeInput(form.reviewAt, settings.timeZone),
      recurrenceRule: form.recurrenceRule.trim() || null,
      focus: form.focus,
      energy: form.energy ? (form.energy as Energy) : null,
      estimateMinutes: form.estimateMinutes ? Number(form.estimateMinutes) : null,
      waitingOn: form.waitingOn.trim() || null,
      triggerCue: form.triggerCue.trim() || null,
      triggerAction: form.triggerAction.trim() || null
    });
  }

  return (
    <aside className="detail-pane" aria-label="Task details">
      <div className="detail-title detail-header">
        <div>
          <h2>Details</h2>
          <p>Update the selected item. Status decides where it appears; dates decide when it resurfaces.</p>
          <div className="detail-summary">
            <AreaBadge areaId={selectedTask.areaId} />
            <StatusBadge status={selectedTask.status} />
          </div>
        </div>
        <button type="button" className="icon-button" onClick={() => selectTask(null)} title="Close details">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <section className="detail-section" aria-label="Item text">
        <h3>Item</h3>
        <label>
          Title
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label>
          Notes
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={4} />
        </label>
      </section>

      <section className="detail-section" aria-label="Workflow">
        <h3>Workflow</h3>
        <div className="detail-field-grid">
          <label>
            Area
            <select value={form.areaId} onChange={(event) => setForm({ ...form, areaId: event.target.value as AreaId })}>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as TaskKind })}>
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
              <option value="">None</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="detail-section" aria-label="Dates and resurfacing">
        <h3>Dates</h3>
        <div className="date-field-stack">
          <DateTimeField
            label="Due date"
            value={form.dueAt}
            timeZone={settings.timeZone}
            defaultTime={settings.defaultDueTime}
            onChange={(dueAt) => setForm({ ...form, dueAt })}
          />
          <DateTimeField
            label="Review / follow-up"
            value={form.reviewAt}
            timeZone={settings.timeZone}
            defaultTime={settings.defaultDueTime}
            onChange={(reviewAt) => setForm({ ...form, reviewAt })}
          />
          <DateTimeField
            label="Defer until date"
            value={form.deferUntil}
            timeZone={settings.timeZone}
            defaultTime={settings.defaultDueTime}
            onChange={(deferUntil) => setForm({ ...form, deferUntil })}
          />
        </div>
        <label>
          Recurrence
          <input
            value={form.recurrenceRule}
            onChange={(event) => setForm({ ...form, recurrenceRule: event.target.value })}
            placeholder="daily, weekly, monthly, RRULE:FREQ=WEEKLY"
          />
        </label>
      </section>

      <section className="detail-section" aria-label="Effort and focus">
        <h3>Effort</h3>
        <div className="detail-field-grid">
          <label>
            Energy
            <select value={form.energy} onChange={(event) => setForm({ ...form, energy: event.target.value as Energy | "" })}>
              {energies.map((energy) => (
                <option key={energy || "none"} value={energy}>
                  {energy || "Not set"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estimate
            <input
              type="number"
              min="0"
              value={form.estimateMinutes}
              onChange={(event) => setForm({ ...form, estimateMinutes: event.target.value })}
              placeholder="minutes"
            />
          </label>
        </div>
        <label className="inline-check">
          <input type="checkbox" checked={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.checked })} />
          Focus item
        </label>
      </section>

      <section className="detail-section" aria-label="Waiting and cue triggers">
        <h3>Context</h3>
        <label>
          Waiting on
          <input value={form.waitingOn} onChange={(event) => setForm({ ...form, waitingOn: event.target.value })} />
        </label>
        <label>
          Trigger cue
          <input value={form.triggerCue} onChange={(event) => setForm({ ...form, triggerCue: event.target.value })} />
        </label>
        <label>
          Trigger action
          <input value={form.triggerAction} onChange={(event) => setForm({ ...form, triggerAction: event.target.value })} />
        </label>
      </section>

      <div className="detail-save-bar">
        <button type="button" className="primary-button full" onClick={save} data-testid="save-task">
          <Save size={16} aria-hidden="true" />
          Save changes
        </button>
      </div>
    </aside>
  );
}
