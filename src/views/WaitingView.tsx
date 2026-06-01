import { endOfDay, isBefore, isEqual } from "date-fns";
import { Section } from "../components/Section";
import { TaskCard } from "../components/TaskCard";
import { useBrain } from "../store/BrainStore";

export function WaitingView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const waiting = snapshot.tasks.filter((task) => task.status === "waiting");
  const todayEnd = endOfDay(new Date());
  const due = waiting.filter((task) => {
    const followUpAt = task.reviewAt ?? task.dueAt;
    return Boolean(followUpAt && (isBefore(followUpAt, todayEnd) || isEqual(followUpAt, todayEnd)));
  });
  const later = waiting.filter((task) => !due.includes(task));
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Blocked work</p>
          <h2>Waiting</h2>
        </div>
        <p>Every waiting item should have a person, event, or follow-up date.</p>
      </header>
      <section className="guide-panel">
        <strong>How waiting dates work</strong>
        <p>
          Follow-ups due are waiting items with a follow-up or review date of today or earlier. Later follow-ups have a future
          follow-up date or still need one. Use the pencil button on a card to edit the waiting person, review date, due date,
          area, project, or status.
        </p>
      </section>
      <Section title="Follow-ups Due" description="Review or due date is today or earlier." count={due.length}>
        <div className="task-list">
          {due.map((task) => (
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
      <Section title="Later Follow-ups" description="Future follow-ups, plus waiting items that still need a date." count={later.length}>
        <div className="task-list">
          {later.map((task) => (
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
    </div>
  );
}
