import { Archive, CalendarClock, Crosshair, Gauge, Hourglass, Inbox, ListChecks } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getWipState, isOpenTask } from "../domain/rules";
import { getCommandSections } from "../domain/selectors";
import { useBrain } from "../store/BrainStore";
import { FocusTimer } from "../components/FocusTimer";
import { Section } from "../components/Section";
import { TaskCard } from "../components/TaskCard";

export function CommandView() {
  const { snapshot, selectTask, completeTask, setFocusTask, updateTask, selectedTask } = useBrain();
  const [timerOpen, setTimerOpen] = useState(false);
  const sections = getCommandSections(snapshot, new Date());
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const openTasks = snapshot.tasks.filter(isOpenTask);
  const wip = getWipState(snapshot.tasks);
  const sectionCount = new Map(sections.map((section) => [section.id, section.items.length]));
  const focusTitle = wip.focusTask?.title ?? "No focus selected";
  const activeWorkCount = openTasks.filter((task) => task.status === "active").length;
  const workNextCount = openTasks.filter((task) => task.areaId === "work" && task.status === "next").length;
  const personalNextCount = openTasks.filter((task) => task.areaId === "personal" && task.status === "next").length;
  const inboxCount = openTasks.filter((task) => task.status === "inbox").length;
  const attentionTotal =
    (sectionCount.get("due") ?? 0) +
    (sectionCount.get("waiting-due") ?? 0) +
    (sectionCount.get("incubator-ready") ?? 0);
  const attentionTarget =
    sectionCount.get("due") ? "lane-due" : sectionCount.get("waiting-due") ? "lane-waiting-due" : "lane-incubator-ready";

  function jumpTo(id: string) {
    const target = document.getElementById(id) ?? document.querySelector(".signal-grid");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", target?.id ? `#${target.id}` : "#capacity");
  }

  function chooseFocusTarget() {
    jumpTo(wip.focusTask ? "lane-focus" : "lane-work-next");
  }

  return (
    <div className="view-stack command-view">
      <header className="command-hero">
        <div className="command-title-block">
          <p className="eyebrow">Today&apos;s operating desk</p>
          <h2>Command</h2>
          <div className="command-pulse-row" aria-label="Command signal summary">
            <span>
              <Inbox size={14} aria-hidden="true" />
              {inboxCount} inbox
            </span>
            <span>
              <CalendarClock size={14} aria-hidden="true" />
              {sectionCount.get("scheduled-soon") ?? 0} soon
            </span>
            <span>
              <Hourglass size={14} aria-hidden="true" />
              {sectionCount.get("waiting-due") ?? 0} follow-up
            </span>
            <span>
              <Archive size={14} aria-hidden="true" />
              {sectionCount.get("incubator-ready") ?? 0} review
            </span>
          </div>
        </div>
        <button type="button" className="capacity-console" onClick={() => jumpTo("lane-active-work")}>
          <span className="signal-label">Capacity</span>
          <strong>
            {wip.activeCount}/{wip.limit} active
          </strong>
          <span className="capacity-bars" aria-hidden="true">
            {Array.from({ length: wip.limit }).map((_, index) => (
              <span key={index} className={index < wip.activeCount ? "filled" : ""} />
            ))}
          </span>
          <small>{activeWorkCount ? "Click to manage active work" : "No active work selected"}</small>
        </button>
      </header>
      <section className="signal-grid" aria-label="Command summary">
        <article className="focus-console-card focus-signal" data-testid="focus-console" aria-label="Focus lock-in">
          <div className="focus-console-icon" aria-hidden="true">
            <Crosshair size={22} />
          </div>
          <div className="focus-console-copy">
            <span className="signal-label">Focus lock-in</span>
            <strong>{focusTitle}</strong>
            <small>{wip.focusTask ? "Use when this task deserves protected attention." : "Choose one task only when you need deep work."}</small>
          </div>
          <div className="focus-console-actions">
            <button type="button" onClick={chooseFocusTarget}>
              {wip.focusTask ? "Show focus" : "Choose focus"}
            </button>
            <button type="button" className="primary-button" onClick={() => setTimerOpen(true)}>
              Open focus timer
            </button>
          </div>
        </article>
        <button type="button" className="signal-card" onClick={() => jumpTo("lane-active-work")}>
          <Gauge size={18} aria-hidden="true" />
          <div>
            <span className="signal-label">Capacity</span>
            <strong>
              {wip.activeCount}/{wip.limit}
            </strong>
            <small>Active work limit</small>
          </div>
        </button>
        <button type="button" className="signal-card" onClick={() => jumpTo("lane-work-next")}>
          <ListChecks size={18} aria-hidden="true" />
          <div>
            <span className="signal-label">Next</span>
            <strong>
              {workNextCount} work / {personalNextCount} personal
            </strong>
            <small>Ready when capacity opens</small>
          </div>
        </button>
        <button type="button" className="signal-card attention-signal" onClick={() => jumpTo(attentionTarget)}>
          <CalendarClock size={18} aria-hidden="true" />
          <div>
            <span className="signal-label">Attention</span>
            <strong>{attentionTotal} surfaced</strong>
            <small>Due, follow-up, or review items ready now</small>
          </div>
        </button>
      </section>
      {timerOpen ? (
        <FocusTimer
          focusTask={wip.focusTask}
          onClose={() => setTimerOpen(false)}
          onChooseFocus={() => {
            setTimerOpen(false);
            chooseFocusTarget();
          }}
        />
      ) : null}
      <section className="onboarding-panel" aria-label="Start here">
        <div>
          <p className="eyebrow">Start here</p>
          <h3>Run today in four moves</h3>
        </div>
        <ol className="onboarding-steps">
          <li>
            <span>1</span>
            <strong>Capture</strong>
            <small>Dump small open loops fast.</small>
            <Link to="/inbox">Open Inbox</Link>
          </li>
          <li>
            <span>2</span>
            <strong>Triage</strong>
            <small>Choose area and workflow state.</small>
            <Link to="/inbox">Triage now</Link>
          </li>
          <li>
            <span>3</span>
            <strong>Focus</strong>
            <small>Make one active item your focus.</small>
            <button type="button" onClick={() => jumpTo("lane-work-next")}>Pick focus</button>
          </li>
          <li>
            <span>4</span>
            <strong>Review</strong>
            <small>Let waiting and ideas resurface.</small>
            <Link to="/reviews/weekly">Review</Link>
          </li>
        </ol>
      </section>
      {sections.length === 0 ? (
        <div className="empty-state">Nothing needs the command surface right now. Capture or review when ready.</div>
      ) : (
        <div className="command-lanes">
          {sections.map((section) => (
            <div key={section.id} id={`lane-${section.id}`} className={`command-lane lane-${section.id}`}>
              <Section title={section.title} description={section.description} count={section.items.length}>
                <div className="task-list">
                  {section.items.map((task) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
