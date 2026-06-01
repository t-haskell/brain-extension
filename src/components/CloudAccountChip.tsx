import { Cloud, LogOut, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { loginToCloud, logoutFromCloud, syncCloudNow, useCloudAccount } from "../persistence/sync";

function phaseLabel(phase: string): string {
  if (phase === "local-only") {
    return "Local only";
  }

  if (phase === "signed-out") {
    return "Not signed in";
  }

  return phase.replaceAll("-", " ");
}

export function CloudAccountChip() {
  const account = useCloudAccount();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const syncButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(() => {
      if (account.isLoggedIn) {
        syncButtonRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.setTimeout(() => chipRef.current?.focus(), 0);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [account.isLoggedIn, open]);

  if (!account.enabled) {
    return (
      <div className="cloud-account-chip local-only" data-testid="cloud-account-chip" title="Cloud sync is not configured for this build.">
        <Cloud size={15} aria-hidden="true" />
        <span>Local only</span>
      </div>
    );
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage("Enter the email address you want to sync with.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await loginToCloud(trimmed);
      setMessage("Signed in. Remote data is synced to this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setMessage(null);
    try {
      await syncCloudNow();
      setMessage("Sync complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    try {
      await logoutFromCloud();
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }

  const label = account.isLoggedIn ? account.email ?? "Signed in" : "Sign in to sync";

  return (
    <div className="cloud-account-wrap">
      <button
        ref={chipRef}
        type="button"
        className={account.isLoggedIn ? "cloud-account-chip signed-in" : "cloud-account-chip"}
        data-testid="cloud-account-chip"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={label}
      >
        <Cloud size={15} aria-hidden="true" />
        <span>{label}</span>
        <small>{phaseLabel(account.phase)}</small>
      </button>

      {open ? (
        <div className="cloud-account-panel" role="dialog" aria-label="Sync account">
          {account.isLoggedIn ? (
            <>
              <div>
                <strong>{account.email ?? "Signed in"}</strong>
                <p>
                  Sync status: {phaseLabel(account.phase)}
                  {account.lastSyncAt ? `, last synced ${account.lastSyncAt.toLocaleTimeString()}` : ""}
                </p>
              </div>
              <div className="button-row">
                <button ref={syncButtonRef} type="button" onClick={syncNow} disabled={busy}>
                  <RefreshCw size={14} aria-hidden="true" />
                  Sync now
                </button>
                <button type="button" onClick={signOut} disabled={busy}>
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submitLogin}>
              <p>Sign in with the same email on each device to share this local-first database.</p>
              <label>
                Email
                <input
                  type="email"
                  ref={emailRef}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <button type="submit" className="primary-button full" disabled={busy}>
                Send sign-in code
              </button>
            </form>
          )}
          {account.errorMessage ? <p className="form-message error">{account.errorMessage}</p> : null}
          {message ? <p className="form-message">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
