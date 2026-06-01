import type { AreaId, TaskStatus } from "../domain/types";

export function AreaBadge({ areaId }: { areaId: AreaId }) {
  return <span className={`badge area-${areaId}`}>{areaId === "work" ? "Work" : "Personal"}</span>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge status-${status}`}>{status.replace("_", " ")}</span>;
}
