"use client";

import { useOfflineStatus } from "@/components/offline/offline-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDb } from "@/lib/offline/local-db";
import type { SyncQueueItem } from "@/lib/offline/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudOff,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value?: string) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data invalida";
  return DATE_FORMATTER.format(date);
}

export function SyncClient() {
  const { status, summary, lastSyncAt, refresh, syncNow } = useOfflineStatus();
  const [items, setItems] = useState<SyncQueueItem[]>([]);

  async function loadItems() {
    setItems(await localDb.syncQueue.all());
  }

  useEffect(() => {
    queueMicrotask(() => void loadItems());

    function handleQueueUpdated() {
      void loadItems();
    }

    window.addEventListener("andcheck:sync-queue-updated", handleQueueUpdated);
    return () =>
      window.removeEventListener(
        "andcheck:sync-queue-updated",
        handleQueueUpdated,
      );
  }, []);

  async function handleSyncNow() {
    await syncNow();
    await Promise.all([refresh(), loadItems()]);
  }

  async function handleRetryItem(item: SyncQueueItem) {
    await localDb.syncQueue.update(item.id, {
      status: "pending",
      lastError: undefined,
    });
    await handleSyncNow();
  }

  async function handleKeepServerVersion(item: SyncQueueItem) {
    await localDb.syncQueue.update(item.id, {
      status: "synced",
      lastError: undefined,
      syncedAt: new Date().toISOString(),
    });
    await Promise.all([refresh(), loadItems()]);
  }

  const conflictItems = items.filter((item) => item.status === "conflict");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b-2 border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            AndCheck - Offline
          </p>
          <h1 className="text-[22px] font-bold uppercase tracking-tight text-foreground">
            Sincronizacao
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle da fila offline e envio dos dados quando a conexao voltar.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void handleSyncNow()}
          disabled={status === "offline" || status === "syncing"}
          className="w-full md:w-auto"
        >
          <RefreshCw
            className={`size-4 ${status === "syncing" ? "animate-spin" : ""}`}
          />
          Sincronizar agora
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SyncMetric label="Pendentes" value={summary.pending} tone="amber" />
        <SyncMetric label="Sincronizando" value={summary.syncing} tone="blue" />
        <SyncMetric label="Sincronizados" value={summary.synced} tone="green" />
        <SyncMetric label="Falhas" value={summary.failed} tone="red" />
        <SyncMetric label="Conflitos" value={summary.conflict} tone="slate" />
      </div>

      {conflictItems.length > 0 && (
        <div className="border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Conflito de sincronizacao</p>
              <p className="text-xs leading-5 text-slate-600">
                O registro foi alterado no servidor antes do envio offline. A
                versao do servidor foi preservada e nenhuma alteracao local foi
                aplicada automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4" />
            Fila de sincronizacao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>Ultima sincronizacao: {formatDate(lastSyncAt)}</div>
            <div>Total na fila local: {summary.total}</div>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center border bg-muted/20 p-6 text-center">
              <CheckCircle2 className="mb-3 size-8 text-emerald-600" />
              <p className="text-sm font-semibold">Nenhum item pendente</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Acoes feitas offline aparecerao aqui ate serem processadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-sidebar text-xs uppercase tracking-widest text-sidebar-foreground/70">
                  <tr>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Acao</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tentativas</th>
                    <th className="px-4 py-3">Servidor</th>
                    <th className="px-4 py-3">Erro</th>
                    <th className="px-4 py-3">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {item.action}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.entityType} / {item.entityId}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge item={item} />
                      </td>
                      <td className="px-4 py-3">{item.attempts}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.serverId ?? "-"}
                      </td>
                      <td className="max-w-80 px-4 py-3 text-xs text-muted-foreground">
                        {item.lastError ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "failed" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRetryItem(item)}
                            disabled={status === "offline" || status === "syncing"}
                          >
                            <RotateCcw className="size-3" />
                            Tentar novamente
                          </Button>
                        )}
                        {item.status === "conflict" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleKeepServerVersion(item)}
                            disabled={status === "syncing"}
                          >
                            <ShieldCheck className="size-3" />
                            Manter servidor
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SyncMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "green" | "red" | "slate";
}) {
  const toneClass = {
    amber: "border-amber-400 text-amber-700",
    blue: "border-blue-500 text-blue-700",
    green: "border-emerald-500 text-emerald-700",
    red: "border-red-500 text-red-700",
    slate: "border-slate-500 text-slate-700",
  }[tone];

  return (
    <Card className={`border-l-4 ${toneClass}`} size="sm">
      <CardContent className="py-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ item }: { item: SyncQueueItem }) {
  if (item.status === "synced") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="size-3" /> Sincronizado
      </Badge>
    );
  }

  if (item.status === "failed") {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">
        <AlertTriangle className="size-3" /> Falha
      </Badge>
    );
  }

  if (item.status === "conflict") {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
        <CloudOff className="size-3" /> Conflito
      </Badge>
    );
  }

  if (item.status === "syncing") {
    return (
      <Badge className="border-blue-200 bg-blue-50 text-blue-700">
        <RefreshCw className="size-3 animate-spin" /> Enviando
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <Clock3 className="size-3" /> Pendente
    </Badge>
  );
}
