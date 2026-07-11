"use client";

import { CloudOff } from "lucide-react";

import { useOfflineStatus } from "@/components/offline/offline-provider";

export function OnlineOnlyNotice({ moduleName }: { moduleName: string }) {
  const { isOnline, status } = useOfflineStatus();

  if (isOnline && status !== "offline") return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
      <CloudOff className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {moduleName} é um módulo online-only nesta versão. Conecte-se para
        carregar dados atualizados e executar ações administrativas.
      </span>
    </div>
  );
}
