import { useEffect, useState } from "react";
import type { BrainSnapshot } from "../domain/types";
import { db, isDexieCloudConfigured } from "./db";

export interface SyncAdapter {
  pull(): Promise<BrainSnapshot | null>;
  push(snapshot: BrainSnapshot): Promise<void>;
}

export class LocalOnlySyncAdapter implements SyncAdapter {
  async pull(): Promise<BrainSnapshot | null> {
    return null;
  }

  async push(_snapshot: BrainSnapshot): Promise<void> {
    return;
  }
}

export type CloudPhase = "local-only" | "signed-out" | "initial" | "not-in-sync" | "pushing" | "pulling" | "in-sync" | "error" | "offline";

export interface CloudAccountState {
  enabled: boolean;
  isLoggedIn: boolean;
  email: string | null;
  userId: string | null;
  phase: CloudPhase;
  lastSyncAt: Date | null;
  errorMessage: string | null;
}

interface CloudUserLike {
  isLoggedIn?: boolean;
  email?: string;
  userId?: string;
}

interface CloudSyncStateLike {
  phase?: Exclude<CloudPhase, "local-only" | "signed-out">;
  status?: string;
  error?: Error;
}

export function isCloudEnabled(): boolean {
  return isDexieCloudConfigured();
}

export function mapCloudAccountState({
  enabled,
  user,
  syncState,
  lastSyncAt
}: {
  enabled: boolean;
  user: CloudUserLike | undefined;
  syncState: CloudSyncStateLike | undefined;
  lastSyncAt: Date | null;
}): CloudAccountState {
  if (!enabled) {
    return {
      enabled: false,
      isLoggedIn: false,
      email: null,
      userId: null,
      phase: "local-only",
      lastSyncAt: null,
      errorMessage: null
    };
  }

  const isLoggedIn = Boolean(user?.isLoggedIn);

  return {
    enabled: true,
    isLoggedIn,
    email: user?.email ?? null,
    userId: user?.userId ?? null,
    phase: isLoggedIn ? syncState?.phase ?? "initial" : "signed-out",
    lastSyncAt,
    errorMessage: syncState?.error?.message ?? null
  };
}

function readObservableValue<T>(observable: { value?: T; getValue?: () => T } | undefined): T | undefined {
  return observable?.value ?? observable?.getValue?.();
}

export async function loginToCloud(email?: string): Promise<void> {
  if (!isCloudEnabled()) {
    throw new Error("Dexie Cloud is not configured for this deployment.");
  }

  await db.cloud.login(email ? { email } : undefined);
  await db.cloud.sync({ wait: true, purpose: "pull" });
}

export async function logoutFromCloud(): Promise<void> {
  if (!isCloudEnabled()) {
    return;
  }

  await db.cloud.logout();
}

export async function syncCloudNow(): Promise<void> {
  if (!isCloudEnabled()) {
    return;
  }

  await db.cloud.sync({ wait: true, purpose: "push" });
  await db.cloud.sync({ wait: true, purpose: "pull" });
}

export function useCloudAccount(): CloudAccountState {
  const enabled = isCloudEnabled();
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [state, setState] = useState<CloudAccountState>(() =>
    mapCloudAccountState({
      enabled,
      user: enabled ? readObservableValue(db.cloud.currentUser) : undefined,
      syncState: enabled ? readObservableValue(db.cloud.syncState) : undefined,
      lastSyncAt: null
    })
  );

  useEffect(() => {
    if (!enabled) {
      setState(mapCloudAccountState({ enabled: false, user: undefined, syncState: undefined, lastSyncAt: null }));
      return;
    }

    function update(nextLastSyncAt = lastSyncAt) {
      setState(
        mapCloudAccountState({
          enabled: true,
          user: readObservableValue(db.cloud.currentUser),
          syncState: readObservableValue(db.cloud.syncState),
          lastSyncAt: nextLastSyncAt
        })
      );
    }

    const userSubscription = db.cloud.currentUser.subscribe(() => update());
    const syncSubscription = db.cloud.syncState.subscribe(() => update());
    const completeSubscription = db.cloud.events.syncComplete.subscribe(() => {
      const completedAt = new Date();
      setLastSyncAt(completedAt);
      update(completedAt);
    });

    update();

    return () => {
      userSubscription.unsubscribe();
      syncSubscription.unsubscribe();
      completeSubscription.unsubscribe();
    };
  }, [enabled, lastSyncAt]);

  return state;
}
