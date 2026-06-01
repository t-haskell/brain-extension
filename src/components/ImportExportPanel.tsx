import { Download, RotateCcw, Upload } from "lucide-react";
import { useState } from "react";
import { useBrain } from "../store/BrainStore";

function downloadFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ImportExportPanel() {
  const { exportJson, exportCsv, importJson, resetDemo } = useBrain();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"import" | "reset" | null>(null);
  const hasImportText = importText.trim().length > 0;

  async function handleImport() {
    if (!hasImportText) {
      return;
    }

    if (pendingAction !== "import") {
      setPendingAction("import");
      setMessage("Import replaces all local tasks and projects. Confirm to continue.");
      return;
    }

    try {
      await importJson(importText);
      setImportText("");
      setPendingAction(null);
      setMessage("Import complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  async function handleResetDemo() {
    if (pendingAction !== "reset") {
      setPendingAction("reset");
      setMessage("Reset replaces all local tasks and projects with demo data. Confirm to continue.");
      return;
    }

    await resetDemo();
    setPendingAction(null);
    setMessage("Demo data reset.");
  }

  function cancelPendingAction() {
    setPendingAction(null);
    setMessage("");
  }

  return (
    <section className="io-panel">
      <div className="button-row">
        <button
          type="button"
          onClick={() => downloadFile("command-export.json", exportJson(), "application/json")}
          data-testid="export-json"
        >
          <Download size={16} aria-hidden="true" />
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => downloadFile("command-export.csv", exportCsv(), "text/csv")}
          data-testid="export-csv"
        >
          <Download size={16} aria-hidden="true" />
          Export CSV
        </button>
        <button type="button" onClick={handleResetDemo} data-testid="reset-demo">
          <RotateCcw size={16} aria-hidden="true" />
          {pendingAction === "reset" ? "Confirm reset" : "Reset Demo"}
        </button>
        {pendingAction === "reset" ? (
          <button type="button" onClick={cancelPendingAction}>
            Cancel
          </button>
        ) : null}
      </div>
      <label>
        Import JSON
        <textarea
          value={importText}
          onChange={(event) => {
            setImportText(event.target.value);
            if (pendingAction === "import") {
              setPendingAction(null);
            }
          }}
          placeholder="Paste a Command JSON export here."
          rows={5}
        />
      </label>
      <button type="button" className="primary-button" onClick={handleImport} disabled={!hasImportText}>
        <Upload size={16} aria-hidden="true" />
        {pendingAction === "import" ? "Confirm import" : "Import"}
      </button>
      {pendingAction === "import" ? (
        <button type="button" onClick={cancelPendingAction}>
          Cancel
        </button>
      ) : null}
      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
