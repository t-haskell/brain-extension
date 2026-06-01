import { Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Task } from "../domain/types";

interface FocusTimerProps {
  focusTask: Task | null;
  onClose(): void;
  onChooseFocus(): void;
}

const durations = [15, 25, 45];

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function FocusTimer({ focusTask, onClose, onChooseFocus }: FocusTimerProps) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setRunning(false);
    setRemainingSeconds(durationMinutes * 60);
  }, [durationMinutes, focusTask?.id]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  function reset() {
    setRunning(false);
    setRemainingSeconds(durationMinutes * 60);
  }

  return (
    <div className="focus-timer-backdrop">
      <section className="focus-timer" role="dialog" aria-modal="true" aria-label="Focus timer">
        <div className="focus-timer-header">
          <div>
            <span className="signal-label">Focus timer</span>
            <h2>{focusTask ? focusTask.title : "Pick a focus first"}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            title="Close focus timer"
            aria-label="Close focus timer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="timer-face" aria-live="polite">
          <Timer size={30} aria-hidden="true" />
          <strong>{formatRemaining(remainingSeconds)}</strong>
          <span>{running ? "Stay with the selected task." : "Ready when you are."}</span>
        </div>

        <div className="timer-duration-row" aria-label="Timer duration">
          {durations.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={durationMinutes === minutes ? "selected" : ""}
              onClick={() => setDurationMinutes(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>

        <div className="timer-actions">
          {focusTask ? (
            <button type="button" className="primary-button" onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {running ? "Pause" : "Start"}
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={onChooseFocus}>
              Choose focus
            </button>
          )}
          <button type="button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
