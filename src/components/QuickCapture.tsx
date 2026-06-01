import { Send, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBrain } from "../store/BrainStore";

export function QuickCapture() {
  const { captureQuickCapture } = useBrain();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function submit() {
    const captured = await captureQuickCapture(value);
    if (!captured) {
      return;
    }
    setValue("");
    setMessage(`Captured: ${captured.title}`);
    window.setTimeout(() => setMessage(""), 2400);
  }

  return (
    <div className="quick-capture">
      <Zap size={17} aria-hidden="true" />
      <input
        ref={inputRef}
        data-testid="quick-capture-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Capture anything. Try: tomorrow 9am send expense report #work"
        aria-label="Quick capture"
      />
      <button type="button" className="icon-button strong" onClick={submit} title="Capture">
        <Send size={16} aria-hidden="true" />
      </button>
      {message ? (
        <span className="capture-message" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
