import { CalendarDays, Check, CircleDot, Crosshair, MoreHorizontal, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Project, Task } from "../domain/types";
import { getRuleWarnings } from "../domain/rules";
import { formatDate } from "../ui/date";
import { AreaBadge, StatusBadge } from "./Badge";

interface TaskCardProps {
  task: Task;
  project?: Project;
  selected?: boolean;
  selectable?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onOpen(task: Task): void;
  onComplete(task: Task): void;
  onFocus(task: Task): void;
  onStatus(task: Task, status: Task["status"]): void | Promise<void>;
}

export function TaskCard({
  task,
  project,
  selected,
  selectable,
  checked,
  onCheckedChange,
  onOpen,
  onComplete,
  onFocus,
  onStatus
}: TaskCardProps) {
  const warnings = getRuleWarnings(task);
  const dateLabel = formatDate(task.dueAt ?? task.reviewAt ?? task.deferUntil);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function chooseStatus(status: Task["status"]) {
    await onStatus(task, status);
    setMenuOpen(false);
  }

  return (
    <article
      className={[
        "task-card",
        `area-card-${task.areaId}`,
        `status-card-${task.status}`,
        task.focus ? "focus-card" : "",
        selectable ? "selectable-card" : "",
        selected ? "selected" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`task-card-${task.id}`}
    >
      {selectable ? (
        <label className="task-checkbox">
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
            aria-label={`Select ${task.title}`}
          />
        </label>
      ) : null}
      <button className="task-body" type="button" onClick={() => onOpen(task)}>
        <span className="task-title-row">
          <span className="task-signal-dot" aria-hidden="true" />
          {task.focus ? <Crosshair size={16} aria-label="Focus item" /> : null}
          <span className="task-title">{task.title}</span>
        </span>
        <span className="task-meta">
          <AreaBadge areaId={task.areaId} />
          <StatusBadge status={task.status} />
          {project ? <span className="badge neutral">{project.title}</span> : null}
          {dateLabel ? (
            <span className="badge neutral">
              <CalendarDays size={13} aria-hidden="true" />
              {dateLabel}
            </span>
          ) : null}
          {task.waitingOn ? <span className="badge neutral">Waiting on {task.waitingOn}</span> : null}
          {task.triggerCue ? <span className="badge neutral">If {task.triggerCue}</span> : null}
        </span>
        {warnings.length > 0 ? <span className="task-warning">{warnings[0]}</span> : null}
      </button>
      <div className="task-actions">
        <button type="button" className="icon-button" onClick={() => onOpen(task)} title="Edit details" aria-label="Edit details">
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" onClick={() => onFocus(task)} title="Set focus">
          <CircleDot size={16} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" onClick={() => onComplete(task)} title="Complete">
          <Check size={16} aria-hidden="true" />
        </button>
        <div className="task-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            title="More task actions"
            aria-label="More task actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="task-menu" role="menu" aria-label="Task actions">
              <button type="button" role="menuitem" onClick={() => chooseStatus("inbox")}>
                Move to inbox
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("next")}>
                {task.status === "active" ? "Stop active work" : "Move to next"}
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("active")}>
                Make active
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("waiting")}>
                Mark waiting
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("scheduled")}>
                Schedule
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("incubator")}>
                Move to incubator
              </button>
              <button type="button" role="menuitem" onClick={() => chooseStatus("canceled")}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
