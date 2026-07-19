"use client";

import { useOfflineStatus } from "@/components/offline/offline-provider";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typography } from "@/lib/design-system";
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
import { useEffect, useState, type ElementType } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value?: string) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return DATE_FORMATTER.format(date);
}

function formatPayloadPreview(payload: unknown) {
  try {
    const serialized = JSON.stringify(payload, null, 2);
    return serialized.length > 800
      ? `${serialized.slice(0, 800)}\n...`
      : serialized;
  } catch {
  return "Payload local indisponível.";
  }
}

function payloadRecord(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

const ACTION_LABELS: Record<string, string> = {
  "inspection.create": "Criar inspeção",
  "scaffold.create": "Criar andaime",
  "scaffold.update": "Editar andaime",
  "scaffold.assembly.complete": "Concluir montagem",
  "scaffold.dismantle": "Registrar desmontagem",
  "scaffold.document.add": "Anexar documento",
  "nonConformity.itemEvidence.add": "Anexar evidência de NC",
  "nonConformity.comment.add": "Comentar NC",
  "nonConformity.status.update": "Alterar status da NC",
  "nonConformity.responsible.update": "Alterar responsável da NC",
  "nonConformity.dueDate.update": "Alterar prazo da NC",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function entityLabel(item: SyncQueueItem) {
  const payload = payloadRecord(item.payload);

  if (item.entityType === "scaffold") {
    return (
      payloadString(payload, "scaffold_code") ??
      payloadString(payload, "code") ??
      payloadString(payload, "id") ??
      item.entityId
    );
  }

  if (item.entityType === "inspection") {
    return (
      payloadString(payload, "scaffold_code") ??
      payloadString(payload, "scaffold_id") ??
      item.entityId
    );
  }

  if (item.entityType === "nonConformity") {
    return payloadString(payload, "code") ?? payloadString(payload, "id") ?? item.entityId;
  }

  return item.entityId;
}

export function SyncClient() {
  const { status, summary, lastSyncAt, refresh, syncNow } = useOfflineStatus();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  async function loadItems({ initial = false } = {}) {
    if (initial) setIsLoadingItems(true);

    const startedAt = performance.now();
    const nextItems = await localDb.syncQueue.all();
    setItems(nextItems);

    if (initial) {
      const elapsed = performance.now() - startedAt;
      if (elapsed < 220) {
        await new Promise((resolve) => setTimeout(resolve, 220 - elapsed));
      }
      setIsLoadingItems(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadItems({ initial: true }));

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

  async function handleRetryFailedItems() {
    const failedItems = items.filter((item) => item.status === "failed");
    await Promise.all(
      failedItems.map((item) =>
        localDb.syncQueue.update(item.id, {
          status: "pending",
          lastError: undefined,
        }),
      ),
    );
    await handleSyncNow();
  }

  async function handleKeepAllServerVersions() {
    const now = new Date().toISOString();
    const conflictItems = items.filter((item) => item.status === "conflict");
    await Promise.all(
      conflictItems.map((item) =>
        localDb.syncQueue.update(item.id, {
          status: "synced",
          lastError: undefined,
          syncedAt: now,
        }),
      ),
    );
    await Promise.all([refresh(), loadItems()]);
  }

  async function handleClearSyncedItems() {
    await localDb.syncQueue.deleteByStatus("synced");
    await Promise.all([refresh(), loadItems()]);
  }

  const conflictItems = items.filter((item) => item.status === "conflict");
  const failedItems = items.filter((item) => item.status === "failed");

  if (isLoadingItems) {
    return <PageSkeleton cards={5} rows={6} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <RefreshCw className="size-4" />
            AndCheck - Offline
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Sincronização
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
            Controle da fila offline e envio dos dados quando a conexão voltar.
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
        <SyncMetric label="Pendentes" value={summary.pending} tone="amber" icon={Clock3} />
        <SyncMetric label="Sincronizando" value={summary.syncing} tone="blue" icon={RefreshCw} />
        <SyncMetric label="Sincronizados" value={summary.synced} tone="green" icon={CheckCircle2} />
        <SyncMetric label="Falhas" value={summary.failed} tone="red" icon={AlertTriangle} />
        <SyncMetric label="Conflitos" value={summary.conflict} tone="slate" icon={CloudOff} />
      </div>

      {conflictItems.length > 0 && (
        <div className="border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Conflito de sincronização</p>
              <p className="text-xs leading-5 text-slate-600">
                O registro foi alterado no servidor antes do envio offline. A
                versão do servidor foi preservada e nenhuma alteração local foi
                aplicada automaticamente.
              </p>
            </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleKeepAllServerVersions()}
              disabled={status === "syncing"}
              className="w-full shrink-0 md:w-auto"
            >
              <ShieldCheck className="size-3" />
              Manter servidor em lote
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <RotateCcw className="size-4" />
            Fila de sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <div>Última sincronização: {formatDate(lastSyncAt)}</div>
              <div>Total na fila local: {summary.total}</div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              {summary.synced > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleClearSyncedItems()}
                  disabled={status === "syncing"}
                  className="w-full md:w-auto"
                >
                  <CheckCircle2 className="size-3" />
                  Limpar sincronizados
                </Button>
              )}
              {failedItems.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRetryFailedItems()}
                  disabled={status === "offline" || status === "syncing"}
                  className="w-full md:w-auto"
                >
                  <RotateCcw className="size-3" />
                  Tentar falhas em lote
                </Button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center border bg-muted/20 p-6 text-center">
              <CheckCircle2 className="mb-3 size-8 text-emerald-600" />
              <p className="text-sm font-semibold">Nenhum item pendente</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Ações feitas offline aparecerão aqui até serem processadas.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-foreground">
                          {actionLabel(item.action)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                          {entityLabel(item)}
                        </p>
                      </div>
                      <StatusBadge item={item} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] text-muted-foreground">
                      <p className="min-w-0">
                        Criado em:{" "}
                        <span className="font-mono text-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </p>
                      <p className="min-w-0">
                        Tentativas:{" "}
                        <span className="font-mono text-foreground">
                          {item.attempts}
                        </span>
                      </p>
                      {item.lastError && (
                        <p className="col-span-2 break-words text-red-700">
                          {item.lastError}
                        </p>
                      )}
                    </div>
                    {(item.status === "failed" || item.status === "conflict") && (
                      <details className="mt-3 rounded-md border border-border bg-muted/30 p-2">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Ver dados locais
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-foreground">
                          {formatPayloadPreview(item.payload)}
                        </pre>
                      </details>
                    )}
                    <div className="mt-3">
                      {item.status === "failed" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRetryItem(item)}
                          disabled={status === "offline" || status === "syncing"}
                          className="w-full"
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
                          className="w-full"
                        >
                          <ShieldCheck className="size-3" />
                          Manter servidor
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="w-full min-w-[760px] text-left text-[11px]">
                <thead className="bg-sidebar text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/65">
                  <tr>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tentativas</th>
                    <th className="px-4 py-3">Servidor</th>
                    <th className="px-4 py-3">Erro</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <div className="space-y-1">
                          <p>{actionLabel(item.action)}</p>
                          <p className="font-mono text-[10px] font-normal text-muted-foreground">
                            {item.action}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {entityLabel(item)}
                          </p>
                          <p className="font-mono text-[10px]">
                            {item.entityType} / {item.entityId}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge item={item} />
                      </td>
                      <td className="px-4 py-3">{item.attempts}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.serverId ?? "-"}
                      </td>
                      <td className="max-w-80 px-4 py-3 text-xs text-muted-foreground">
                        <div className="space-y-2">
                          <p>{item.lastError ?? "-"}</p>
                          {(item.status === "failed" ||
                            item.status === "conflict") && (
                            <details className="rounded-md border border-border bg-muted/30 p-2">
                              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Ver dados locais
                              </summary>
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-foreground">
                                {formatPayloadPreview(item.payload)}
                              </pre>
                            </details>
                          )}
                        </div>
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
            </>
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
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "green" | "red" | "slate";
  icon: ElementType;
}) {
  const toneClass = {
    amber: {
      border: "border-l-4 border-l-amber-500",
      icon: "text-amber-500",
      value: "text-amber-700",
    },
    blue: {
      border: "border-l-4 border-l-blue-600",
      icon: "text-blue-600",
      value: "text-blue-700",
    },
    green: {
      border: "border-l-4 border-l-emerald-600",
      icon: "text-emerald-600",
      value: "text-emerald-700",
    },
    red: {
      border: "border-l-4 border-l-red-600",
      icon: "text-red-600",
      value: "text-red-700",
    },
    slate: {
      border: "border-l-4 border-l-slate-500",
      icon: "text-slate-500",
      value: "text-slate-700",
    },
  }[tone];

  return (
    <div
      className={`andcheck-lift min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4 ${toneClass.border}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p
          className={`${typography.sectionLabel} min-w-0 break-words leading-tight text-muted-foreground`}
        >
            {label}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${toneClass.icon}`} />
      </div>
      <p className={`${typography.kpiValue} leading-none ${toneClass.value}`}>
        {value}
      </p>
    </div>
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
