import { addMonths } from "date-fns";
import { getMonthlyIncubatorReview } from "../domain/selectors";
import { Section } from "../components/Section";
import { TaskCard } from "../components/TaskCard";
import { useBrain } from "../store/BrainStore";

export function IncubatorView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, createProjectFromTask, selectedTask } = useBrain();
  const review = getMonthlyIncubatorReview(snapshot, new Date());

  function renderItem(task: (typeof review.ready)[number], ready: boolean) {
    return (
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
            Activate now
          </button>
          <button type="button" onClick={() => createProjectFromTask(task.id)} data-testid={`promote-project-${task.id}`}>
            Promote to project
          </button>
          {ready ? (
            <button type="button" onClick={() => updateTask(task.id, { reviewAt: addMonths(new Date(), 1) })}>
              Snooze 1 month
            </button>
          ) : null}
          <button type="button" onClick={() => updateTask(task.id, { status: "canceled" })}>
            Archive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Not now, still trusted</p>
          <h2>Incubator</h2>
        </div>
        <p>Ideas stay out of active work until their review date earns attention.</p>
      </header>
      <Section title="Ready for Review" description="Visible because the review date has arrived." count={review.ready.length}>
        <div className="task-list">{review.ready.map((task) => renderItem(task, true))}</div>
      </Section>
      <Section title="Later" count={review.later.length}>
        <div className="task-list">{review.later.map((task) => renderItem(task, false))}</div>
      </Section>
    </div>
  );
}
