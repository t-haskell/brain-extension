import { addMonths } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Section } from "../components/Section";
import { TaskCard } from "../components/TaskCard";
import { getMonthlyIncubatorReview, getWeeklyReview } from "../domain/selectors";
import { useBrain } from "../store/BrainStore";

export function WeeklyReviewView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const review = getWeeklyReview(snapshot, new Date());
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));

  const renderTasks = (tasks: typeof review.inbox) => (
    <div className="task-list">
      {tasks.map((task) => (
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
  );

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Guided review</p>
          <h2>Weekly Review</h2>
        </div>
        <p>Clear the system, then make sure every active outcome has a next action.</p>
      </header>
      <section className="review-checklist">
        {[
          "Clear Inbox",
          "Review active projects",
          "Check waiting items",
          "Inspect scheduled commitments in the next 2 weeks",
          "Clean stale tasks"
        ].map((item) => (
          <label key={item} className="inline-check">
            <input type="checkbox" />
            <CheckCircle2 size={16} aria-hidden="true" />
            {item}
          </label>
        ))}
      </section>
      <Section title="Inbox to Clear" count={review.inbox.length}>
        {renderTasks(review.inbox)}
      </Section>
      <Section title="Active Project Health" count={review.activeProjects.length}>
        <div className="project-grid">
          {review.activeProjects.map(({ project, needsNextAction }) => (
            <article key={project.id} className="project-card">
              <h3>{project.title}</h3>
              <p>{project.outcome}</p>
              {needsNextAction ? <span className="project-warning">Needs next action</span> : <span className="project-ok">Has next action</span>}
            </article>
          ))}
        </div>
      </Section>
      <Section title="Waiting Items" count={review.waiting.length}>
        {renderTasks(review.waiting)}
      </Section>
      <Section title="Scheduled Next Two Weeks" count={review.scheduledNextTwoWeeks.length}>
        {renderTasks(review.scheduledNextTwoWeeks)}
      </Section>
      <Section title="Stale Open Tasks" count={review.staleTasks.length}>
        {renderTasks(review.staleTasks)}
      </Section>
    </div>
  );
}

export function MonthlyIncubatorReviewView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, createProjectFromTask, selectedTask } = useBrain();
  const review = getMonthlyIncubatorReview(snapshot, new Date());

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Guided review</p>
          <h2>Monthly Incubator Review</h2>
        </div>
        <p>Promote, define a next action, snooze, or archive future-important items.</p>
      </header>
      <Section title="Ready Incubator Items" description="These resurfaced because their review date has arrived." count={review.ready.length}>
        <div className="task-list">
          {review.ready.map((task) => (
            <div key={task.id} className="incubator-row">
              <TaskCard
                task={task}
                selected={selectedTask?.id === task.id}
                onOpen={() => selectTask(task.id)}
                onComplete={() => completeTask(task.id)}
                onFocus={() => setFocusTask(task.id)}
                onStatus={(_, status) => updateTask(task.id, { status })}
              />
              <div className="button-row compact">
                <button type="button" onClick={() => updateTask(task.id, { status: "next", kind: "task", reviewAt: null })}>
                  Create next action
                </button>
                <button type="button" onClick={() => createProjectFromTask(task.id)}>
                  Promote to project
                </button>
                <button type="button" onClick={() => updateTask(task.id, { reviewAt: addMonths(new Date(), 1) })}>
                  Snooze
                </button>
                <button type="button" onClick={() => updateTask(task.id, { status: "canceled" })}>
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
