"use client";

import { CloudOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useOfflineStatus } from "@/components/offline/offline-provider";
import { typography } from "@/lib/design-system";
import { SEMANTIC_TONE_CLASSES } from "@/lib/semantic-tones";

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function OnlineOnlyNotice({ moduleName }: { moduleName: string }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );
  const { isOnline, status } = useOfflineStatus();

  if (!hydrated) return null;
  if (isOnline && status !== "offline") return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${typography.bodyStrong} ${SEMANTIC_TONE_CLASSES.warning.badge}`}
    >
      <CloudOff className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {moduleName} e um modulo online-only nesta versao. Conecte-se para
        carregar dados atualizados e executar acoes administrativas.
      </span>
    </div>
  );
}
