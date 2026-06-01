import { addDays } from "date-fns";
import { getProjectHealth } from "../domain/rules";
import type { AreaId } from "../domain/types";
import { Section } from "../components/Section";
import { TaskCard } from "../components/TaskCard";
import { useBrain } from "../store/BrainStore";

export function AreaView({ areaId }: { areaId: AreaId }) {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const label = areaId === "work" ? "Work" : "Personal";
  const projects = snapshot.projects.filter((project) => project.areaId === areaId && project.status === "active");
  const tasks = snapshot.tasks.filter((task) => task.areaId === areaId && task.status !== "done" && task.status !== "canceled");
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const soon = addDays(new Date(), 14);

  const groups = [
    { title: "Active", items: tasks.filter((task) => task.status === "active") },
    { title: "Next Actions", items: tasks.filter((task) => task.status === "next") },
    { title: "Waiting", items: tasks.filter((task) => task.status === "waiting") },
    { title: "Upcoming Commitments", items: tasks.filter((task) => task.status === "scheduled" && task.dueAt && task.dueAt <= soon) },
    { title: "Incubator", items: tasks.filter((task) => task.status === "incubator") }
  ];

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">{label} area</p>
          <h2>{label}</h2>
        </div>
        <p>{areaId === "work" ? "Professional outcomes and commitments." : "Home, health, errands, and personal ambitions."}</p>
      </header>
      <Section title="Active Projects" count={projects.length}>
        <div className="project-grid">
          {projects.map((project) => {
            const health = getProjectHealth(project, snapshot.tasks);
            return (
              <article key={project.id} className="project-card">
                <h3>{project.title}</h3>
                <p>{project.outcome}</p>
                {health.needsNextAction ? <span className="project-warning">Needs next action</span> : <span className="project-ok">Has next action</span>}
              </article>
            );
          })}
        </div>
      </Section>
      {groups.map((group) => (
        <Section key={group.title} title={group.title} count={group.items.length} defaultCollapsed={group.items.length === 0}>
          <div className="task-list">
            {group.items.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                project={task.projectId ? projectById.get(task.projectId) : undefined}
                selected={selectedTask?.id === task.id}
                onOpen={() => selectTask(task.id)}
                onComplete={() => completeTask(task.id)}
                onFocus={() => setFocusTask(task.id)}
                onStatus={(_, status) => updateTask(task.id, { status })}
              />
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
