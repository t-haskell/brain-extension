import { Plus } from "lucide-react";
import { useState } from "react";
import { getProjectHealth } from "../domain/rules";
import type { AreaId, Project, ProjectStatus } from "../domain/types";
import { useBrain } from "../store/BrainStore";
import { TaskCard } from "../components/TaskCard";

const projectStatuses: ProjectStatus[] = ["active", "on_hold", "done", "canceled"];

type ProjectForm = Pick<Project, "title" | "outcome" | "status">;

function formFromProject(project: Project): ProjectForm {
  return {
    title: project.title,
    outcome: project.outcome,
    status: project.status
  };
}

export function ProjectsView() {
  const { snapshot, createProject, updateProject, addTask, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [areaId, setAreaId] = useState<AreaId>("work");
  const [nextAction, setNextAction] = useState("");
  const [projectActionInputs, setProjectActionInputs] = useState<Record<string, string>>({});
  const [projectForms, setProjectForms] = useState<Record<string, ProjectForm>>({});

  async function submitProject() {
    if (!title.trim()) {
      return;
    }
    await createProject({ areaId, title: title.trim(), outcome: outcome.trim() || title.trim() }, nextAction);
    setTitle("");
    setOutcome("");
    setNextAction("");
  }

  async function addProjectAction(projectId: string, projectAreaId: AreaId) {
    const value = projectActionInputs[projectId]?.trim();
    if (!value) {
      return;
    }
    await addTask({ title: value, status: "next", projectId, areaId: projectAreaId });
    setProjectActionInputs((inputs) => ({ ...inputs, [projectId]: "" }));
  }

  function updateProjectForm(project: Project, patch: Partial<ProjectForm>) {
    setProjectForms((forms) => ({
      ...forms,
      [project.id]: {
        ...(forms[project.id] ?? formFromProject(project)),
        ...patch
      }
    }));
  }

  async function saveProject(project: Project) {
    const form = projectForms[project.id] ?? formFromProject(project);
    await updateProject(project.id, {
      title: form.title.trim() || project.title,
      outcome: form.outcome.trim() || form.title.trim() || project.outcome,
      status: form.status
    });
    setProjectForms((forms) => {
      const next = { ...forms };
      delete next[project.id];
      return next;
    });
  }

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Outcomes</p>
          <h2>Projects</h2>
        </div>
        <p>Projects are desired outcomes. Each active project needs a concrete next action.</p>
      </header>
      <section className="form-card">
        <h3>Create project and next action</h3>
        <div className="field-grid">
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} data-testid="project-title" />
          </label>
          <label>
            Area
            <select value={areaId} onChange={(event) => setAreaId(event.target.value as AreaId)} data-testid="project-area">
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </label>
        </div>
        <label>
          Outcome
          <input value={outcome} onChange={(event) => setOutcome(event.target.value)} data-testid="project-outcome" />
        </label>
        <label>
          First next action
          <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} data-testid="project-next-action" />
        </label>
        <button type="button" className="primary-button" onClick={submitProject} data-testid="create-project">
          <Plus size={16} aria-hidden="true" />
          Create project
        </button>
      </section>
      <div className="project-grid">
        {snapshot.projects.map((project) => {
          const health = getProjectHealth(project, snapshot.tasks);
          const projectTasks = snapshot.tasks.filter((task) => task.projectId === project.id && task.status !== "done" && task.status !== "canceled");
          const form = projectForms[project.id] ?? formFromProject(project);
          return (
            <article key={project.id} className="project-card" data-testid={`project-card-${project.id}`}>
              <div className="project-card-header">
                <div>
                  <span className={`badge area-${project.areaId}`}>{project.areaId === "work" ? "Work" : "Personal"}</span>
                  <span className="badge neutral">{project.status.replace("_", " ")}</span>
                  <h3>{project.title}</h3>
                </div>
                {health.needsNextAction ? (
                  <span className="project-warning">Needs next action</span>
                ) : (
                  <span className="project-ok">Has next action</span>
                )}
              </div>
              <p>{project.outcome}</p>
              <div className="project-edit-grid">
                <label>
                  Title
                  <input
                    value={form.title}
                    onChange={(event) => updateProjectForm(project, { title: event.target.value })}
                    aria-label={`Project title for ${project.title}`}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => updateProjectForm(project, { status: event.target.value as ProjectStatus })}
                    aria-label={`Project status for ${project.title}`}
                  >
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="project-outcome-field">
                  Outcome
                  <input
                    value={form.outcome}
                    onChange={(event) => updateProjectForm(project, { outcome: event.target.value })}
                    aria-label={`Project outcome for ${project.title}`}
                  />
                </label>
                <button type="button" onClick={() => saveProject(project)}>
                  Save project
                </button>
              </div>
              <div className="inline-add">
                <input
                  value={projectActionInputs[project.id] ?? ""}
                  onChange={(event) => setProjectActionInputs((inputs) => ({ ...inputs, [project.id]: event.target.value }))}
                  placeholder="Add next action"
                  aria-label={`Add next action to ${project.title}`}
                />
                <button type="button" onClick={() => addProjectAction(project.id, project.areaId)}>
                  Add
                </button>
              </div>
              <div className="task-list compact-list">
                {projectTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTask?.id === task.id}
                    onOpen={() => selectTask(task.id)}
                    onComplete={() => completeTask(task.id)}
                    onFocus={() => setFocusTask(task.id)}
                    onStatus={(_, status) => updateTask(task.id, { status })}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
